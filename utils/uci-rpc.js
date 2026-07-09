
import DeviceManager from './deviceManager.js'

// 统一 UCI CRUD 封装：所有插件页只调本模块，不直接拼 uni.request。
// 在 DeviceManager 之上薄封装 /ubus JSON-RPC（uci namespace + 通用 ubus call）。
// ubus result 约定：result[0]===0 成功，result[1] 为数据载荷。

const HEADER = { 'Content-Type': 'application/json', 'x-uniauth': 'true' }

class UciRpc {
	// 取当前设备 ubus 上下文（url + session），统一来源
	static _ctx() {
		const device = DeviceManager.getCurrentDevice() || {}
		const protocol = device.useHttps ? 'https' : 'http'
		const host = DeviceManager.formatHostForUrl(device.ip)
		return {
			url: `${protocol}://${host}:${device.port}/ubus`,
			session: device.sysauth
		}
	}

	// 通用 ubus call（任意 object/method），返回 result[1]
	static callUbus(object, method, params = {}, timeout = 8000) {
		const { url, session } = this._ctx()
		return new Promise((resolve, reject) => {
			uni.request({
				method: 'POST',
				url,
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'call',
					params: [session, object, method, params]
				},
				header: HEADER,
				timeout,
				success: (res) => {
					const r = res.data && res.data.result
					if (r && r[0] === 0) resolve(r[1])
					else {
						console.log(`[UciRpc] ubus ${object}.${method} FAILED ubusCode=${r ? r[0] : 'null'} http=${res.statusCode} params=${JSON.stringify(params).slice(0, 200)} body=${JSON.stringify(res.data).slice(0, 400)}`)
						reject(r ? r[0] : new Error('ubus no result'))
					}
				},
				fail: (err) => {
					console.log(`[UciRpc] ubus ${object}.${method} network FAIL: ${err.errMsg || JSON.stringify(err)}`)
					reject(err)
				}
			})
		})
	}

	// uci namespace 调用
	static _uci(method, params) {
		return this.callUbus('uci', method, params)
	}

	// get(config) → { sectionName: { '.type','.anonymous','.name', <field>... } }
	// rpcd ubus uci.get 返回 {values:{sections...}}（luci rpc.declare expect 'values'），这里解包取 sections map
	static async get(config) {
		const res = await this._uci('get', { config })
		const hasValues = res && typeof res.values === 'object' && res.values !== null
		const data = hasValues ? res.values : (res || {})
		const sections = Object.keys(data).filter(k => data[k] && typeof data[k] === 'object' && data[k]['.type'])
		console.log(`[UciRpc] get('${config}'): rawKeys=[${Object.keys(res || {}).join(',')}] hasValues=${hasValues} sections=${sections.length}`)
		return data
	}

	// add(config, type, values) → 新 section 名（uci add 返回 {section:name}，取字符串）
	static async add(config, type, values = {}) {
		const res = await this._uci('add', { config, type, name: '', values })
		return (res && res.section) || res
	}

	// set(config, section, values)
	static set(config, section, values) {
		return this._uci('set', { config, section, values })
	}

	// delete(config, section)
	static delete(config, section) {
		return this._uci('delete', { config, section })
	}

	// reorder(config, section, index)
	static reorder(config, section, index) {
		return this._uci('reorder', { config, section, index })
	}

	// commit(config)
	static commit(config) {
		return this._uci('commit', { config })
	}

	// apply：调 /etc/init.d/<script> <action>（file exec 通道）。initScript/action 白名单防注入
	static apply(initScript, action = 'reload') {
		if (!initScript) return Promise.resolve()
		if (!/^[a-zA-Z0-9_-]+$/.test(initScript)) return Promise.reject(new Error('invalid init script name'))
		if (!/^(reload|restart|start|stop)$/.test(action)) return Promise.reject(new Error('invalid action'))
		return this.callUbus('file', 'exec', {
			command: `/etc/init.d/${initScript}`,
			params: [action]
		}, 12000)
	}

	// 便捷：set + commit（不含 apply，按需调用方再 apply）
	static async setCommit(config, section, values) {
		await this.set(config, section, values)
		await this.commit(config)
	}

	// 便捷：add + commit → 返回新 section 名
	static async addCommit(config, type, values) {
		const name = await this.add(config, type, values)
		await this.commit(config)
		return name
	}

	// 便捷：delete + commit
	static async deleteCommit(config, section) {
		await this.delete(config, section)
		await this.commit(config)
	}

	// hosthints 候选（ipaddr/macaddr 下拉用），返回 oa-uci-list candidates 格式
	static async getHostHintCandidates() {
		let hints
		try { hints = await this.callUbus('luci-rpc', 'getHostHints') }
		catch (e) { return { hosthintsMac: [], hosthintsIp: [] } }
		const hosts = (hints && hints.hosts) || hints || {}
		const mac = [], ip = []
		Object.keys(hosts).forEach(m => {
			const h = hosts[m] || {}
			const name = h.name || ''
			const addrs = h.ipaddrs || h.ipv4 || []
			mac.push({ value: m, label: name ? `${m} (${name})` : m })
			addrs.forEach(a => ip.push({ value: a, label: name ? `${a} (${name})` : a }))
		})
		return { hosthintsMac: mac, hosthintsIp: ip }
	}

	// 网络设备候选（ifname/maceth 下拉用）。luci-rpc getNetworkDevices 返回 name→{up,type,...} map
	static async getDeviceCandidates() {
		let res
		try { res = await this.callUbus('luci-rpc', 'getNetworkDevices') }
		catch (e) { return { devices: [] } }
		const devices = []
		Object.keys(res || {}).forEach(name => {
			if (name === 'lo') return            // 过滤回环口
			const d = res[name] || {}
			if (d.up === false) return           // 过滤 down 设备
			devices.push({ value: name, label: name })
		})
		return { devices }
	}

	// 网络接口候选（uci network 的 interface section 名，samba4 interface 多选用）
	static async getInterfaceCandidates() {
		let res
		try { res = await this.get('network') }
		catch (e) { return { interfaces: [] } }
		const interfaces = []
		Object.keys(res || {}).forEach(name => {
			const s = res[name] || {}
			if (s['.type'] === 'interface') interfaces.push({ value: s['.name'] || name, label: s['.name'] || name })
		})
		return { interfaces }
	}

	// 防火墙 zone 候选（firewall.@zone[].name，redirect/rule/nat/forwarding 的 src/dest 下拉用）
	static async getZoneCandidates() {
		let res
		try { res = await this.get('firewall') }
		catch (e) { return { zones: [] } }
		const zones = []
		Object.keys(res || {}).forEach(name => {
			const s = res[name] || {}
			if (s['.type'] === 'zone') {
				const n = s.name || s['.name']
				if (n) zones.push({ value: n, label: n })
			}
		})
		return { zones }
	}

	// conntrack helpers（ubus luci getConntrackHelpers）→ set_helper/helper 下拉选项
	static async getConntrackHelpers() {
		let res
		try { res = await this.callUbus('luci', 'getConntrackHelpers') }
		catch (e) { return { helpers: [] } }
		const arr = (res && res.result) || []
		const helpers = arr.map(h => ({ value: h.name, label: h.description || h.name })).filter(h => h.value)
		return { helpers }
	}

	// 文件读（ubus file read，与 luci fs.read 同通道）→ 文本内容
	static async readFile(path) {
		const res = await this.callUbus('file', 'read', { path })
		return (res && res.data) || ''
	}

	// 文件写（ubus file write，与 luci fs.write 同通道）。data 原样写入，调用方负责规范化
	static writeFile(path, data, mode) {
		const params = { path, data }
		if (mode !== undefined) params.mode = mode
		return this.callUbus('file', 'write', params)
	}

	// USB 打印机发现（ubus file exec /usr/bin/detectlp，复用 luci 同款脚本）。
	// detectlp 输出每行 "devname,product,model,description"（product=VID/PID/VER 内核串，即 uci device 的真实 value）
	// → printers 供 oa-uci-list device 下拉(value=product,label=描述[VID:PID])；details 供只读展示表
	static async getUsbPrinters() {
		let res
		try {
			res = await this.callUbus('file', 'exec', { command: '/usr/bin/detectlp' }, 8000)
		} catch (e) { return { printers: [], details: [], error: true } }
		const stdout = (res && res.stdout) || ''
		const details = []
		const printers = []
		stdout.split('\n').forEach(line => {
			if (!line.trim()) return
			const parts = line.split(',')
			if (parts.length < 2 || !parts[0] || !parts[1]) return
			const devname = parts[0]
			const product = parts[1]
			const model = parts[2] || ''
			const description = parts.slice(3).join(',').trim()
			const segs = String(product).split('/')
			const id = segs.length >= 2 ? `${segs[0].padStart(4, '0')}:${segs[1].padStart(4, '0')}` : product
			details.push({ devname, product, model, description, id, devicePath: '/dev/usb/' + devname })
			printers.push({ value: product, label: `${description || model || devname} [${id}]` })
		})
		return { printers, details }
	}
}

export default UciRpc
