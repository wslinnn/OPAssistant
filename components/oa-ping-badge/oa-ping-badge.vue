<template>
	<view :class="['ping-badge', `ping-badge--${level}`]">
		<view class="ping-badge__dot" />
		<text class="ping-badge__text">{{ text }}</text>
	</view>
</template>

<script>
	// 延迟徽标:彩色圆点(传档位颜色)+ 可读文字(ms 数值/离线/检测中)。
	// level: fast(<100ms) / ok(<300ms) / slow(≥300ms) / offline / checking
	// 文字一律 ink-muted(保证对比度),颜色信号由圆点承担,避免小字红/黄踩对比度线。
	export default {
		name: 'oa-ping-badge',
		props: {
			level: { type: String, default: 'checking' },
			text: { type: String, default: '' }
		}
	}
</script>

<style scoped lang="scss">
	.ping-badge {
		display: inline-flex;
		align-items: center;
		gap: 6rpx;
	}
	.ping-badge__dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: $oa-text-subtle;
		flex-shrink: 0;
	}
	.ping-badge__text {
		font-size: $oa-fs-caption;
		color: $oa-text-muted;
	}
	.ping-badge--fast .ping-badge__dot {
		background: $oa-success;
	}
	.ping-badge--ok .ping-badge__dot {
		background: $oa-warning;
	}
	.ping-badge--slow .ping-badge__dot {
		background: $oa-danger;
	}
	.ping-badge--offline .ping-badge__dot,
	.ping-badge--checking .ping-badge__dot {
		background: $oa-text-subtle;
	}
</style>
