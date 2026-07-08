<template>
	<view class="page-tab">
		<view
			v-for="(tab, index) in tabs"
			:key="index"
			:class="['tab', is_active(tab, index) ? 'active' : '']"
			@click="handle_tab_click(tab, index)"
		>{{ tab.label }}</view>
	</view>
</template>

<script>
	// 通用子页签组件（从 v1.0.12 bundle bc5f 模块还原）
	// 用法：<page-tab :tabs="tab_list" v-model="currentTab" @change="onTabChange">
	// tabs: [{value: 0, label: '...'}, ...]
	export default {
		name: 'page_tab',
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
	.page-tab {
		display: flex;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 12rpx;
		margin: 20rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	}
	.tab {
		flex: 1;
		text-align: center;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;
		border-bottom: 4rpx solid transparent;
		transition: all 0.2s;
	}
	.tab.active {
		color: #007aff;
		font-weight: 600;
		border-bottom-color: #007aff;
	}
</style>
