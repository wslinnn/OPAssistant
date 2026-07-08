<template>
	<view class="container">
		<view class="user-card">
			<view class="user-icon">👤</view>
			<text class="user-title">{{ $t('user_info.title') }}</text>
		</view>

		<view class="settings-card">
			<view class="lang-row" @click="goLanguage">
				<oa-list-row :label="$t('language.title')" :value="currentLanguageLabel" arrow :border="false" />
			</view>
		</view>
	</view>
</template>

<script>
	import I18nUtils from '@/utils/i18n.js'

	export default {
		computed: {
			currentLanguageLabel() {
				const locale = I18nUtils.getCurrentLanguage()
				return locale === 'zh-Hans' ? this.$t('language.chinese') : this.$t('language.english')
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.$t('user_info.title')
			})
		},
		methods: {
			goLanguage() {
				uni.navigateTo({
					url: '/pages/language/index'
				})
			}
		}
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.container {
		min-height: 100vh;
		background: $oa-bg;
		padding: $oa-sp-2;
	}

	.user-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 60rpx 40rpx;
		margin-top: 50rpx;
		text-align: center;
		box-shadow: $oa-shadow-md;
	}

	.user-icon {
		font-size: 120rpx;
		margin-bottom: 30rpx;
	}

	.user-title {
		font-size: 36rpx;
		font-weight: bold;
		color: $oa-text;
		display: block;
	}

	.settings-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 24rpx 40rpx;
		margin-top: 30rpx;
		box-shadow: $oa-shadow-md;
	}

	.lang-row:active {
		opacity: 0.6;
	}
</style>
