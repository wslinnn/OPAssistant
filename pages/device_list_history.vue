<template>
	<view class="container">
		<oa-nav-header :title="$t('device_list.history_title')" />

		<oa-empty v-if="!groups.length" :text="$t('device_list.history_empty')" />

		<view v-for="g in groups" :key="g.name" class="hist-group">
			<text class="hist-group__title">{{ g.name }}</text>
			<oa-card v-for="d in g.devices" :key="d.id" padding="lg">
				<view class="hist-row" @click="pick(d)">
					<view class="hist-avatar">{{ initial(d.name) }}</view>
					<view class="hist-main">
						<text class="hist-account">{{ d.username }}</text>
						<text class="hist-addr">{{ d.ip }}</text>
					</view>
					<view class="hist-more" :aria-label="$t('device_list.edit')" @click.stop="openMenu(d)">⋮</view>
				</view>
			</oa-card>
		</view>

		<!-- 操作菜单 -->
		<uni-popup ref="menuPopup" type="bottom" :mask-click="true">
			<view class="hist-menu">
				<view class="hist-menu__item" @click="editCurrent">{{ $t('device_list.edit') }}</view>
				<view class="hist-menu__item hist-menu__item--danger" @click="deleteCurrent">{{ $t('device_list.delete') }}</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import DeviceManager from '@/utils/deviceManager.js'

	// 历史设备页:按设备名(备注)分组 + 首字母头像 + 账号/地址 + 三点(编辑/删除)。
	// 选/编辑 → reLaunch 登录页 ?editId(单页栈,免事件总线);删除 → 二次确认。
	export default {
		data() {
			return { current: null, _version: 0 }
		},
		computed: {
			groups() {
				void this._version  // 删除后 _version++ 触发重算
				const list = DeviceManager.getDeviceList()
				const map = {}
				const order = []
				list.forEach(d => {
					const k = d.name || 'OpenWrt'
					if (!map[k]) { map[k] = []; order.push(k) }
					map[k].push(d)
				})
				return order.map(k => ({ name: k, devices: map[k] }))
			}
		},
		methods: {
			initial(name) {
				const n = String(name || 'O').trim()
				return n ? n[0].toUpperCase() : 'O'
			},
			pick(d) {
				uni.reLaunch({ url: `/pages/device_list?editId=${d.id}` })
			},
			openMenu(d) {
				this.current = d
				this.$refs.menuPopup.open()
			},
			editCurrent() {
				this.$refs.menuPopup.close()
				if (this.current) uni.reLaunch({ url: `/pages/device_list?editId=${this.current.id}` })
			},
			deleteCurrent() {
				this.$refs.menuPopup.close()
				const id = this.current && this.current.id
				if (!id) return
				uni.showModal({
					title: this.$t('device_list.delete_confirm_title'),
					content: this.$t('device_list.delete_confirm_content'),
					success: (res) => {
						if (res.confirm) {
							DeviceManager.deleteDevice(id)
							this._version++
						}
					}
				})
			}
		}
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.hist-group {
		margin-bottom: $oa-sp-3;
	}
	.hist-group__title {
		display: block;
		font-size: $oa-fs-caption;
		color: $oa-text-muted;
		margin: $oa-sp-3 0 $oa-sp-2;
	}
	.hist-row {
		display: flex;
		align-items: center;
	}
	.hist-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 50%;
		background: $oa-brand-subtle;
		color: $oa-brand;
		font-size: $oa-fs-title;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: $oa-sp-2;
		flex-shrink: 0;
	}
	.hist-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.hist-account {
		font-size: $oa-fs-body;
		font-weight: 600;
		color: $oa-text;
	}
	.hist-addr {
		font-size: $oa-fs-caption;
		color: $oa-text-muted;
	}
	.hist-more {
		width: 64rpx;
		height: 64rpx;
		line-height: 64rpx;
		text-align: center;
		color: $oa-text-muted;
	}
	.hist-menu {
		background: $oa-surface;
		border-radius: $oa-radius-lg $oa-radius-lg 0 0;
		padding: $oa-sp-2;
	}
	.hist-menu__item {
		padding: $oa-sp-3;
		font-size: $oa-fs-body;
		color: $oa-text;
		border-bottom: 1rpx solid $oa-hairline;
	}
	.hist-menu__item--danger {
		color: $oa-text;
		font-weight: 600;
		border-bottom: none;
	}
</style>
