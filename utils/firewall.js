// 防火墙渲染工具：zone 颜色哈希（luci 算法移植）+ 规则行摘要渲染。
// 颜色算法源自 luci SuperFastHash + 64-bit PRNG（modules/luci-base firewall.js / tools/prng.js / cbi.js），
// 确定性：同一 zone 名恒得同一颜色（lan→#90f090, wan→#f09090，与 luci --zone-color-rgb 一致已验证）。

function _u16(bytes, off) { return ((bytes[off + 1] << 8) + bytes[off]) >>> 0 }
function _s8(bytes, off) {
	const n = bytes[off]
	return (n > 0x7F) ? (n - 256) >>> 0 : n
}

// SuperFastHash → 8 位 hex（32-bit）
function _sfh(str) {
	const s = String(str)
	if (!s.length) return null
	const bytes = []
	for (let i = 0; i < s.length; i++) {
		const ch = s.charCodeAt(i)
		if (ch <= 0x7F) bytes.push(ch)
		else if (ch <= 0x7FF) bytes.push(((ch >>> 6) & 0x1F) | 0xC0, (ch & 0x3F) | 0x80)
		else if (ch <= 0xFFFF) bytes.push(((ch >>> 12) & 0x0F) | 0xE0, ((ch >>> 6) & 0x3F) | 0x80, (ch & 0x3F) | 0x80)
		else bytes.push(((ch >>> 18) & 0x07) | 0xF0, ((ch >>> 12) & 0x3F) | 0x80, ((ch >>> 6) & 0x3F) | 0x80, (ch & 0x3F) | 0x80)
	}
	if (!bytes.length) return null
	let hash = bytes.length >>> 0, len = bytes.length >>> 2, off = 0, tmp
	while (len--) {
		hash += _u16(bytes, off)
		tmp = ((_u16(bytes, off + 2) << 11) ^ hash) >>> 0
		hash = ((hash << 16) ^ tmp) >>> 0
		hash += hash >>> 11
		off += 4
	}
	switch ((bytes.length & 3) >>> 0) {
		case 3: hash += _u16(bytes, off); hash = (hash ^ (hash << 16)) >>> 0
			hash = (hash ^ (_s8(bytes, off + 2) << 18)) >>> 0; hash += hash >>> 11; break
		case 2: hash += _u16(bytes, off); hash = (hash ^ (hash << 11)) >>> 0; hash += hash >>> 17; break
		case 1: hash += _s8(bytes, off); hash = (hash ^ (hash << 10)) >>> 0; hash += hash >>> 1; break
	}
	hash = (hash ^ (hash << 3)) >>> 0
	hash += hash >>> 5
	hash = (hash ^ (hash << 4)) >>> 0
	hash += hash >>> 17
	hash = (hash ^ (hash << 25)) >>> 0
	hash += hash >>> 6
	return (hash >>> 0).toString(16).padStart(8, '0')
}

// 64-bit PRNG 状态（4 个 16-bit 字，小端）；每次 _deriveColor 先 _seed，无跨调用污染
let _prngS = [0, 0, 0, 0]
function _mul(a, b) {
	const r = [0, 0, 0, 0, 0, 0, 0, 0]
	for (let j = 0; j < 4; j++) {
		let k = 0
		for (let i = 0; i < 4; i++) {
			const t = a[i] * b[j] + r[i + j] + k
			r[i + j] = t & 0xffff; k = t >>> 16
		}
		r[j + 4] = k
	}
	r.length = 4; return r
}
function _add(a, n) {
	const r = [0, 0, 0, 0]; let k = n
	for (let i = 0; i < 4; i++) { const t = a[i] + k; r[i] = t & 0xffff; k = t >>> 16 }
	return r
}
function _shr(a, n) {
	const r = [a[0], a[1], a[2], a[3], 0]; let i = 4, k = 0
	for (; n > 16; n -= 16, i--) for (let j = 0; j < 4; j++) r[j] = r[j + 1]
	for (; i > 0; i--) { const s = r[i - 1]; r[i - 1] = (s >>> n) | k; k = ((s & ((1 << n) - 1)) << (16 - n)) }
	r.length = 4; return r
}
function _seed(n) { n = (n - 1) | 0; _prngS[0] = n & 0xffff; _prngS[1] = n >>> 16; _prngS[2] = 0; _prngS[3] = 0 }
function _int() {
	_prngS = _mul(_prngS, [0x7f2d, 0x4c95, 0xf42d, 0x5851])
	_prngS = _add(_prngS, 1)
	const r = _shr(_prngS, 33)
	return (r[1] << 16) | r[0]
}
function _get() {
	const r = (_int() % 0x7fffffff) / 0x7fffffff
	if (!arguments.length) return r
	const l = arguments.length === 1 ? 1 : (arguments[0] | 0)
	const u = arguments.length === 1 ? (arguments[0] | 0) : (arguments[1] | 0)
	return Math.floor(r * (u - l + 1)) + l
}
function _deriveColor(string) {
	_seed(parseInt(_sfh(string), 16))
	const r = _get(128), g = _get(128)
	let min = 0, max = 128
	if ((r + g) < 128) min = 128 - r - g; else max = 255 - r - g
	const b = min + Math.floor(_get() * (max - min))
	const h = v => { const x = (0xff - v).toString(16); return x.length < 2 ? '0' + x : x }
	return '#' + h(r) + h(g) + h(b)
}

// 对外：zone 名 → hex 颜色（与 luci 一致：lan→绿 / wan→红 / 任意或空→灰 / 其它→hash 派生）
export function getZoneColor(name) {
	if (name == null || name === '' || name === '*') return '#bbbbbb'
	if (name === 'lan') return '#90f090'
	if (name === 'wan') return '#f09090'
	return _deriveColor(name)
}

const PROTO_MAP = { tcp: 'TCP', udp: 'UDP', icmp: 'ICMP', 'ipv6-icmp': 'IPv6-ICMP', icmpv6: 'IPv6-ICMP', all: '任意', any: '任意', '*': '任意' }

export function protoText(proto) {
	const arr = (Array.isArray(proto) ? proto : String(proto || '').split(/\s+/))
		.filter(p => p && p !== '*' && p !== 'any' && p !== 'all')
	if (!arr.length) return '任意'
	return arr.map(p => PROTO_MAP[p] || p.toUpperCase()).join('/')
}

export function zoneLabel(z) {
	return !z ? '本设备' : (z === '*' ? '任意区域' : z)
}

function ipText(v) {
	if (!v) return '任意'
	const arr = Array.isArray(v) ? v : String(v).split(/\s+/)
	return arr.filter(x => x).join(' / ') || '任意'
}
function portText(v) { return v ? String(v) : '任意' }

// redirect(DNAT) 行摘要
export function redirectSummary(r) {
	const proto = protoText(r.proto)
	const ext = portText(r.src_dport)
	const ip = r.dest_ip || '本设备'
	const port = r.dest_port || r.src_dport || ''
	const fwd = port ? `${ip}:${port}` : ip
	return { proto, line: `${zoneLabel(r.src)} · ${ext} → ${zoneLabel(r.dest)} · ${fwd}` }
}

// rule 行摘要
const RULE_TARGET = { DROP: '丢弃', ACCEPT: '接受', REJECT: '拒绝', NOTRACK: '不跟踪', MARK: '标记', DSCP: 'DSCP', HELPER: '助手' }
export function ruleSummary(r) {
	const proto = protoText(r.proto)
	const action = RULE_TARGET[r.target] || r.target || '接受'
	const from = `${zoneLabel(r.src)}${r.src_ip ? ' ' + ipText(r.src_ip) : ''}${r.src_port ? ':' + portText(r.src_port) : ''}`
	const to = `${zoneLabel(r.dest)}${r.dest_ip ? ' ' + ipText(r.dest_ip) : ''}${r.dest_port ? ':' + portText(r.dest_port) : ''}`
	return { proto, line: `${from} → ${to}`, action }
}

// nat(SNAT) 行摘要。luci 中 nat 段用 src 表示流出方向 zone
export function natSummary(r) {
	const proto = protoText(r.proto)
	let action
	if (r.target === 'SNAT') action = `SNAT ${r.snat_ip || ''}${r.snat_port ? ':' + r.snat_port : ''}`.trim()
	else if (r.target === 'MASQUERADE') action = '伪装(MASQUERADE)'
	else if (r.target === 'ACCEPT') action = '禁用源改写'
	else action = r.target || 'MASQUERADE'
	const from = `${zoneLabel(r.src)}${r.src_ip ? ' ' + ipText(r.src_ip) : ''}`
	const to = `${zoneLabel(r.dest)}${r.dest_ip ? ' ' + ipText(r.dest_ip) : ''}`
	return { proto, line: `${from} → ${to}`, action }
}

// 策略 → 状态徽章类型
export function policyBadgeType(p) {
	if (p === 'ACCEPT') return 'up'
	if (p === 'DROP') return 'down'
	if (p === 'REJECT') return 'warn'
	return 'neutral'
}
