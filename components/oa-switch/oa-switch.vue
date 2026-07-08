<template>
	<view :class="['oa-switch', { 'oa-switch--on': value, 'oa-switch--disabled': disabled }]" @click="toggle">
		<view class="oa-switch__thumb" />
	</view>
</template>

<script>
// 通用开关：关=弱灰底，开=主色底，圆点滑动。v-model 绑定 boolean。
// 自建以保证 app-plus/H5 样式一致（原生 <switch> 不可控）
export default {
	name: 'oa-switch',
	props: {
		value: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false }
	},
	methods: {
		toggle() {
			if (this.disabled) return
			this.$emit('input', !this.value)
			this.$emit('change', !this.value)
		}
	}
}
</script>

<style scoped lang="scss">
.oa-switch {
	position: relative;
	width: 88rpx;
	height: 52rpx;
	border-radius: $oa-radius-full;
	background: $oa-text-subtle;
	transition: background 0.2s ease;
	flex-shrink: 0;
	box-sizing: border-box;
}
.oa-switch--on {
	background: $oa-brand;
}
.oa-switch--disabled {
	opacity: 0.4;
}
.oa-switch__thumb {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	background: $oa-surface;
	box-shadow: $oa-shadow-sm;
	transition: transform 0.2s ease;
}
.oa-switch--on .oa-switch__thumb {
	transform: translateX(36rpx);
}
</style>
