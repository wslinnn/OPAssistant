
import UciRpc from './uci-rpc.js'

// 网络诊断 ping/traceroute/nslookup：统一走 ubus file.exec（rpcd 一次性返回整段 stdout，不支持流式）。
// 强制自终止参数（-c/-w/-m）：ubus exec 无服务端 timeout，仅 uni.request 客户端 timeout；
// 不自终止会导致 HTTP 客户端超时后 rpcd 子进程挂起（孤儿进程）。
// 安全：ubus params 为 argv 数组（不经 shell），天然免疫 shell 注入；host 额外做字符净化防 argv 意外。
// 二进制路径对齐目标路由器(OpenWrt)实测 which + rpcd ACL（luci-mod-network 已授予，无需新建 ACL）：
//   ping/traceroute/traceroute6 在 /bin/，nslookup 在 /usr/bin/。改路径会 NOT_FOUND 或 PERMISSION_DENIED。

const BINS = {
	ping: '/bin/ping',
	traceroute: '/bin/traceroute',
	traceroute6: '/bin/traceroute6',
	nslookup: '/usr/bin/nslookup'
}

// host 净化：仅允许 IP(v4/v6,含 zone-id)/域名字符，防 argv 级意外（ubus 数组已防 shell 注入）
function cleanHost(host) {
	const h = String(host || '').trim()
	if (!h) throw new Error('empty host')
	if (!/^[A-Za-z0-9._:%-]+$/.test(h)) throw new Error('invalid host')
	return h
}

class Diag {
	// 通用 exec：返回 {code, stdout, stderr}
	static async exec(bin, args, timeout) {
		const res = await UciRpc.callUbus('file', 'exec', { command: bin, params: args, env: null }, timeout)
		return { code: res.code, stdout: res.stdout || '', stderr: res.stderr || '' }
	}

	// ping：count 次数、wait 单包等待(s)、deadline 整体上限(s)
	static ping(host, opts = {}) {
		host = cleanHost(host)
		const count = opts.count || 4
		const wait = opts.wait || 2
		const deadline = opts.deadline || 8
		return this.exec(
			BINS.ping,
			['-c', String(count), '-W', String(wait), '-w', String(deadline), host],
			deadline * 1000 + 4000
		)
	}

	// traceroute：maxHops 跳数、wait 每跳超时(s)、queries 每跳探测数。IPv6 目标(含:)走 traceroute6
	static traceroute(host, opts = {}) {
		host = cleanHost(host)
		const bin = host.includes(':') ? BINS.traceroute6 : BINS.traceroute
		const maxHops = opts.maxHops || 15
		const wait = opts.wait || 1
		const queries = opts.queries || 1
		const est = maxHops * wait * queries
		return this.exec(
			bin,
			['-m', String(maxHops), '-w', String(wait), '-q', String(queries), host],
			est * 1000 + 5000
		)
	}

	// nslookup：host + 可选 dns server。busybox nslookup 无 deadline 形参，静默 DNS 触发内部重试(~2×5s)，
	// 客户端 timeout 需覆盖该周期，避免先超时留下 rpcd 孤儿子进程
	static nslookup(host, dnsServer) {
		host = cleanHost(host)
		const args = dnsServer ? [host, cleanHost(dnsServer)] : [host]
		return this.exec(BINS.nslookup, args, 25000)
	}
}

export default Diag
