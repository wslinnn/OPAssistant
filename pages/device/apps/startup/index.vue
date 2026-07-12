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
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			loading: false,
			startupList: [],
			error: ''
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('startup.title')
		})
		this.loadStartupList()
	},
	onPullDownRefresh() { Promise.resolve(this.loadStartupList()).finally(() => uni.stopPullDownRefresh()) },
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
		async loadStartupList() {
			this.loading = true
			this.error = ''
			try {
				const data = await UciRpc.callUbus('rc', 'list', {}, 10000)
				this.parseStartupList(data)
			} catch (e) {
				this.error = this.$t('startup.load_failed')
			} finally {
				this.loading = false
			}
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
