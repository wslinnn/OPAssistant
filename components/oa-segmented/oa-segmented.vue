<template>
	<view :class="['oa-seg', equal ? 'oa-seg--equal' : '']">
		<view
			v-for="opt in options"
			:key="opt.value"
			:class="['oa-seg__item', isActive(opt) ? 'oa-seg__item--active' : '']"
			@click="select(opt)"
		>{{ opt.label }}</view>
	</view>
</template>

<script>
// 分段控件：凹陷容器(sunken) + 凸起 active(surface+shadow+brand)
// options:[{value,label}]，equal=true 时各项等宽(device_list HTTP/HTTPS)
export default {
	name: 'oa-segmented',
	props: {
		value: { type: [Number, String, Boolean], default: '' },
		options: { type: Array, default: () => [] },
		equal: { type: Boolean, default: false }
	},
	methods: {
		isActive(opt) {
			return this.value === opt.value
		},
		select(opt) {
			this.$emit('input', opt.value)
			this.$emit('change', opt.value)
		}
	}
}
</script>

<style scoped lang="scss">
.oa-seg {
	display: flex;
	flex-wrap: wrap;
	gap: $oa-sp-1;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-lg;
	padding: $oa-sp-1;
}
.oa-seg__item {
	padding: $oa-sp-1 $oa-sp-2;
	border-radius: $oa-radius-md;
	font-size: $oa-fs-body;
	color: $oa-text-muted;
	transition: all 0.2s;
}
.oa-seg__item--active {
	background: $oa-surface;
	color: $oa-brand;
	font-weight: 600;
	box-shadow: $oa-shadow-sm;
}
.oa-seg--equal .oa-seg__item {
	flex: 1;
	text-align: center;
}
</style>
