<template>
	<view class="oa-empty">
		<image v-if="icon" :src="icon" mode="aspectFit" class="oa-empty__icon" />
		<text class="oa-empty__text">{{ text }}</text>
		<slot />
	</view>
</template>

<script>
// 统一空态：居中次文本 + 可选图标 + 可附加操作（slot）
export default {
	name: 'oa-empty',
	props: {
		text: { type: String, default: '' },
		icon: { type: String, default: '' }
	}
}
</script>

<style scoped lang="scss">
.oa-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: $oa-sp-5 $oa-sp-3;
}
.oa-empty__icon {
	width: 120rpx;
	height: 120rpx;
	margin-bottom: $oa-sp-2;
}
.oa-empty__text {
	font-size: $oa-fs-body;
	color: $oa-text-muted;
	text-align: center;
}
</style>
