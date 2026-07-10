
import UciRpc from './uci-rpc.js'

class Conntrack {
	// 活动连接：ubus luci getConntrackList（ACL luci-mod-status 授予）。
	// 按字节降序 + 过滤回环。显示全部（不去 top N）；连接数极大时性能靠简化行结构 + 用户自控自动刷新。
	static async list() {
		const res = await UciRpc.callUbus('luci', 'getConntrackList', {}, 10000)
		const arr = (res && res.result) || []
		const cleaned = arr.filter(c => !(
			(c.src === '127.0.0.1' && c.dst === '127.0.0.1') ||
			(c.src === '::1' && c.dst === '::1')
		))
		const items = cleaned
			.sort((a, b) => (b.bytes || 0) - (a.bytes || 0))
			.map(c => ({
				network: (c.layer3 || '').toUpperCase(),
				protocol: (c.layer4 || '').toUpperCase(),
				src: c.src || '',
				sport: c.sport,
				dst: c.dst || '',
				dport: c.dport,
				bytes: c.bytes || 0,
				packets: c.packets || 0
			}))
		return { total: cleaned.length, items }
	}

	// 连接数统计：ubus luci getRealtimeStats {mode:'conntrack'}（底层 luci-bwc -c）。
	// 返回 {result:[[ts,udp,tcp,other],...]}，算 UDP/TCP/其它 的 current(最新)/average(均值)/peak(最大)。
	// 首次调用若 luci-bwc 窗口采样点少，数值偏少；随 rpcd 累积逐步准确。
	static async stats() {
		const res = await UciRpc.callUbus('luci', 'getRealtimeStats', { mode: 'conntrack' }, 10000)
		const points = (res && res.result) || []
		if (!points.length) return null
		const calc = (idx) => {
			const vals = points.map(p => Number(p[idx]) || 0)
			if (!vals.length) return { current: 0, average: 0, peak: 0 }
			const sum = vals.reduce((a, b) => a + b, 0)
			return {
				current: vals[vals.length - 1],
				average: Math.round(sum / vals.length),
				peak: vals.reduce((a, b) => Math.max(a, b), 0)
			}
		}
		return { udp: calc(1), tcp: calc(2), other: calc(3) }
	}

	// DNS 反查：ubus network.rrdns lookup（ACL luci-mod-status 授予）。addrs→{ip:hostname}。
	// 限 limit 个 + timeout ms，避免大量 IP 拖慢；失败/超时返回空 map（IP 原样显示）。
	static async lookup(addrs, timeout = 2500, limit = 100) {
		if (!addrs || !addrs.length) return {}
		const list = addrs.slice(0, limit)
		let res
		try {
			res = await UciRpc.callUbus('network.rrdns', 'lookup', { addrs: list, timeout, limit }, timeout + 3000)
		} catch (e) { return {} }
		return res || {}
	}
}

export default Conntrack
