<template>
	<view class="oa-nav">
		<view class="oa-nav__bar">
			<view v-if="showBack" class="oa-nav__back" @click="onBack">
				<image src="/static/back.png" mode="aspectFit" class="oa-nav__back-icon" />
			</view>
			<view v-else class="oa-nav__placeholder" />
			<text class="oa-nav__title">{{ title }}</text>
			<view class="oa-nav__right">
				<slot name="right" />
			</view>
		</view>
	</view>
</template>

<script>
// 自绘导航头：状态栏占位 + 返回 + 标题 + 右侧操作槽。配合 pages.json navigationStyle:custom
export default {
	name: 'oa-nav-header',
	props: {
		title: { type: String, default: '' },
		showBack: { type: Boolean, default: true }
	},
	methods: {
		onBack() {
			this.$emit('back')
			uni.navigateBack({ delta: 1, fail: () => {
				uni.switchTab({ url: '/pages/device/home' })
			}})
		}
	}
}
</script>

<style scoped lang="scss">
.oa-nav {
	padding-top: var(--status-bar-height);
	background: $oa-bg;
}
.oa-nav__bar {
	position: relative;
	display: flex;
	align-items: center;
	height: 88rpx;
	padding: 0 $oa-sp-2;
}
.oa-nav__back, .oa-nav__placeholder {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.oa-nav__back:active { transform: scale(0.92); }
.oa-nav__back-icon {
	width: 40rpx;
	height: 40rpx;
}
.oa-nav__title {
	position: absolute;
	left: 120rpx;
	right: 120rpx;
	text-align: center;
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
.oa-nav__right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: $oa-sp-1;
}
</style>
