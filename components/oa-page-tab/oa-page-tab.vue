<template>
	<view class="oa-page-tab">
		<view
			v-for="(tab, index) in tabs"
			:key="index"
			:class="['oa-page-tab__item', is_active(tab, index) ? 'oa-page-tab__item--active' : '']"
			@click="handle_tab_click(tab, index)"
		>{{ tab.label }}</view>
	</view>
</template>

<script>
	// 通用子页签组件(easycom:<oa-page-tab :tabs="..." v-model="..." />)
	// tabs: [{value: 0, label: '...'}, ...]
	export default {
		name: 'oa-page-tab',
		props: {
			value: {
				type: [Number, String],
				default: 0
			},
			tabs: {
				type: Array,
				default: () => []
			}
		},
		methods: {
			get_tab_value(tab, index) {
				return tab.value !== undefined ? tab.value : index
			},
			is_active(tab, index) {
				return this.value === this.get_tab_value(tab, index)
			},
			handle_tab_click(tab, index) {
				const value = this.get_tab_value(tab, index)
				this.$emit('input', value)
				this.$emit('change', { value, index, item: tab })
			}
		}
	}
</script>

<style scoped lang="scss">
	.oa-page-tab {
		display: flex;
		background: $oa-surface;
		border-radius: $oa-radius-md;
		margin: $oa-sp-2;
		overflow: hidden;
		box-shadow: $oa-shadow-sm;
	}
	.oa-page-tab__item {
		flex: 1;
		text-align: center;
		padding: $oa-sp-2 0;
		font-size: $oa-fs-body;
		color: $oa-text-muted;
		border-radius: $oa-radius-md;
		transition: all 0.2s;
	}
	.oa-page-tab__item--active {
		color: $oa-brand;
		font-weight: 600;
		background: $oa-brand-subtle;
	}
</style>
