<template>
	<view class="container">
		<!-- <view class="nav-header" style="display: flex; align-items: center; position: relative;">
			<view class="back-btn" @click="goBack" style="z-index: 2;">
				<image class="back-icon" src="/static/back.png" mode="widthFix" style="width: 40rpx; height: 40rpx;" />
			</view>
			<view style="flex: 1; display: flex; justify-content: center; position: absolute; left: 0; right: 0; pointer-events: none;">
				<text style="font-size: 32rpx; font-weight: bold; color: #fff;">OpenWrt</text>
			</view>
		</view> -->
		<view class="app-grid">
			<view class="app-item" v-for="(app, index) in appList" :key="index" @click="onPluginClick(app)">
				<view class="app-icon">
					<image :src="app.icon" mode="aspectFit" class="icon-image" />
				</view>
				<view class="app-name">
					<text class="name-text">{{ app.name }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>

export default {
	data() {
		return {
			navRetryTimer1: null,
			navRetryTimer2: null,
			appList: [
				{
					name: this.$t('apps.route'),
					icon: '/static/route-w.png',
					id: 'route'
				},
				{
					name: this.$t('apps.process'),
					icon: '/static/process-w.png',
					id: 'process'
				},
				{
					name: this.$t('apps.startup'),
					icon: '/static/startup-w.png',
					id: 'startup'
				},
				{
					name: this.$t('apps.reboot'),
					icon: '/static/reboot-w.png',
					id: 'reboot'
				},
				{
					name: this.$t('apps.factory_reset'),
					icon: '/static/reset-w.png',
					id: 'factory_reset'
				}
			]
		}
	},
	onLoad() {
		this.applyNavigationBar()

		console.log("插件管理页面加载")
	},
	onShow() {
		this.applyNavigationBar()
	},
	onTabItemTap() {
		this.applyNavigationBar()
	},
	onHide() {
		this.clearNavRetryTimer()
	},
	onUnload() {
		this.clearNavRetryTimer()
	},
	methods: {
		applyNavigationBar() {
			const title = this.$t('apps.title') || 'App Center'
			const apply = () => {
				uni.setNavigationBarTitle({ title })
				uni.setNavigationBarColor({
					frontColor: '#000000',
					backgroundColor: '#F8F8F8'
				})
			}
			apply()
			this.$nextTick(() => {
				apply()
			})
			this.clearNavRetryTimer()
			this.navRetryTimer1 = setTimeout(() => {
				apply()
			}, 80)
			this.navRetryTimer2 = setTimeout(() => {
				apply()
			}, 220)
		},
		clearNavRetryTimer() {
			if (this.navRetryTimer1) {
				clearTimeout(this.navRetryTimer1)
				this.navRetryTimer1 = null
			}
			if (this.navRetryTimer2) {
				clearTimeout(this.navRetryTimer2)
				this.navRetryTimer2 = null
			}
		},
		goBack() {
			uni.reLaunch({
				url: '/pages/device_list'
			})
		},
		onPluginClick(app) {
			console.log("点击插件:", app.name)
			
			if (app.id === 'route') {
				uni.navigateTo({
					url: '/pages/device/apps/route/index'
				})
			} else if (app.id === 'process') {
				uni.navigateTo({
					url: '/pages/device/apps/process/index'
				})
			} else if (app.id === 'startup') {
				uni.navigateTo({
					url: '/pages/device/apps/startup/index'
				})
			} else if (app.id === 'reboot') {
				uni.navigateTo({
					url: '/pages/device/apps/reboot/index'
				})
			} else if (app.id === 'factory_reset') {
				uni.navigateTo({
					url: '/pages/device/apps/factory_reset/index'
				})
			} else {
				uni.showToast({
					title: this.$t('apps.coming_soon'),
					icon: 'none'
				})
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.app-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: $oa-sp-3;
	padding: $oa-sp-5 $oa-sp-2;
}

.app-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	background: transparent;
	border-radius: 0;
	padding: 0;
	box-shadow: none;
	min-height: auto;
	transition: all 0.2s ease;
}

.app-item:active {
	transform: scale(0.9);
}

.app-icon {
	width: 100rpx;
	height: 100rpx;
	margin-bottom: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $oa-brand;
	border-radius: $oa-radius-lg;
	box-shadow: $oa-shadow-sm;
}

.icon-image {
	width: 60rpx;
	height: 60rpx;
}

.app-name {
	text-align: center;
	width: 100%;
}

.name-text {
	font-size: 22rpx;
	color: $oa-text;
	font-weight: 400;
	line-height: 1.3;
	word-break: break-all;
}
</style>
