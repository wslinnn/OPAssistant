<template>
	<view
		:class="['oa-btn', `oa-btn--${type}`, `oa-btn--${size}`, { 'oa-btn--block': block, 'oa-btn--round': round, 'oa-btn--disabled': disabled || loading }]"
		@click="onClick"
	>
		<view v-if="loading" class="oa-btn__spinner" />
		<slot />
	</view>
</template>

<script>
// 通用按钮四档：primary(主色实心) / positive(主色软底) / negative(危险软底) / neutral(中性)
export default {
	name: 'oa-button',
	props: {
		type: { type: String, default: 'primary' },   // primary/positive/negative/neutral
		size: { type: String, default: 'normal' },     // normal/small
		block: { type: Boolean, default: false },      // 撑满宽度
		round: { type: Boolean, default: false },      // 胶囊
		disabled: { type: Boolean, default: false },
		loading: { type: Boolean, default: false }
	},
	methods: {
		onClick(e) {
			if (this.disabled || this.loading) return
			this.$emit('click', e)
		}
	}
}
</script>

<style scoped lang="scss">
.oa-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: $oa-sp-1;
	border-radius: $oa-radius-xl;
	font-size: $oa-fs-body;
	font-weight: 500;
	line-height: 1.2;
	transition: transform 0.15s ease, background 0.15s ease;
}
.oa-btn:active { transform: scale(0.95); }
.oa-btn--normal { padding: $oa-sp-2 $oa-sp-3; }
.oa-btn--small { padding: $oa-sp-1 $oa-sp-2; font-size: $oa-fs-caption; }
.oa-btn--block { display: flex; width: 100%; }
.oa-btn--round { border-radius: $oa-radius-full; }
.oa-btn--disabled { opacity: 0.4; }

.oa-btn--primary { background: $oa-brand; color: $oa-on-brand; }
.oa-btn--positive { background: $oa-brand-subtle; color: $oa-brand; }
.oa-btn--negative { background: $oa-danger-surface; color: $oa-danger; }
.oa-btn--neutral { background: $oa-surface-sunken; color: $oa-text; }

.oa-btn__spinner {
	width: 28rpx;
	height: 28rpx;
	border: 3rpx solid currentColor;
	border-top-color: transparent;
	border-radius: 50%;
	animation: oa-btn-spin 0.8s linear infinite;
}
@keyframes oa-btn-spin { to { transform: rotate(360deg); } }
</style>
