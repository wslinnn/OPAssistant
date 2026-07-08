<template>
	<view class="oa-copy" @longpress="onCopy"><text><slot>{{ text }}</slot></text></view>
</template>

<script>
// 长按复制文本：view 承载 @longpress(各平台一致可靠, text longpress 易被系统选中手势拦截), 内 text 显示
// 用法：<oa-copy-text :text="完整值" :copy="可复制值">显示文本</oa-copy-text>
export default {
	name: 'oa-copy-text',
	props: {
		text: { type: String, default: '' },
		copy: { type: String, default: '' }
	},
	methods: {
		onCopy() {
			const data = this.copy || this.text || ''
			if (!data) return
			uni.setClipboardData({
				data,
				success: () => {
					uni.showToast({ title: this.$t('common.copied'), icon: 'none' })
				}
			})
		}
	}
}
</script>

<style scoped lang="scss">
/* 继承父样式，无自定义 */
</style>
