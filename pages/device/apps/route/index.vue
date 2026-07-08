<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('route.loading_routes')" />

		<view v-else class="route-container">
		

			<view v-if="routeList.length > 0" class="route-list">
				<view v-for="(route, index) in routeList" :key="index" class="route-item">
					<view class="route-header">
						<text class="route-index">#{{ index + 1 }}</text>
						<text class="route-type">{{ getRouteType(route) }}</text>
					</view>
					<view class="route-details">
						<view class="detail-row" v-if="route.destination">
							<text class="detail-label">{{ $t('route.destination') }}:</text>
							<text class="detail-value">{{ route.destination }}</text>
						</view>
						<view class="detail-row" v-if="route.gateway">
							<text class="detail-label">{{ $t('route.gateway') }}:</text>
							<text class="detail-value">{{ route.gateway }}</text>
						</view>
						<view class="detail-row" v-if="route.device">
							<text class="detail-label">{{ $t('route.device') }}:</text>
							<text class="detail-value">{{ route.device }}</text>
						</view>
						<view class="detail-row" v-if="route.src">
							<text class="detail-label">{{ $t('route.src') }}:</text>
							<text class="detail-value">{{ route.src }}</text>
						</view>
						<view class="detail-row" v-if="route.scope">
							<text class="detail-label">{{ $t('route.scope') }}:</text>
							<text class="detail-value">{{ route.scope }}</text>
						</view>
						<view class="detail-row" v-if="route.table">
							<text class="detail-label">{{ $t('route.table') }}:</text>
							<text class="detail-value">{{ route.table }}</text>
						</view>
					</view>
				</view>
			</view>

			<oa-empty v-else :text="$t('route.no_routes')" />

			<oa-empty v-if="error" :text="error">
				<oa-button size="small" @click="loadRouteTable">{{ $t('route.retry') }}</oa-button>
			</oa-empty>
		</view>
	</view>
</template>

<script>
import DeviceManager from '@/utils/deviceManager.js'

export default {
	data() {
		return {
			loading: false,
			routeList: [],
			error: '',
			deviceInfo: {},
			session: '',
			url: '/ubus'
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('route.title')
		})
		
		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
		
		this.loadRouteTable()
	},
	methods: {
		loadRouteTable() {
			this.loading = true
			this.error = ''
			
			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'call',
					params: [this.session, 'file', 'exec', {
						command: '/sbin/ip',
						params: ['-4', 'route', 'show', 'table', 'all'],
						env: null
					}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 10000,
				success: (res) => {
					if (res.data && res.data.result && res.data.result[1] && res.data.result[1].stdout) {
						this.parseRouteTable(res.data.result[1].stdout)
					} else {
						this.error = this.$t('route.parse_failed')
					}
					this.loading = false
				},
				fail: (err) => {
					this.error = this.$t('route.load_failed')
					this.loading = false
				}
			})
		},
		
		parseRouteTable(stdout) {
			try {
				const lines = stdout.split('\n').filter(line => line.trim())
				this.routeList = []
				
				lines.forEach(line => {
					const route = this.parseRouteLine(line.trim())
					if (route) {
						this.routeList.push(route)
					}
				})
				
			} catch (error) {
				this.error = this.$t('route.parse_failed')
			}
		},
		
		parseRouteLine(line) {
	
			
			const parts = line.split(/\s+/)
			const route = {}
			
			let i = 0
			while (i < parts.length) {
				const part = parts[i]
				
				if (part === 'default') {
					route.destination = 'default'
					i++
				} else if (part === 'via') {
					route.gateway = parts[++i]
					i++
				} else if (part === 'dev') {
					route.device = parts[++i]
					i++
				} else if (part === 'src') {
					route.src = parts[++i]
					i++
				} else if (part === 'scope') {
					route.scope = parts[++i]
					i++
				} else if (part === 'table') {
					route.table = parts[++i]
					i++
				} else if (part.includes('/') && !route.destination) {
					route.destination = part
					i++
				} else if (part.match(/^\d+\.\d+\.\d+\.\d+$/) && !route.destination) {
					route.destination = part
					i++
				} else {
					i++
				}
			}
			
			return Object.keys(route).length > 0 ? route : null
		},
		
		getRouteType(route) {
			if (route.destination === 'default') {
				return this.$t('route.type_default')
			} else if (route.destination === 'local') {
				return this.$t('route.type_local')
			} else if (route.destination === 'broadcast') {
				return this.$t('route.type_broadcast')
			} else if (route.destination && route.destination.includes('/')) {
				return this.$t('route.type_network')
			} else {
				return this.$t('route.type_host')
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.container {
	padding: 10rpx;
}
.route-container {
	padding: 5rpx;
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

.route-list {
}

.route-item {
	background: $oa-surface;
	border-radius: $oa-radius-lg;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: $oa-shadow-md;
}

.route-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	padding-bottom: 15rpx;
	border-bottom: 1rpx solid $oa-hairline;
}

.route-index {
	font-size: 24rpx;
	color: $oa-text-muted;
	font-weight: 500;
}

.route-type {
	font-size: 24rpx;
	color: $oa-brand;
	font-weight: 600;
	background: $oa-brand-subtle;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
}

.route-details {
}

.detail-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
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

</style>
