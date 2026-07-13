<template>
	<view class="container">
		<!-- 加载状态 -->
		<oa-loading v-if="loading" overlay :text="$t('process.loading_processes')" />

		<!-- 进程列表内容 -->
		<view v-else class="process-container">

			<!-- 进程列表 -->
			<view v-if="processList.length > 0" class="process-list">
				<!-- 进程卡片 -->
				<oa-card v-for="(process, index) in processList" :key="process.PID" padding="lg" :divider="true" @click.native="toggleProcessDetail(index)">
					<view slot="header" class="process-info">
						<text class="process-name-text">{{ getProcessName(process.COMMAND) }}</text>
						<text class="process-pid-text">{{ process.PID }}</text>
					</view>
					<view slot="actions">
						<oa-status-badge type="info" :text="getStatusText(process.STAT)" />
					</view>
					<view class="process-metrics">
						<view class="metric-item">
							<text class="metric-label">{{ $t('process.cpu') }}</text>
							<text class="cpu-value">{{ process['%CPU'] }}</text>
						</view>
						<view class="metric-item">
							<text class="metric-label">{{ $t('process.memory') }}</text>
							<text class="memory-value">{{ formatMemoryWithPercent(process.VSZ, process['%MEM']) }}</text>
						</view>
					</view>

					<!-- 展开详情 -->
					<view v-if="process.expanded" class="process-detail">
						<oa-list-row :label="$t('process.user')" :value="process.USER" copyable />
						<oa-list-row :label="$t('process.parent_pid')" :value="process.PPID" copyable />
						<oa-list-row :label="$t('process.memory_percent')" :value="process['%MEM']" />
						<oa-list-row :label="$t('process.command')" :border="false">
							<oa-copy-text class="command-text" :text="process.COMMAND">{{ process.COMMAND }}</oa-copy-text>
						</oa-list-row>
					</view>
				</oa-card>
			</view>

			<!-- 空状态 -->
			<oa-empty :key="'no-proc'" v-else :text="$t('process.no_processes')" />

			<!-- 错误状态 -->
			<oa-empty :key="'error'" v-if="error" :text="error" />
		</view>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			loading: false,
			processList: [],
			error: '',
			refreshTimer: null,
			isFirstLoad: true,
			busy: false
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('process.title')
		})
		this.loadProcessList()
		this.startAutoRefresh()
	},
	onUnload() {
		this.stopAutoRefresh()
	},
	onPullDownRefresh() { Promise.resolve(this.loadProcessList()).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		// busy 守卫:防止 3s 轮询在慢请求(>3s)下堆积(callUbus 改 await 后,loading 不再天然拦截轮询)
		async loadProcessList() {
			if (this.busy) return
			this.busy = true
			if (this.isFirstLoad) {
				this.loading = true
			}
			this.error = ''
			try {
				const res = await UciRpc.callUbus('luci', 'getProcessList', {}, 10000)
				if (res && res.result) {
					this.parseProcessList(res.result)
				} else {
					this.error = this.$t('process.parse_failed')
				}
			} catch (e) {
				this.error = this.$t('process.load_failed')
			} finally {
				this.busy = false
				if (this.isFirstLoad) {
					this.loading = false
					this.isFirstLoad = false
				}
			}
		},

		parseProcessList(processes) {
			try {
				const expandedStates = {}
				this.processList.forEach(process => {
					if (process.expanded) {
						expandedStates[process.PID] = true
					}
				})

				this.processList = processes.map(process => {
					const parsedProcess = {
						...process,
						expanded: expandedStates[process.PID] || false,
						cpuValue: parseFloat(process['%CPU'].replace('%', '')) || 0
					}
					return parsedProcess
				})

				this.processList.sort((a, b) => b.cpuValue - a.cpuValue)

			} catch (error) {
				this.error = this.$t('process.parse_failed')
			}
		},

		getProcessName(command) {
			if (!command) return 'Unknown'

			if (command.startsWith('[') && command.endsWith(']')) {
				return command
			}

			const parts = command.split(' ')
			const firstPart = parts[0]

			if (firstPart.includes('/')) {
				return firstPart.split('/').pop()
			}

			if (parts.length === 1) {
				return firstPart
			}

			return firstPart
		},

		formatMemoryWithPercent(vsz, memPercent) {
			let kb = 0

			if (typeof vsz === 'string') {
				if (vsz.includes('m')) {
					const match = vsz.match(/(\d+(?:\.\d+)?)/)
					if (match) {
						kb = parseFloat(match[1]) * 1024
					}
				} else {
					kb = parseInt(vsz) || 0
				}
			} else {
				kb = parseInt(vsz) || 0
			}

			const mb = (kb / 1024).toFixed(1)
			return `${mb}MB(${memPercent})`
		},

		getStatusText(stat) {
			return stat || 'Unknown'
		},

		toggleProcessDetail(index) {
			this.processList[index].expanded = !this.processList[index].expanded
		},

		startAutoRefresh() {
			this.refreshTimer = setInterval(() => {
				if (!this.busy) {
					this.loadProcessList()
				}
			}, 3000)
		},

		stopAutoRefresh() {
			if (this.refreshTimer) {
				clearInterval(this.refreshTimer)
				this.refreshTimer = null
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.process-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.process-name-text {
	font-size: 28rpx;
	color: $oa-text;
	font-weight: 600;
	margin-bottom: 4rpx;
}

.process-pid-text {
	font-size: 22rpx;
	color: $oa-text-muted;
}

.process-metrics {
	display: flex;
}

.metric-item {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.metric-label {
	font-size: 22rpx;
	color: $oa-text-subtle;
	margin-bottom: 8rpx;
}

.cpu-value {
	font-size: 26rpx;
	font-weight: 600;
	color: $oa-danger;
}

.memory-value {
	font-size: 26rpx;
	font-weight: 600;
	color: $oa-success;
}

.process-detail {
	background: rgba(0, 0, 0, 0.02);
	border-top: 1rpx solid $oa-hairline;
	padding: 30rpx;
	margin-top: $oa-sp-2;
}

.command-text {
	font-family: monospace;
	font-size: 22rpx;
	line-height: 1.4;
	text-align: right;
	word-break: break-all;
}
</style>
