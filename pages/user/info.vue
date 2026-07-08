<template>
	<view class="container">
		<view class="user-card">
			<view class="user-icon">👤</view>
			<text class="user-title">{{ $t('user_info.title') }}</text>
			
			<view class="language-section">
				<text class="section-title">{{ $t('language.current_language') }}</text>
				<view class="language-options">
					<view 
						:class="['language-option', currentLanguage === 'zh-Hans' ? 'active' : '']" 
						@click="switchLanguage('zh-Hans')"
					>
						<text>{{ $t('language.chinese') }}</text>
					</view>
					<view 
						:class="['language-option', currentLanguage === 'en' ? 'active' : '']" 
						@click="switchLanguage('en')"
					>
						<text>{{ $t('language.english') }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentLanguage: 'zh-Hans'
			}
		},
		onLoad() {
			// 动态设置页面标题
			uni.setNavigationBarTitle({
				title: this.$t('user_info.title')
			})
			
			// 获取当前语言设置
			this.currentLanguage = uni.getStorageSync('locale') || 'zh-Hans'
		},
		methods: {
			switchLanguage(locale) {
				if (this.currentLanguage === locale) {
					return
				}
				
				// 保存语言设置
				uni.setStorageSync('locale', locale)
				this.currentLanguage = locale
				
				// 显示成功提示
				uni.showToast({
					title: this.$t('language.switch_success'),
					icon: 'success'
				})
				
				// 提示重启应用
				setTimeout(() => {
					uni.showModal({
						title: this.$t('language.title'),
						content: this.$t('language.restart_required'),
						showCancel: false,
						confirmText: '确定'
					})
				}, 1500)
			}
		}
	}
</script>

<style scoped lang="scss">
.container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 20rpx;
}

.user-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 60rpx 40rpx;
	margin-top: 50rpx;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.user-icon {
	font-size: 120rpx;
	margin-bottom: 30rpx;
}

.user-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 50rpx;
}

.language-section {
	text-align: left;
}

.section-title {
	font-size: 28rpx;
	color: #666;
	display: block;
	margin-bottom: 30rpx;
	text-align: center;
}

.language-options {
	display: flex;
	gap: 20rpx;
	justify-content: center;
}

.language-option {
	flex: 1;
	max-width: 200rpx;
	padding: 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 10rpx;
	text-align: center;
	transition: all 0.3s ease;
	cursor: pointer;
}

.language-option.active {
	border-color: #007aff;
	background-color: #007aff;
	color: white;
}

.language-option:not(.active):hover {
	border-color: #007aff;
	background-color: #f0f8ff;
}
</style>
