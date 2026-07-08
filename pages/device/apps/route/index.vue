<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('route.loading_routes')" />

		<view v-else class="route-container">
			<view v-if="routeList.length > 0" class="route-list">
				<oa-card v-for="(route, index) in routeList" :key="index" padding="lg" :divider="true">
					<view slot="header" class="route-index">#{{ index + 1 }}</view>
					<view slot="actions">
						<oa-status-badge type="info" :text="getRouteType(route)" />
					</view>
					<oa-list-row v-if="route.destination" :label="$t('route.destination')" :value="route.destination" copyable />
					<oa-list-row v-if="route.gateway" :label="$t('route.gateway')" :value="route.gateway" copyable />
					<oa-list-row v-if="route.device" :label="$t('route.device')" :value="route.device" copyable />
					<oa-list-row v-if="route.src" :label="$t('route.src')" :value="route.src" copyable />
					<oa-list-row v-if="route.scope" :label="$t('route.scope')" :value="route.scope" copyable />
					<oa-list-row v-if="route.table" :label="$t('route.table')" :value="route.table" :border="false" copyable />
				</oa-card>
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

.route-index {
	font-size: 24rpx;
	color: $oa-text-muted;
	font-weight: 500;
}
</style>
