<template>
	<view class="container">
		<oa-card padding="lg">
			<view class="diag-seg">
				<oa-segmented :value="tool" :options="toolOptions" @input="onToolChange" />
			</view>

			<view class="diag-field">
				<text class="diag-label">{{ $t('diag.target') }}</text>
				<input class="diag-input" :class="{ 'is-focused': activeField === 'host' }" v-model="host" :placeholder="$t('diag.target_placeholder')" @focus="activeField = 'host'" @blur="activeField = ''" />
			</view>

			<view v-if="tool === 'ping'" class="diag-field diag-field--inline">
				<text class="diag-label">{{ $t('diag.count') }}</text>
				<input class="diag-input diag-input--num" :class="{ 'is-focused': activeField === 'count' }" type="number" v-model="count" @focus="activeField = 'count'" @blur="activeField = ''" />
			</view>
			<view v-if="tool === 'traceroute'" class="diag-field diag-field--inline">
				<text class="diag-label">{{ $t('diag.hops') }}</text>
				<input class="diag-input diag-input--num" :class="{ 'is-focused': activeField === 'hops' }" type="number" v-model="hops" @focus="activeField = 'hops'" @blur="activeField = ''" />
			</view>

			<view class="diag-actions">
				<oa-button type="primary" :loading="running" :disabled="!canRun" @click="run">{{ running ? $t('diag.running') : $t('diag.run') }}</oa-button>
				<oa-button v-if="output && !running" type="neutral" @click="clear">{{ $t('diag.clear') }}</oa-button>
			</view>
		</oa-card>

		<oa-card v-if="output || error" padding="none" class="diag-result">
			<view class="diag-result-head">
				<text class="diag-result-title">{{ $t('diag.result') }}</text>
				<oa-button v-if="output" size="small" type="neutral" @click="copyOutput">{{ $t('diag.copy') }}</oa-button>
			</view>
			<scroll-view scroll-y class="diag-out" :scroll-into-view="lastLineId">
				<text selectable v-for="(l, i) in outLines" :key="i" :id="'L' + i" class="diag-line">{{ l }}</text>
			</scroll-view>
			<view v-if="error" class="diag-error">{{ error }}</view>
		</oa-card>
		<oa-empty v-else-if="!running" :text="$t('diag.empty')" />
	</view>
</template>

<script>
import Diag from '@/utils/diag.js'

export default {
	data() {
		return {
			tool: 'ping',
			host: '',
			count: 4,
			hops: 15,
			running: false,
			output: '',
			error: '',
			lastLineId: '',
			activeField: ''
		}
	},
	computed: {
		toolOptions() {
			return [
				{ value: 'ping', label: this.$t('diag.tool_ping') },
				{ value: 'traceroute', label: this.$t('diag.tool_traceroute') },
				{ value: 'nslookup', label: this.$t('diag.tool_nslookup') }
			]
		},
		canRun() {
			return !this.running && this.host.trim().length > 0
		},
		outLines() {
			return this.output ? this.output.split('\n') : []
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('diag.title') })
	},
	methods: {
		onToolChange(v) {
			if (v === this.tool) return
			this.tool = v
			this.output = ''
			this.error = ''
			this.lastLineId = ''
		},
		async run() {
			const host = this.host.trim()
			if (!host) return
			this.running = true
			this.output = ''
			this.error = ''
			this.lastLineId = ''
			try {
				let res
				if (this.tool === 'ping') {
					res = await Diag.ping(host, { count: parseInt(this.count, 10) || 4, wait: 2, deadline: 8 })
				} else if (this.tool === 'traceroute') {
					res = await Diag.traceroute(host, { maxHops: parseInt(this.hops, 10) || 15, wait: 1, queries: 1 })
				} else {
					res = await Diag.nslookup(host)
				}
				// 诊断命令常把错误写 stderr（如 Name or service not known），一并展示；从头显示，不滚底
				const text = (res.stdout + (res.stderr ? '\n' + res.stderr : '')).replace(/\n+$/, '')
				this.output = text || this.$t('diag.empty')
			} catch (e) {
				this.error = this.$t('diag.load_failed')
			} finally {
				this.running = false
			}
		},
		copyOutput() {
			uni.setClipboardData({
				data: this.output,
				success: () => uni.showToast({ title: this.$t('diag.copied'), icon: 'success' })
			})
		},
		clear() {
			this.output = ''
			this.error = ''
			this.lastLineId = ''
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.diag-seg {
	margin-bottom: $oa-sp-3;
}
.diag-field {
	margin-bottom: $oa-sp-2;
}
.diag-field--inline {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;

	.diag-label {
		margin-bottom: 0;
		flex-shrink: 0;
	}
}
.diag-label {
	display: block;
	font-size: $oa-fs-label;
	color: $oa-text-muted;
	margin-bottom: $oa-sp-1;
}
.diag-input {
	width: 100%;
	height: 80rpx;
	padding: 0 $oa-sp-2;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	font-size: $oa-fs-body;
	color: $oa-text;
	box-sizing: border-box;
	@include oa-input-focus();
}
.diag-input--num {
	width: 140rpx;
}
.diag-actions {
	display: flex;
	gap: $oa-sp-2;
	margin-top: $oa-sp-1;
}
.diag-result {
	margin-top: $oa-sp-2;
}
.diag-result-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}
.diag-result-title {
	font-size: $oa-fs-label;
	color: $oa-text-muted;
	font-weight: 600;
}
.diag-out {
	height: 55vh;
	background: $oa-surface-sunken;
	padding: $oa-sp-2;
	box-sizing: border-box;
}
.diag-line {
	display: block;
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-all;
	font-size: $oa-fs-caption;
	line-height: 1.5;
	color: $oa-text;
}
.diag-error {
	padding: $oa-sp-2 $oa-sp-3;
	color: $oa-danger;
	font-size: $oa-fs-caption;
}
</style>
