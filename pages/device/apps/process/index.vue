<template>
	<view class="container">
		<!-- 加载状态 -->
		<oa-loading v-if="loading" overlay :text="$t('process.loading_processes')" />

		<!-- 进程列表内容 -->
		<view v-else class="process-container">

			<!-- 进程列表 -->
			<view v-if="processList.length > 0" class="process-list">
				<!-- 进程卡片 -->
				<view v-for="(process, index) in processList" :key="process.PID" class="process-card" @click="toggleProcessDetail(index)">
					<view class="process-card-header">
						<view class="process-info">
							<text class="process-name-text">{{ getProcessName(process.COMMAND) }}</text>
							<text class="process-pid-text">{{ process.PID }}</text>
						</view>
						<text class="status-chip">{{ getStatusText(process.STAT) }}</text>
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
						<view class="detail-section">
							<view class="detail-row">
								<text class="detail-label">{{ $t('process.user') }}:</text>
								<text class="detail-value">{{ process.USER }}</text>
							</view>
							<view class="detail-row">
								<text class="detail-label">{{ $t('process.parent_pid') }}:</text>
								<text class="detail-value">{{ process.PPID }}</text>
							</view>
							<view class="detail-row">
								<text class="detail-label">{{ $t('process.memory_percent') }}:</text>
								<text class="detail-value">{{ process['%MEM'] }}</text>
							</view>
							<view class="detail-row">
								<text class="detail-label">{{ $t('process.command') }}:</text>
								<text class="detail-value command-value">{{ process.COMMAND }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<oa-empty v-else :text="$t('process.no_processes')" />

			<!-- 错误状态 -->
			<oa-empty v-if="error" :text="error" />
		</view>
	</view>
</template>

<script>
import DeviceManager from '@/utils/deviceManager.js'

export default {
	data() {
		return {
			loading: false,
			processList: [],
			error: '',
			deviceInfo: {},
			session: '',
			url: '/ubus',
			refreshTimer: null,
			isFirstLoad: true
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('process.title')
		})
		
		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
		
		this.loadProcessList()
		this.startAutoRefresh()
	},
	onUnload() {
		this.stopAutoRefresh()
	},
	methods: {
		loadProcessList() {
			// 只在首次加载时显示加载动画
			if (this.isFirstLoad) {
				this.loading = true
			}
			this.error = ''
			
			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'call',
					params: [this.session, 'luci', 'getProcessList', {}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 10000,
				success: (res) => {
					if (res.data && res.data.result && res.data.result[1] && res.data.result[1].result) {
						this.parseProcessList(res.data.result[1].result)
					} else {
						this.error = this.$t('process.parse_failed')
					}
					if (this.isFirstLoad) {
						this.loading = false
						this.isFirstLoad = false
					}
				},
				fail: (err) => {
					this.error = this.$t('process.load_failed')
					if (this.isFirstLoad) {
						this.loading = false
						this.isFirstLoad = false
					}
				}
			})
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
				if (!this.loading) {
					this.loadProcessList()
				}
			}, 3000) // 3秒刷新一次
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

.container {
	padding: 10rpx;
	padding-top: 20rpx;
}
.process-container {
	padding: 2rpx;
}

.refresh-section {
	margin-bottom: 20rpx;
	text-align: center;
}

.auto-refresh-info {
	margin-top: 10rpx;
}

.auto-refresh-text {
	font-size: 24rpx;
	color: $oa-text-subtle;
}

.process-list {
	padding: 0;
}

.process-card {
	background: $oa-surface;
	border-radius: $oa-radius-lg;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: $oa-shadow-md;
}

.process-card:active {
	background: rgba(14, 132, 181, 0.05);
}

.process-card-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

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

.status-chip {
	font-size: 22rpx;
	color: $oa-brand;
	background: $oa-brand-subtle;
	padding: 6rpx 16rpx;
	border-radius: $oa-radius-lg;
	font-weight: 500;
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
	flex: 1 1 100%;
	order: 1;
}

.detail-section {
}

.detail-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: $oa-sp-1;
	padding: 8rpx 0;
}

.detail-row:last-child {
	margin-bottom: 0;
}

.detail-label {
	font-size: 26rpx;
	color: $oa-text-muted;
	font-weight: 500;
	min-width: 120rpx;
	flex-shrink: 0;
}

.detail-value {
	font-size: 26rpx;
	color: $oa-text;
	font-weight: 500;
	text-align: right;
	max-width: 60%;
	word-break: break-all;
	flex: 1;
}

.command-value {
	font-family: monospace;
	font-size: 22rpx;
	line-height: 1.4;
	text-align: left;
}

</style>
