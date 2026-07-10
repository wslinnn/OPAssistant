
import UciRpc from './uci-rpc.js'

const MAX_LINES = 800

// syslog(logread) 文本行 "Mon DD HH:MM:SS facility.severity msg" → 取 .severity 分类
function classifySyslog(line) {
	const m = line.match(/\.(emerg|alert|crit|err|warning|warn|notice|info|debug)\b/)
	if (!m) return 'info'
	const s = m[1]
	if (s === 'emerg' || s === 'alert' || s === 'crit' || s === 'err') return 'err'
	if (s === 'warning' || s === 'warn') return 'warn'
	return 'info'
}

// dmesg -r 行 "<N>[uptime] msg" → 取 <N> 数字分类（ubox 偶发 14-15，宽松匹配）
function classifyDmesg(line) {
	const m = line.match(/^<(\d+)>/)
	if (!m) return 'info'
	const p = parseInt(m[1], 10)
	if (p <= 3) return 'err'   // emerg/alert/crit/err
	if (p === 4) return 'warn' // warning
	return 'info'              // notice/info/debug 及异常值
}

class Syslog {
	// 系统日志：file.exec /usr/libexec/syslog-wrapper（ACL luci-mod-status 授予）。
	// ubus log read 在目标固件返回空（logd ubus 接口读不到 ring buffer），故走 wrapper。
	// wrapper 路由器实测秒回；若 app 端 file.exec 异常，callUbus 硬超时 10s 兜底 + 下方 console.log 诊断。
	static async readSyslog() {
		const res = await UciRpc.callUbus('file', 'exec', { command: '/usr/libexec/syslog-wrapper', params: [], env: null }, 10000)
		const text = (res && res.stdout) || ''
		return text.split('\n').filter(l => l.length).slice(-MAX_LINES).map(line => ({
			text: line,
			level: classifySyslog(line)
		}))
	}

	// 内核日志：file.exec /bin/dmesg -r（ACL luci-mod-status 授予 "/bin/dmesg -r"）
	static async readDmesg() {
		const res = await UciRpc.callUbus('file', 'exec', { command: '/bin/dmesg', params: ['-r'], env: null }, 10000)
		const text = (res && res.stdout) || ''
		return text.split('\n').filter(l => l.length).slice(-MAX_LINES).map(line => ({
			text: line,
			level: classifyDmesg(line)
		}))
	}
}

export default Syslog
