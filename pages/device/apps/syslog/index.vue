<template>
	<view class="container">
		<oa-card padding="lg">
			<view class="log-seg">
				<oa-segmented :value="source" :options="sourceOptions" @input="onSourceChange" />
			</view>
			<view class="log-seg">
				<oa-segmented :value="level" :options="levelOptions" @input="onLevelChange" />
			</view>
			<view class="log-filter">
				<input class="log-input" v-model="keyword" :placeholder="$t('syslog.search')" />
				<oa-button size="small" type="primary" :loading="loading" @click="load">{{ $t('syslog.refresh') }}</oa-button>
			</view>
			<view class="log-auto">
				<oa-switch :value="autoRefresh" @input="toggleAuto" />
				<text class="log-auto-label">{{ $t('syslog.auto_refresh') }}</text>
			</view>
		</oa-card>

		<view v-if="filteredLines.length > 0" class="log-meta">
			<text class="log-count">{{ filteredLines.length }} / {{ lines.length }}</text>
			<view class="log-meta-actions">
				<oa-button size="small" type="neutral" @click="scrollToBottom">{{ $t('syslog.scroll_bottom') }}</oa-button>
				<oa-button size="small" type="neutral" @click="copyAll">{{ $t('syslog.copy') }}</oa-button>
			</view>
		</view>

		<oa-card v-if="filteredLines.length > 0" padding="none">
			<scroll-view scroll-y class="log-list" :scroll-into-view="lastLineId">
				<text selectable v-for="(l, i) in filteredLines" :key="i" :id="'L' + i" :class="['log-line', 'log-line--' + l.level]">{{ l.text }}</text>
			</scroll-view>
		</oa-card>
		<oa-empty v-if="filteredLines.length === 0" :text="loading ? $t('syslog.loading') : (error || $t('syslog.empty'))" />
	</view>
</template>

<script>
import Syslog from '@/utils/syslog.js'

const POLL_INTERVAL = 5000

export default {
	data() {
		return {
			source: 'syslog',
			level: 'all',
			keyword: '',
			loading: false,
			lines: [],
			error: '',
			lastLineId: '',
			reqSeq: 0,
			busy: false,
			autoRefresh: true,
			pollTimer: null
		}
	},
	computed: {
		sourceOptions() {
			return [
				{ value: 'syslog', label: this.$t('syslog.source_syslog') },
				{ value: 'dmesg', label: this.$t('syslog.source_dmesg') }
			]
		},
		levelOptions() {
			return [
				{ value: 'all', label: this.$t('syslog.level_all') },
				{ value: 'err', label: this.$t('syslog.level_err') },
				{ value: 'warn', label: this.$t('syslog.level_warn') },
				{ value: 'info', label: this.$t('syslog.level_info') }
			]
		},
		filteredLines() {
			const kw = this.keyword.trim().toLowerCase()
			let arr = this.lines
			if (this.level !== 'all') arr = arr.filter(l => l.level === this.level)
			if (kw) arr = arr.filter(l => l.text.toLowerCase().includes(kw))
			return arr
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('syslog.title') })
		this.load()
	},
	onShow() {
		// 页面可见时启动轮询（切回自动续上）；首次 onShow 在 onLoad 的 load 之后，不重复立即拉
		if (this.autoRefresh) this.startPoll()
	},
	onHide() { this.stopPoll() },
	onUnload() { this.stopPoll() },
	onPullDownRefresh() { Promise.resolve(this.load()).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		onSourceChange(v) {
			if (v === this.source) return
			this.source = v
			this.lines = []
			this.load()
		},
		onLevelChange(v) { this.level = v },
		async load(silent = false) {
			if (silent && this.busy) return   // 静默轮询：上一笔未完则跳过，防 5s 轮询与 10s 超时倒挂堆积
			this.busy = true
			const src = this.source              // 快照：fetch 必须用切换前的源
			const req = ++this.reqSeq            // Vue2 不代理 _ 开头的 data 键，故用 reqSeq（非 _req）
			if (!silent) this.loading = true     // 自动轮询静默：不转按钮、不占错误态
			if (!silent) this.error = ''
			try {
				const data = src === 'syslog' ? await Syslog.readSyslog() : await Syslog.readDmesg()
				if (req !== this.reqSeq) return   // 过期响应丢弃，不覆盖最新数据
				this.lines = data
				this.scrollToBottom()
			} catch (e) {
				if (req !== this.reqSeq) return
				if (!silent) {
					this.error = this.$t('syslog.load_failed')
					this.lines = []
				}
				// 静默轮询失败：保留上次数据，不清空不报错
			} finally {
				if (!silent) this.loading = false
				this.busy = false
			}
		},
		scrollToBottom() {
			// 先置空再赋值：scroll-into-view 对相同值不重复触发，置空强制下次滚动
			this.lastLineId = ''
			this.$nextTick(() => {
				const n = this.filteredLines.length
				this.lastLineId = n > 0 ? 'L' + (n - 1) : ''
			})
		},
		startPoll() {
			this.stopPoll()
			this.pollTimer = setInterval(() => this.load(true), POLL_INTERVAL)   // 静默轮询：不转按钮
		},
		stopPoll() {
			if (this.pollTimer) {
				clearInterval(this.pollTimer)
				this.pollTimer = null
			}
		},
		toggleAuto(v) {
			this.autoRefresh = v
			if (v) this.startPoll()
			else this.stopPoll()
		},
		copyAll() {
			const text = this.filteredLines.map(l => l.text).join('\n')
			uni.setClipboardData({
				data: text,
				success: () => uni.showToast({ title: this.$t('syslog.copied'), icon: 'success' })
			})
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.log-seg {
	margin-bottom: $oa-sp-2;
}
.log-filter {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.log-auto {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
	margin-top: $oa-sp-2;
}
.log-auto-label {
	font-size: $oa-fs-label;
	color: $oa-text-muted;
}
.log-input {
	flex: 1;
	height: 72rpx;
	padding: 0 $oa-sp-2;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	font-size: $oa-fs-body;
	color: $oa-text;
	box-sizing: border-box;
}
.log-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-2 $oa-sp-1;
}
.log-meta-actions {
	display: flex;
	gap: $oa-sp-2;
}
.log-count {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.log-list {
	height: 65vh;
	background: $oa-surface-sunken;
	padding: $oa-sp-2;
	box-sizing: border-box;
}
.log-line {
	display: block;
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-all;
	font-size: $oa-fs-caption;
	line-height: 1.5;
	color: $oa-text;
}
.log-line--err {
	color: $oa-danger;
}
.log-line--warn {
	color: $oa-warning;
}
</style>
