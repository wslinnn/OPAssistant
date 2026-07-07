<template>
	<view v-if="visible" class="uni-popup" :class="'uni-popup--' + type" @click="onMaskClick">
		<view class="uni-popup__box" :class="'is-' + type" @click.stop>
			<slot />
		</view>
	</view>
</template>

<script>
	// 最小化 uni-popup 还原（v1.0.12 bundle 38c0 模块）
	// 仅覆盖本工程用到的能力：type(center/top/bottom) 定位 + mask-click 遮罩点击 + open()/close()/toggle()
	// 动画已简化为无；如需官方完整过渡动画，可用 DCloud uni-ui 的 uni-popup 直接替换（API 一致，easycom 自动解析）
	export default {
		name: 'uniPopup',
		props: {
			type: {
				type: String,
				default: 'center'
			},
			maskClick: {
				type: Boolean,
				default: true
			}
		},
		data() {
			return {
				visible: false
			}
		},
		methods: {
			open() {
				this.visible = true
			},
			close() {
				this.visible = false
			},
			toggle() {
				this.visible = !this.visible
			},
			onMaskClick() {
				if (this.maskClick) {
					this.close()
				}
			}
		}
	}
</script>

<style scoped>
	.uni-popup {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
	}
	.uni-popup--center {
		align-items: center;
		justify-content: center;
	}
	.uni-popup--top {
		align-items: flex-start;
		justify-content: center;
	}
	.uni-popup--bottom {
		align-items: flex-end;
		justify-content: center;
	}
	.uni-popup__box {
		background: transparent;
	}
	.uni-popup__box.is-top,
	.uni-popup__box.is-bottom {
		width: 100%;
	}
</style>
