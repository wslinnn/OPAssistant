
// 公共格式化工具（后续页面复用；对应设计文档"一致性补完：format utils 去重"）

// 字节数 → 人类可读（B/KB/MB/GB）
export function formatBytes(b) {
	const n = Number(b) || 0
	if (n < 1024) return n + ' B'
	if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
	if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB'
	return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

// 字节速率 → 人类可读（B/s~GB/s）。量级用 log1024，B/s 与 KB/s 取整、MB/GB 1 位
// （与 home.vue 原 formatBandwidth 同款，迁移零行为变化）
export function formatRate(val) {
	if (!val || val < 0) return '0 B/s'
	const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
	let i = Math.floor(Math.log(val) / Math.log(1024))
	if (i >= units.length) i = units.length - 1
	if (i <= 0) return Math.round(val) + ' B/s'
	const n = val / Math.pow(1024, i)
	return i === 1 ? Math.round(n) + ' ' + units[i] : n.toFixed(1) + ' ' + units[i]
}

// 秒数 → 时长（Xd Xh Xm Xs 智能省略，至少含秒；合并 client.vue 原 formatTime/formatLeaseTime）
export function formatDuration(seconds) {
	const s = parseInt(seconds)
	if (isNaN(s)) return '-'
	const d = Math.floor(s / 86400)
	const h = Math.floor((s % 86400) / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	let str = ''
	if (d > 0) str += d + 'd '
	if (h > 0 || d > 0) str += h + 'h '
	if (m > 0 || h > 0 || d > 0) str += m + 'm '
	str += sec + 's'
	return str
}

// 带宽采样差分 → 速率序列(samples: [[ts,rx,?,tx],...];home/statistics 共用差分核心)
// clamp:true 时负值(计数器回绕)置 0;dt<=0 的点跳过
export function computeBandwidthRates(samples, { clamp = false } = {}) {
	const timestamps = [], rxRates = [], txRates = []
	if (!Array.isArray(samples) || samples.length < 2) return { timestamps, rxRates, txRates }
	for (let i = 1; i < samples.length; i++) {
		const cur = samples[i], prev = samples[i - 1]
		const dt = cur[0] - prev[0]
		if (dt <= 0) continue
		let rx = (cur[1] - prev[1]) / dt
		let tx = (cur[3] - prev[3]) / dt
		if (clamp) { rx = Math.max(0, rx); tx = Math.max(0, tx) }
		timestamps.push(cur[0])
		rxRates.push(rx)
		txRates.push(tx)
	}
	return { timestamps, rxRates, txRates }
}
