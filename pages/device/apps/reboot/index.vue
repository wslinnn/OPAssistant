<template>
	<view class="container">

		<view v-if="showProgress" class="progress-overlay">
			<view class="progress-content">
				<view class="progress-spinner"></view>
				<text class="progress-title">{{ $t('reboot.device_restarting') }}</text>
				<text class="progress-desc">{{ $t('reboot.please_wait') }}</text>
				<text class="progress-countdown">{{ countdownText }}</text>
			</view>
		</view>

		<oa-card padding="none">
			<view class="reboot-body">
				<view class="reboot-icon">
					<image src="/static/reboot.png" mode="aspectFit" class="app-icon-image" />
				</view>
				<text class="reboot-title">{{ $t('reboot.device_restart') }}</text>
				<text class="reboot-desc">{{ $t('reboot.restart_desc') }}</text>

				<oa-button type="negative" block :disabled="rebooting" @click="confirmReboot">
					<text v-if="!rebooting">{{ $t('reboot.restart_device') }}</text>
					<text v-else>{{ $t('reboot.restarting') }}</text>
				</oa-button>
			</view>
		</oa-card>
	</view>
</template>

<script>
import DeviceManager from '@/utils/deviceManager.js'

export default {
		data() {
			return {
				rebooting: false,
				showProgress: false,
				countdown: 60,
				countdownText: '',
				countdownTimer: null,
				deviceInfo: {},
				session: '',
				url: '/ubus'
			}
		},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('reboot.title')
		})

		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
	},
	onUnload() {

		this.clearCountdown()
	},
	methods: {

		confirmReboot() {
			uni.showModal({
				title: this.$t('reboot.confirm_restart'),
				content: this.$t('reboot.confirm_restart_content'),
				confirmText: this.$t('reboot.confirm_restart_text'),
				confirmColor: '#ff3b30',
				success: (res) => {
					if (res.confirm) {
						this.executeReboot()
					}
				}
			})
		},


		executeReboot() {
			this.rebooting = true

			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 3,
					method: 'call',
					params: [this.session, 'system', 'reboot', {}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 3000,
				success: (res) => {
					console.log('reboot:', res)
				},
				fail: (err) => {
					console.log('reboot:', err)
				},
				complete: () => {

					this.showProgress = true
					this.startCountdown()
				}
			})
		},

		startCountdown() {
			this.countdown = 60
			this.updateCountdownText()

			this.countdownTimer = setInterval(() => {
				this.countdown--
				this.updateCountdownText()

				if (this.countdown <= 0) {
					this.clearCountdown()

					uni.reLaunch({
						url: '/pages/device_list'
					})
				}
			}, 1000)
		},


		clearCountdown() {
			if (this.countdownTimer) {
				clearInterval(this.countdownTimer)
				this.countdownTimer = null
			}
		},


		updateCountdownText() {
			this.countdownText = `${this.countdown}${this.$t('reboot.seconds')}`
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.progress-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: $oa-scrim;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 999;
}

.progress-content {
	background: $oa-surface;
	padding: 60rpx 40rpx;
	border-radius: $oa-radius-2xl;
	text-align: center;
	width: 80%;
	max-width: 80%;
}

.progress-spinner {
	border: 6rpx solid $oa-surface-sunken;
	border-top: 6rpx solid $oa-brand;
	border-radius: 50%;
	width: 100rpx;
	height: 100rpx;
	animation: spin 1s linear infinite;
	margin: 0 auto 30rpx;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.progress-title {
	font-size: 36rpx;
	font-weight: bold;
	color: $oa-text;
	display: block;
	margin-bottom: 20rpx;
}

.progress-desc {
	font-size: 28rpx;
	color: $oa-text-muted;
	display: block;
	margin-bottom: 30rpx;
	line-height: 1.5;
}

.progress-countdown {
	font-size: 32rpx;
	font-weight: bold;
	color: $oa-brand;
	display: block;
}

.reboot-body {
	padding: 60rpx 40rpx;
	text-align: center;
}

.reboot-icon {
	width: 200rpx;
	height: 200rpx;
	margin: 0 auto 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: $oa-radius-lg;
}

.app-icon-image {
	width: 150rpx;
	height: 150rpx;
}

.reboot-title {
	font-size: 36rpx;
	font-weight: bold;
	color: $oa-text;
	display: block;
	margin-bottom: 20rpx;
}

.reboot-desc {
	font-size: 28rpx;
	color: $oa-text-muted;
	line-height: 1.5;
	display: block;
	margin-bottom: 50rpx;
}
</style>
