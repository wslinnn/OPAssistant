<template>
	<view :class="['oa-badge', `oa-badge--${type}`]">
		<slot>{{ text }}</slot>
	</view>
</template>

<script>
// 状态徽标：软色配方（X-surface 底 + text-X 字）。type: up/down/info/warn/neutral
export default {
	name: 'oa-status-badge',
	props: {
		type: { type: String, default: 'info' }, // up/down/info/warn/neutral
		text: { type: String, default: '' }
	}
}
</script>

<style scoped lang="scss">
.oa-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4rpx $oa-sp-2;
	border-radius: $oa-radius-full;
	font-size: $oa-fs-caption;
	font-weight: 600;
	line-height: 1.4;
}
.oa-badge--up { background: $oa-success-surface; color: $oa-success; }
.oa-badge--down { background: $oa-danger-surface; color: $oa-danger; }
.oa-badge--info { background: $oa-brand-subtle; color: $oa-brand; }
.oa-badge--warn { background: $oa-warning-surface; color: $oa-warning; }
.oa-badge--neutral { background: $oa-surface-sunken; color: $oa-text-muted; }
</style>
