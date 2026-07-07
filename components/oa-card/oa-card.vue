<template>
	<view :class="['oa-card', padClass]">
		<view v-if="title || subtitle || $slots.header || $slots.actions" class="oa-card__head">
			<slot name="header">
				<view class="oa-card__titlewrap">
					<text v-if="title" class="oa-card__title">{{ title }}</text>
					<text v-if="subtitle" class="oa-card__subtitle">{{ subtitle }}</text>
				</view>
			</slot>
			<view v-if="$slots.actions" class="oa-card__actions">
				<slot name="actions" />
			</view>
		</view>
		<view class="oa-card__body">
			<slot />
		</view>
	</view>
</template>

<script>
// 通用卡片：surface 底 + radius-lg + shadow-md。padding 可调
export default {
	name: 'oa-card',
	props: {
		title: { type: String, default: '' },
		subtitle: { type: String, default: '' },
		padding: { type: String, default: 'lg' } // lg / md / sm / none
	},
	computed: {
		padClass() { return `oa-card--pad-${this.padding}` }
	}
}
</script>

<style scoped>
.oa-card {
	background: $oa-surface;
	border-radius: $oa-radius-lg;
	box-shadow: $oa-shadow-md;
	box-sizing: border-box;
}
.oa-card--pad-lg { padding: $oa-sp-3; }
.oa-card--pad-md { padding: $oa-sp-2; }
.oa-card--pad-sm { padding: $oa-sp-1; }
.oa-card--pad-none { padding: 0; }

.oa-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: $oa-sp-2;
}
.oa-card__titlewrap {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}
.oa-card__title {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
}
.oa-card__subtitle {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
	margin-top: 4rpx;
}
.oa-card__actions {
	flex-shrink: 0;
}
</style>
