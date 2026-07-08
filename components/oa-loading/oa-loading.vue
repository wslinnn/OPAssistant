<template>
	<view v-if="overlay" class="oa-loading__mask">
		<view class="oa-loading__box">
			<view class="oa-loading__spinner" :style="spinStyle" />
			<text v-if="text" class="oa-loading__text">{{ text }}</text>
		</view>
	</view>
	<view v-else class="oa-loading__inline">
		<view class="oa-loading__spinner" :style="spinStyle" />
		<text v-if="text" class="oa-loading__text">{{ text }}</text>
	</view>
</template>

<script>
// 统一 loading：spinner 主色。overlay=true 带遮罩。@keyframes 全工程唯一定义于此
export default {
	name: 'oa-loading',
	props: {
		overlay: { type: Boolean, default: false },
		size: { type: String, default: '60rpx' },
		text: { type: String, default: '' }
	},
	computed: {
		spinStyle() {
			const bw = Math.max(2, Math.round(parseInt(this.size) / 15))
			return `width:${this.size};height:${this.size};border-width:${bw}rpx;`
		}
	}
}
</script>

<style scoped lang="scss">
.oa-loading__mask {
	position: fixed;
	left: 0; top: 0; right: 0; bottom: 0;
	background: $oa-scrim;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}
.oa-loading__box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: $oa-sp-2;
	padding: $oa-sp-4;
	border-radius: $oa-radius-2xl;
	background: $oa-surface;
	box-shadow: $oa-shadow-lg;
}
.oa-loading__inline {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: $oa-sp-1;
	padding: $oa-sp-3;
}
.oa-loading__spinner {
	border-style: solid;
	border-color: $oa-brand;
	border-top-color: transparent;
	border-radius: 50%;
	animation: oa-loading-spin 0.8s linear infinite;
}
.oa-loading__text {
	font-size: $oa-fs-body;
	color: $oa-text-muted;
}
@keyframes oa-loading-spin { to { transform: rotate(360deg); } }
</style>
