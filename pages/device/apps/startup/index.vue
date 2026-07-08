<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('startup.loading_startup')" />

		<view v-else>
			<oa-card v-if="startupList.length > 0" padding="none">
				<view
					v-for="(startup, index) in startupList"
					:key="startup.key"
					class="startup-item"
					:class="{ 'startup-item--last': index === startupList.length - 1 }"
				>
					<view class="startup-main">
						<oa-copy-text class="startup-name" :text="startup.key">{{ startup.key }}</oa-copy-text>
						<text class="startup-sub">{{ $t('startup.priority') }} {{ startup.start || '--' }}</text>
					</view>
					<oa-status-badge :type="statusType(startup)" :text="statusText(startup)" />
				</view>
			</oa-card>

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
		statusType(startup) {
			if (startup.running) return 'up'
			if (startup.enabled) return 'warn'
			return 'neutral'
		},
		statusText(startup) {
			if (startup.running) return this.$t('startup.running')
			if (startup.enabled) return this.$t('startup.stopped')
			return this.$t('startup.disabled')
		},
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

.startup-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $oa-sp-2;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}

.startup-item--last {
	border-bottom: none;
}

.startup-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.startup-name {
	font-size: $oa-fs-body;
	color: $oa-text;
	font-weight: 600;
	word-break: break-all;
}

.startup-sub {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
</style>
