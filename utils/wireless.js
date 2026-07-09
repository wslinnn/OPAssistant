
import UciRpc from './uci-rpc.js'

// WiFi 无线操作封装：radio/iface 探测、MTK/mac80211 双分支判断、iwinfo assoclist、踢下线、启停/重启
// 复用 client.vue 的 getWirelessDevices/iwinfo assoclist/hostapd del_client 模式，集中供 wifi 页与 client.vue 共用
class Wireless {
	// 合并 uci wireless（radio/iface 字段）+ luci-rpc getWirelessDevices（iwinfo 概览 + ifname）
	static async getStatus() {
		const [uciData, devData] = await Promise.all([
			UciRpc.get('wireless').catch(() => ({})),
			UciRpc.callUbus('luci-rpc', 'getWirelessDevices').catch(() => ({}))
		])
		const radios = [], ifaces = []
		Object.keys(uciData).forEach(name => {
			const s = uciData[name]
			if (s['.type'] === 'wifi-device') {
				const dev = devData[name] || {}
				radios.push({ ...s, '.name': name, iwinfo: dev.iwinfo || {}, devInterfaces: dev.interfaces || [] })
			} else if (s['.type'] === 'wifi-iface') {
				ifaces.push({ ...s, '.name': name })
			}
		})
		// 给 iface 关联 ifname（从其 radio 的 devInterfaces 按 ifname/network 匹配；network 兼容 list 数组类型）
		const toArr = v => Array.isArray(v) ? v : (v == null ? [] : [v])
		ifaces.forEach(iface => {
			const radio = radios.find(r => r['.name'] === iface.device)
			const ifaceNets = toArr(iface.network)
			const devIface = radio && radio.devInterfaces.find(d => {
				if (iface.ifname && d.ifname === iface.ifname) return true
				const dn = toArr(d.config && d.config.network)
				return ifaceNets.some(n => dn.includes(n))
			})
			iface.ifname = (devIface && devIface.ifname) || iface.ifname || ''
			iface.iwinfo = (devIface && devIface.iwinfo) || {}
		})
		return { radios, ifaces }
	}

	// 双分支判断：wifi-device.type（mtwifi/mtk/mtkwifi → MTK；其余 mac80211）
	static detectBranch(radio) {
		const t = (radio && radio.type) || ''
		return (t === 'mtwifi' || t === 'mtk' || t === 'mtkwifi') ? 'mtk' : 'mac80211'
	}

	// 关联终端（iwinfo assoclist，device=ifname）
	static async getAssocList(ifname) {
		if (!ifname) return []
		try {
			const res = await UciRpc.callUbus('iwinfo', 'assoclist', { device: ifname })
			return (res && res.results) || []
		} catch (e) { return [] }
	}

	// 踢下线（hostapd.<ifname>.del_client）
	static kickClient(ifname, mac) {
		return UciRpc.callUbus(`hostapd.${ifname}`, 'del_client', {
			addr: mac, deauth: true, reason: 5, ban_time: 60000
		})
	}

	// radio 启停（uci disabled + apply；异常向上传播，调用方据以提示失败、避免假性关闭）
	static async setRadioEnabled(radioName, enabled) {
		await UciRpc.setCommit('wireless', radioName, { disabled: enabled ? '0' : '1' })
		await this.applyWireless()
	}

	// radio 重启（network.wireless down + up，per-radio 不动其它接口；失败 fallback applyWireless）
	static async restartRadio(radioName) {
		try {
			await UciRpc.callUbus('network.wireless', 'down', { device: radioName })
			await UciRpc.callUbus('network.wireless', 'up', { device: radioName })
		} catch (e) {
			await this.applyWireless()
		}
	}

	// apply 仅无线子系统（network.wireless reload，不断 WAN/有线；失败 fallback 全 network reload；异常向上传播）
	static async applyWireless() {
		try { await UciRpc.callUbus('network.wireless', 'reload', {}) }
		catch (e) { await UciRpc.apply('network', 'reload') }
	}
}

export default Wireless
