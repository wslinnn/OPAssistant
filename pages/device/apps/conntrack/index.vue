<template>
	<view class="container">
		<!-- 统计卡：UDP/TCP/其它 当前/平均/峰值 -->
		<oa-card v-if="stats" padding="none" class="ct-stats-card">
			<view v-for="row in statsRows" :key="row.key" class="ct-stats-row">
				<text class="ct-stats-label" :class="'ct-stats-label--' + row.key">{{ row.label }}</text>
				<view class="ct-stats-cols">
					<view class="ct-stats-col">
						<text class="ct-stats-num">{{ row.current }}</text>
						<text class="ct-stats-cap">{{ $t('conntrack.current') }}</text>
					</view>
					<view class="ct-stats-col">
						<text class="ct-stats-num">{{ row.average }}</text>
						<text class="ct-stats-cap">{{ $t('conntrack.average') }}</text>
					</view>
					<view class="ct-stats-col">
						<text class="ct-stats-num">{{ row.peak }}</text>
						<text class="ct-stats-cap">{{ $t('conntrack.peak') }}</text>
					</view>
				</view>
			</view>
		</oa-card>

		<oa-card padding="lg">
			<view class="ct-filter">
				<input class="ct-input" v-model="keyword" :placeholder="$t('conntrack.search')" />
				<oa-button size="small" type="primary" :loading="loading" @click="load">{{ $t('conntrack.refresh') }}</oa-button>
			</view>
			<view class="ct-toggles">
				<view class="ct-toggle">
					<oa-switch :value="autoRefresh" @input="toggleAuto" />
					<text class="ct-toggle-label">{{ $t('conntrack.auto_refresh') }}</text>
				</view>
				<view class="ct-toggle">
					<oa-switch :value="enableDns" @input="toggleDns" />
					<text class="ct-toggle-label">{{ $t('conntrack.dns') }}</text>
				</view>
			</view>
		</oa-card>

		<view v-if="list.length > 0" class="ct-meta">
			<text class="ct-count">{{ $t('conntrack.total', { n: total }) }} · {{ filtered.length }} / {{ list.length }}</text>
		</view>

		<oa-card v-if="filtered.length > 0" padding="none">
			<scroll-view scroll-y class="ct-list">
				<view v-for="(c, i) in filtered" :key="i" class="ct-row">
					<view class="ct-row-head">
						<view class="ct-row-tags">
							<oa-status-badge :type="protoType(c.protocol)" :text="c.protocol || '-'" />
							<oa-status-badge v-if="c.network === 'IPV6'" type="neutral" :text="c.network" />
						</view>
						<text class="ct-bytes">{{ formatBytes(c.bytes) }}</text>
					</view>
					<view class="ct-flow">
						<text class="ct-endpoint">{{ endpoint(c.src, c.sport) }}</text>
						<text class="ct-arrow">→</text>
						<text class="ct-endpoint">{{ endpoint(c.dst, c.dport) }}</text>
					</view>
					<text class="ct-packets">{{ $t('conntrack.packets', { n: c.packets }) }}</text>
				</view>
			</scroll-view>
		</oa-card>
		<oa-empty v-else-if="!loading" :text="error || $t('conntrack.empty')" />
	</view>
</template>

<script>
import Conntrack from '@/utils/conntrack.js'
import { formatBytes } from '@/utils/format.js'

const POLL_INTERVAL = 5000
const DNS_LIMIT = 100

export default {
	data() {
		return {
			keyword: '',
			loading: false,
			list: [],
			total: 0,
			stats: null,
			error: '',
			reqSeq: 0,
			busy: false,
			dnsSeq: 0,
			autoRefresh: true,
			enableDns: false,
			dnsCache: {},
			pollTimer: null
		}
	},
	computed: {
		statsRows() {
			if (!this.stats) return []
			return [
				{ key: 'udp', label: 'UDP', current: this.stats.udp.current, average: this.stats.udp.average, peak: this.stats.udp.peak },
				{ key: 'tcp', label: 'TCP', current: this.stats.tcp.current, average: this.stats.tcp.average, peak: this.stats.tcp.peak },
				{ key: 'other', label: this.$t('conntrack.stat_other'), current: this.stats.other.current, average: this.stats.other.average, peak: this.stats.other.peak }
			]
		},
		filtered() {
			const kw = this.keyword.trim().toLowerCase()
			if (!kw) return this.list
			return this.list.filter(c => {
				const hay = [c.protocol, c.network, c.src, c.dst, c.sport, c.dport]
					.filter(Boolean).join(' ').toLowerCase()
				return hay.includes(kw)
			})
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('conntrack.title') })
		this.load()
	},
	onShow() {
		if (this.autoRefresh) this.startPoll()
	},
	onHide() { this.stopPoll() },
	onUnload() { this.stopPoll() },
	onPullDownRefresh() { Promise.resolve(this.load()).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		formatBytes,
		async load(silent = false) {
			if (silent && this.busy) return   // 静默轮询：上一笔未完则跳过
			this.busy = true
			const req = ++this.reqSeq          // Vue2 不代理 _ 开头的 data 键，故用 reqSeq
			if (!silent) this.loading = true
			if (!silent) this.error = ''
			try {
				const [data, st] = await Promise.all([Conntrack.list(), Conntrack.stats()])
				if (req !== this.reqSeq) return
				this.total = data.total
				this.list = data.items
				this.stats = st
				this.refreshDns()    // 异步反查，不阻塞渲染（IP 先显示，域名到后更新）
			} catch (e) {
				if (req !== this.reqSeq) return
				if (!silent) {
					this.error = this.$t('conntrack.load_failed')
					this.list = []
				}
			} finally {
				if (!silent) this.loading = false
				this.busy = false
			}
		},
		async refreshDns() {
			if (!this.enableDns) return
			const seq = ++this.dnsSeq           // 反查 token：丢弃过期（新一轮已发起）
			const ips = new Set()
			this.list.slice(0, DNS_LIMIT).forEach(c => {
				if (c.src) ips.add(c.src)
				if (c.dst) ips.add(c.dst)
			})
			const todo = [...ips].filter(ip => !(ip in this.dnsCache)).slice(0, DNS_LIMIT)
			if (!todo.length) return
			const map = await Conntrack.lookup(todo, 2500, DNS_LIMIT)
			if (seq !== this.dnsSeq) return
			Object.keys(map).forEach(ip => { this.$set(this.dnsCache, ip, map[ip]) })
		},
		toggleDns(v) {
			this.enableDns = v
			if (v) this.refreshDns()
		},
		startPoll() {
			this.stopPoll()
			this.pollTimer = setInterval(() => this.load(true), POLL_INTERVAL)
		},
		stopPoll() {
			if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
		},
		toggleAuto(v) {
			this.autoRefresh = v
			if (v) this.startPoll()
			else this.stopPoll()
		},
		endpoint(ip, port) {
			if (!ip) return '-'
			const name = this.dnsCache[ip] || ip     // 有反查域名用域名，否则 IP
			const addr = name.includes(':') ? '[' + name + ']' : name
			return port ? addr + ':' + port : addr
		},
		protoType(p) {
			if (p === 'TCP') return 'up'
			if (p === 'UDP') return 'info'
			return 'neutral'
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.ct-stats-card {
	margin-bottom: $oa-sp-2;
}
.ct-stats-row {
	display: flex;
	align-items: center;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}
.ct-stats-label {
	width: 96rpx;
	font-size: $oa-fs-label;
	font-weight: 700;
}
.ct-stats-label--udp { color: $oa-brand; }
.ct-stats-label--tcp { color: $oa-success; }
.ct-stats-label--other { color: $oa-danger; }
.ct-stats-cols {
	flex: 1;
	display: flex;
}
.ct-stats-col {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}
.ct-stats-num {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
	font-family: monospace;
}
.ct-stats-cap {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.ct-filter {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.ct-input {
	flex: 1;
	height: 72rpx;
	padding: 0 $oa-sp-2;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	font-size: $oa-fs-body;
	color: $oa-text;
	box-sizing: border-box;
}
.ct-toggles {
	display: flex;
	gap: $oa-sp-4;
	margin-top: $oa-sp-2;
}
.ct-toggle {
	display: flex;
	align-items: center;
	gap: $oa-sp-1;
}
.ct-toggle-label {
	font-size: $oa-fs-label;
	color: $oa-text-muted;
}
.ct-meta {
	padding: $oa-sp-2 $oa-sp-1;
}
.ct-count {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.ct-list {
	height: 60vh;
}
.ct-row {
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}
.ct-row-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: $oa-sp-1;
}
.ct-row-tags {
	display: flex;
	gap: $oa-sp-1;
}
.ct-bytes {
	font-size: $oa-fs-caption;
	color: $oa-text;
	font-weight: 600;
	font-family: monospace;
}
.ct-flow {
	display: flex;
	align-items: center;
	gap: $oa-sp-1;
	flex-wrap: wrap;
}
.ct-endpoint {
	font-size: $oa-fs-caption;
	color: $oa-text;
	font-family: monospace;
	word-break: break-all;
}
.ct-arrow {
	font-size: $oa-fs-caption;
	color: $oa-text-subtle;
}
.ct-packets {
	display: block;
	margin-top: 4rpx;
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
</style>
