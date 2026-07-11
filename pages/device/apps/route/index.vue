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
import Diag from '@/utils/diag.js'

export default {
	data() {
		return {
			loading: false,
			routeList: [],
			error: ''
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('route.title')
		})
		this.loadRouteTable()
	},
	methods: {
		async loadRouteTable() {
			this.loading = true
			this.error = ''
			try {
				// 并发取 IPv4 + IPv6 路由表(table all 含所有表)；IPv6 失败(无 IPv6/ACL)容错不阻断 IPv4
				const [res4, res6] = await Promise.all([
					Diag.exec('/sbin/ip', ['-4', 'route', 'show', 'table', 'all'], 10000),
					Diag.exec('/sbin/ip', ['-6', 'route', 'show', 'table', 'all'], 10000).catch(() => null)
				])
				const list = []
				if (res4 && res4.stdout) list.push(...this.parseRoutes(res4.stdout, 'ipv4'))
				if (res6 && res6.stdout) list.push(...this.parseRoutes(res6.stdout, 'ipv6'))
				if (list.length) this.routeList = list
				else { this.routeList = []; this.error = this.$t('route.parse_failed') }
			} catch (e) {
				this.error = this.$t('route.load_failed')
			} finally {
				this.loading = false
			}
		},

		parseRoutes(stdout, family) {
			const list = []
			stdout.split('\n').filter(line => line.trim()).forEach(line => {
				const route = this.parseRouteLine(line.trim())
				if (route) { route.family = family; list.push(route) }
			})
			return list
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
				} else if (part.includes(':') && !route.destination) {
					route.destination = part
					i++
				} else {
					i++
				}
			}

			return Object.keys(route).length > 0 ? route : null
		},

		getRouteType(route) {
			const fam = route.family === 'ipv6' ? 'IPv6 ' : 'IPv4 '
			if (route.destination === 'default') {
				return fam + this.$t('route.type_default')
			} else if (route.destination === 'local') {
				return fam + this.$t('route.type_local')
			} else if (route.destination === 'broadcast') {
				return fam + this.$t('route.type_broadcast')
			} else if (route.destination && route.destination.includes('/')) {
				return fam + this.$t('route.type_network')
			} else {
				return fam + this.$t('route.type_host')
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
