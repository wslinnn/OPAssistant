
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

	// radio 启停(对齐 luci network_updown):device 与其下所有 wifi-iface 的 disabled 同步
	// (OR 关系——任一残留 disabled='1' 则 netifd 不建 BSS、SSID 不广播;只清 device 不够,这是"没真正开启"的根因)
	// + uci.apply{rollback}(ucitrack→netifd up/down)+ enable 时 /sbin/wifi up 兜底立即 up
	static async setRadioEnabled(radioName, enabled) {
		const w = await UciRpc.get('wireless').catch(() => ({}))
		const ifaces = Object.keys(w).filter(n => w[n] && w[n]['.type'] === 'wifi-iface' && w[n].device === radioName)
		const val = enabled ? '0' : '1'
		await UciRpc.set('wireless', radioName, { disabled: val })
		await Promise.all(ifaces.map(n => UciRpc.set('wireless', n, { disabled: val })))
		await UciRpc.commit('wireless')
		if (enabled) {
			try { await UciRpc.callUbus('file', 'exec', { command: '/sbin/wifi', params: ['up', radioName] }) } catch (e) {}
		}
	}

	// radio 重启：同 luci radio_restart = /sbin/wifi up <radio>(ubus file exec；ACL luci-mod-network-config /sbin/wifi exec)
	// (network.wireless up/down 无 ACL 授予；/sbin/wifi up 是 luci 官方 per-radio 重启路径)
	static async restartRadio(radioName) {
		await UciRpc.callUbus('file', 'exec', { command: '/sbin/wifi', params: ['up', radioName] })
	}

	// apply 无线子系统：network.wireless reload / init.d network reload 均需 session ACL(常 Access denied/ubusCode 6)；
	// 改走 uci.apply{rollback}+confirm(uci namespace 授予)→ rpcd ucitrack 系统级 reload，不经 session ACL(同 luci web 保存路径)
	static async applyWireless() {
		await UciRpc.commit('wireless')
	}
}

export default Wireless
