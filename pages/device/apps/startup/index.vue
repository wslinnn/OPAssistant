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
					<view class="startup-dot" :class="dotClass(startup)"></view>
					<view class="startup-main">
						<text class="startup-name">{{ startup.key }}</text>
						<text class="startup-sub">{{ statusText(startup) }} · {{ $t('startup.priority') }} {{ startup.start || '--' }}</text>
					</view>
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
		dotClass(startup) {
			if (startup.running) return 'startup-dot--running'
			if (startup.enabled) return 'startup-dot--stopped'
			return 'startup-dot--disabled'
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
	gap: $oa-sp-2;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}

.startup-item--last {
	border-bottom: none;
}

.startup-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	flex-shrink: 0;
	box-sizing: border-box;
}

.startup-dot--running {
	background: $oa-success;
}

.startup-dot--stopped {
	background: $oa-text-subtle;
}

.startup-dot--disabled {
	background: transparent;
	border: 2rpx solid $oa-text-subtle;
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
