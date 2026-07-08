<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('startup.loading_startup')" />

		<view v-else class="startup-container">


			<view v-if="startupList.length > 0" class="startup-list">
				<view class="table-header">
					<view class="header-cell service-name">{{ $t('startup.service_name') }}</view>
					<view class="header-cell priority">{{ $t('startup.priority') }}</view>
					<view class="header-cell enabled">{{ $t('startup.enabled') }}</view>
					<view class="header-cell running">{{ $t('startup.running') }}</view>
				</view>
				
				<view v-for="(startup, index) in startupList" :key="startup.key" class="startup-row">
					<view class="table-cell service-name">
						<text class="service-name-text">{{ startup.key }}</text>
					</view>
					<view class="table-cell priority">
						<text class="priority-value">{{ startup.start || '--' }}</text>
					</view>
					<view class="table-cell enabled">
						<text class="status-badge" :class="startup.enabled ? 'enabled' : 'disabled'">
							{{ startup.enabled ? $t('startup.yes') : $t('startup.no') }}
						</text>
					</view>
					<view class="table-cell running">
						<text class="status-badge" :class="startup.running ? 'running' : 'stopped'">
							{{ startup.running ? $t('startup.running') : $t('startup.stopped') }}
						</text>
					</view>
				</view>
			</view>

			<oa-empty v-else :text="$t('startup.no_startup')" />

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
			startupList: [],
			error: '',
			deviceInfo: {},
			session: '',
			url: '/ubus'
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('startup.title')
		})
		
		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
		this.loadStartupList()
	},
	methods: {
		loadStartupList() {
			this.loading = true
			this.error = ''
			
			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'call',
					params: [this.session, 'rc', 'list', {}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 10000,
				success: (res) => {
					if (res.data && res.data.result && res.data.result[1]) {
						this.parseStartupList(res.data.result[1])
					} else {
						this.error = this.$t('startup.parse_failed')
					}
					this.loading = false
				},
				fail: (err) => {
					this.error = this.$t('startup.load_failed')
					this.loading = false
				}
			})
		},
		
		parseStartupList(data) {
			try {
				this.startupList = []
				
				for (const [key, value] of Object.entries(data)) {
					this.startupList.push({
						key: key,
						start: value.start,
						enabled: value.enabled,
						running: value.running
					})
				}
				
				this.startupList.sort((a, b) => {
					const aStart = a.start || 999
					const bStart = b.start || 999
					return aStart - bStart
				})
				
			} catch (error) {
				this.error = this.$t('startup.parse_failed')
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
.startup-container {
	padding: 2rpx;
}

.refresh-section {
	margin-bottom: 20rpx;
	text-align: center;
}

.refresh-btn {
	background: $oa-brand;
	color: $oa-on-brand;
	border: none;
	border-radius: $oa-radius-md;
	padding: 20rpx 40rpx;
	font-size: 28rpx;
}

.refresh-btn:disabled {
	background: -surface-sunken;
}

.refresh-text {
	color: $oa-on-brand;
	font-size: 28rpx;
}

.startup-list {
	background: $oa-surface;
	border-radius: $oa-radius-lg;
	overflow: hidden;
	box-shadow: $oa-shadow-md;
}

.table-header {
	display: flex;
	background: $oa-brand-subtle;
	padding: 20rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}

.header-cell {
	flex: 1;
	text-align: center;
	font-size: 26rpx;
	font-weight: 600;
	color: $oa-text;
}

.header-cell.service-name {
	flex: 2;
	text-align: left;
	padding-left: 30rpx;
}

.startup-row {
	display: flex;
	border-bottom: 1rpx solid $oa-hairline;
	transition: background-color 0.2s ease;
}

.startup-row:last-child {
	border-bottom: none;
}

.startup-row:hover {
	background: rgba(14, 132, 181, 0.02);
}

.table-cell {
	flex: 1;
	padding: 20rpx 10rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.table-cell.service-name {
	flex: 2;
	justify-content: flex-start;
	padding-left: 30rpx;
}

.service-name-text {
	font-size: 28rpx;
	color: $oa-text;
	font-weight: 500;
}

.priority-value {
	font-size: 26rpx;
	font-weight: 600;
	color: $oa-text-muted;
}

.status-badge {
	font-size: 24rpx;
	font-weight: 600;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
}

.status-badge.enabled {
	color: $oa-success;
	background: $oa-success-surface;
}

.status-badge.disabled {
	color: $oa-danger;
	background: $oa-danger-surface;
}

.status-badge.running {
	color: $oa-success;
	background: $oa-success-surface;
}

.status-badge.stopped {
	color: $oa-danger;
	background: $oa-danger-surface;
}

</style>
