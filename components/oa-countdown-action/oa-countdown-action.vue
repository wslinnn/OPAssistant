<template>
	<view>
		<!-- 倒计时遮罩 -->
		<view v-if="counting" class="oa-cda__overlay">
			<view class="oa-cda__overlay-content">
				<view class="oa-cda__spinner"></view>
				<text class="oa-cda__overlay-title">{{ progressTitle }}</text>
				<text class="oa-cda__overlay-desc">{{ progressDesc }}</text>
				<text class="oa-cda__overlay-countdown">{{ countdownText }}</text>
			</view>
		</view>

		<!-- 操作卡 -->
		<oa-card padding="none">
			<view class="oa-cda__body">
				<view class="oa-cda__icon">
					<image :src="icon" mode="aspectFit" class="oa-cda__icon-img" />
				</view>
				<text class="oa-cda__title">{{ title }}</text>
				<text class="oa-cda__desc">{{ desc }}</text>
				<oa-button :type="btnType" block :disabled="counting" @click="onAction">
					{{ counting ? countingBtnText : btnText }}
				</oa-button>
			</view>
		</oa-card>
	</view>
</template>

<script>
// 倒计时操作：操作卡(图标/标题/描述/按钮) + 倒计时遮罩(spinner/countdown)
// 父页 @action 执行请求，请求后调 ref.startCountdown()；@countdown-end 跳转
export default {
	name: 'oa-countdown-action',
	props: {
		icon: { type: String, default: '' },
		title: { type: String, default: '' },
		desc: { type: String, default: '' },
		btnText: { type: String, default: '' },
		countingBtnText: { type: String, default: '' },
		btnType: { type: String, default: 'negative' },
		seconds: { type: Number, default: 60 },
		progressTitle: { type: String, default: '' },
		progressDesc: { type: String, default: '' },
		countdownSuffix: { type: String, default: '' }
	},
	data() {
		return {
			counting: false,
			countdown: 0,
			countdownText: '',
			timer: null
		}
	},
	methods: {
		onAction() {
			if (this.counting) return
			this.$emit('action')
		},
		startCountdown() {
			this.clearCountdown()
			this.counting = true
			this.countdown = this.seconds
			this.updateCountdownText()
			this.timer = setInterval(() => {
				this.countdown--
				this.updateCountdownText()
				if (this.countdown <= 0) {
					this.clearCountdown()
					this.$emit('countdown-end')
				}
			}, 1000)
		},
		updateCountdownText() {
			this.countdownText = `${this.countdown}${this.countdownSuffix}`
		},
		clearCountdown() {
			if (this.timer) {
				clearInterval(this.timer)
				this.timer = null
			}
		}
	},
	beforeDestroy() {
		this.clearCountdown()
	}
}
</script>

<style scoped lang="scss">
.oa-cda__overlay {
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
.oa-cda__overlay-content {
	background: $oa-surface;
	padding: 60rpx 40rpx;
	border-radius: $oa-radius-2xl;
	text-align: center;
	width: 80%;
	max-width: 80%;
	box-sizing: border-box;
}
.oa-cda__spinner {
	border: 6rpx solid $oa-surface-sunken;
	border-top: 6rpx solid $oa-brand;
	border-radius: 50%;
	width: 100rpx;
	height: 100rpx;
	animation: oa-cda-spin 1s linear infinite;
	margin: 0 auto 30rpx;
}
@keyframes oa-cda-spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
.oa-cda__overlay-title {
	font-size: 36rpx;
	font-weight: bold;
	color: $oa-text;
	display: block;
	margin-bottom: 20rpx;
}
.oa-cda__overlay-desc {
	font-size: 28rpx;
	color: $oa-text-muted;
	display: block;
	margin-bottom: 30rpx;
	line-height: 1.5;
}
.oa-cda__overlay-countdown {
	font-size: 32rpx;
	font-weight: bold;
	color: $oa-brand;
	display: block;
}

.oa-cda__body {
	padding: 60rpx 40rpx;
	text-align: center;
}
.oa-cda__icon {
	width: 200rpx;
	height: 200rpx;
	margin: 0 auto 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: $oa-radius-lg;
}
.oa-cda__icon-img {
	width: 150rpx;
	height: 150rpx;
}
.oa-cda__title {
	font-size: 36rpx;
	font-weight: bold;
	color: $oa-text;
	display: block;
	margin-bottom: 20rpx;
}
.oa-cda__desc {
	font-size: 28rpx;
	color: $oa-text-muted;
	line-height: 1.5;
	display: block;
	margin-bottom: 50rpx;
}
</style>
