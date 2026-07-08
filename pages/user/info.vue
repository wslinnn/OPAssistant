<template>
	<view class="container">
		<oa-card padding="none">
			<view class="user-head">
				<view class="user-icon">👤</view>
				<text class="user-title">{{ $t('user_info.title') }}</text>
			</view>
		</oa-card>

		<oa-card padding="lg">
			<view class="lang-row" @click="goLanguage">
				<oa-list-row :label="$t('language.title')" :value="currentLanguageLabel" arrow :border="false" />
			</view>
		</oa-card>
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

	.user-head {
		padding: 60rpx 40rpx;
		text-align: center;
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

	.lang-row:active {
		opacity: 0.6;
	}
</style>
