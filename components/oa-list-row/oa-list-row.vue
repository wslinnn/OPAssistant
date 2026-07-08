<template>
	<view :class="['oa-row', { 'oa-row--border': border }]">
		<text v-if="label" class="oa-row__label" :style="{ width: labelWidth }">{{ label }}</text>
		<view class="oa-row__value">
			<slot>
				<oa-copy-text v-if="copyable" class="oa-row__text" :text="String(value)">{{ value }}</oa-copy-text>
				<text v-else class="oa-row__text">{{ value }}</text>
			</slot>
		</view>
		<view v-if="arrow" class="oa-row__arrow" />
	</view>
</template>

<script>
// 通用 label-value 行：label 次文本 + value 主文本 + hairline 底边（可关）
export default {
	name: 'oa-list-row',
	props: {
		label: { type: String, default: '' },
		value: { type: [String, Number], default: '' },
		labelWidth: { type: String, default: '140rpx' },
		border: { type: Boolean, default: true },
		arrow: { type: Boolean, default: false },
		copyable: { type: Boolean, default: false }
	}
}
</script>

<style scoped lang="scss">
.oa-row {
	display: flex;
	align-items: flex-start;
	padding: $oa-sp-1 0;
}
.oa-row--border {
	border-bottom: 1rpx solid $oa-hairline;
}
.oa-row__label {
	flex-shrink: 0;
	font-size: $oa-fs-label;
	color: $oa-text-muted;
}
.oa-row__value {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}
.oa-row__text {
	font-size: $oa-fs-body;
	color: $oa-text;
	font-weight: 500;
	text-align: right;
}
.oa-row__arrow {
	flex-shrink: 0;
	width: 16rpx;
	height: 16rpx;
	border-top: 2rpx solid $oa-text-subtle;
	border-right: 2rpx solid $oa-text-subtle;
	transform: rotate(45deg);
	margin-left: $oa-sp-1;
}
</style>
