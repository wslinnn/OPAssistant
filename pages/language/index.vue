<template>
	<view class="container">
		<oa-card padding="lg">
			<view class="language-title-row">
				<view class="language-icon-wrap">
					<text class="language-icon-text">文A</text>
				</view>
				<text class="section-title">{{ $t('device_list.language_settings') }}</text>
			</view>

			<view class="select-row">
				<text class="select-label">{{ $t('language.current_language') }}</text>
				<picker class="language-picker" :range="languageList" range-key="label" :value="languageIndex" @change="onLanguageChange">
					<view class="picker-inner">
						<text class="picker-text">{{ languageList[languageIndex].label }}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
		</oa-card>
	</view>
</template>

<script>
	import I18nUtils from '@/utils/i18n.js'

	export default {
		data() {
			return {
				currentLanguage: 'zh-Hans',
				languageList: [
					{ value: 'zh-Hans', label: '中文' },
					{ value: 'en', label: 'English' }
				]
			}
		},
		computed: {
			languageIndex() {
				const idx = this.languageList.findIndex(e => e.value === this.currentLanguage)
				return idx >= 0 ? idx : 0
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.$t('device_list.language_settings')
			})
			this.currentLanguage = I18nUtils.getCurrentLanguage()
		},
		methods: {
			onLanguageChange(e) {
				const idx = Number(e.detail.value)
				const item = this.languageList[idx]
				if (item && item.value !== this.currentLanguage) {
					this.switchLanguage(item.value)
				}
			},
			switchLanguage(locale) {
				if (locale === this.currentLanguage) return
				try {
					const success = I18nUtils.switchLanguage(locale)
					if (success) {
						this.currentLanguage = locale
						uni.showToast({
							title: this.$t('language.switch_success'),
							icon: 'success',
							duration: 2000
						})
						setTimeout(() => {
							// reLaunch 回首页:home.onLoad 刷新底部 tabBar,各页 %key% 标题按新 locale 重新解析(方案 B)
							uni.reLaunch({ url: '/pages/device/home' })
						}, 1500)
					}
				} catch (error) {
					console.log('切换语言时出错:', error)
				}
			}
		}
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.language-title-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 28rpx;
	}

	.language-icon-wrap {
		width: 64rpx;
		height: 64rpx;
		border-radius: $oa-radius-lg;
		background: $oa-brand-subtle;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.language-icon-text {
		font-size: 26rpx;
		font-weight: 700;
		color: $oa-brand;
		letter-spacing: -1rpx;
	}

	.section-title {
		font-size: 34rpx;
		font-weight: 600;
		color: $oa-text;
	}

	.select-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 0;
	}

	.select-label {
		font-size: 30rpx;
		color: $oa-text;
		font-weight: 500;
	}

	.language-picker {
		flex: 1;
		margin-left: 24rpx;
		max-width: 280rpx;
	}

	.picker-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 24rpx;
		background: $oa-surface-sunken;
		border: 2rpx solid $oa-hairline;
		border-radius: $oa-radius-md;
	}

	.picker-text {
		font-size: 28rpx;
		color: $oa-text;
	}

	.picker-arrow {
		font-size: 20rpx;
		color: $oa-text-subtle;
		margin-left: 12rpx;
	}
</style>
