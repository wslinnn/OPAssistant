<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('device_list.connecting')" />

		<text v-if="groups.length" class="hist-hint">{{ $t('device_list.ping_hint') }}</text>
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
					<oa-ping-badge class="hist-ping" :level="pingOf(d).level" :text="pingOf(d).text" />
					<view class="hist-more" :aria-label="$t('device_list.edit')" @click.stop="openMenu(d)">
						<image class="hist-more__img" src="/static/more.png" mode="aspectFit" />
					</view>
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
	import UciRpc from '@/utils/uci-rpc.js'

	// 历史设备页:原生导航栏(标题+返回);按设备名分组 + 首字母头像 + ping 徽标 + 三点(编辑/删除)。
	// 点卡片 = 直接连接(reconnectDevice);三点编辑 = 登录页 editId;删除 = 二次确认。
	// ping:HTTP 探测,并行;下拉刷新重 ping。
	export default {
		data() {
			return { groups: [], current: null, pings: {}, loading: false }
		},
		onLoad() {
			uni.setNavigationBarTitle({ title: this.$t('device_list.history_title') })
		},
		onShow() {
			this.load()
			this.pingAll()
		},
		onPullDownRefresh() {
			this.pingAll().then(() => uni.stopPullDownRefresh())
		},
		methods: {
			load() {
				const list = DeviceManager.getDeviceList()
				const map = {}
				const order = []
				list.forEach(d => {
					const k = d.name || 'OpenWrt'
					if (!map[k]) { map[k] = []; order.push(k) }
					map[k].push(d)
				})
				this.groups = order.map(k => ({ name: k, devices: map[k] }))
			},
			async pingAll() {
				const all = DeviceManager.getDeviceList()
				await Promise.all(all.map(d => {
					this.$set(this.pings, d.id, undefined)  // 先标“检测中”
					return DeviceManager.pingDevice(d).then(ms => {
						this.$set(this.pings, d.id, ms)
					})
				}))
			},
			pingOf(d) {
				const v = this.pings[d.id]
				if (v === undefined) return { level: 'checking', text: this.$t('device_list.ping_checking') }
				if (v === null) return { level: 'offline', text: this.$t('device_list.ping_offline') }
				return { level: DeviceManager.pingLevel(v), text: v + 'ms' }
			},
			initial(name) {
				const n = String(name || 'O').trim()
				return n ? n[0].toUpperCase() : 'O'
			},
			// 点卡片:直接连接
			async pick(d) {
				this.loading = true
				const r = await UciRpc.reconnectDevice(d)
				this.loading = false
				if (r.success) {
					uni.reLaunch({ url: '/pages/device/home' })
				} else {
					// 连不上 → 登录页编辑该设备(改凭据/地址)
					uni.reLaunch({ url: `/pages/device_list?editId=${d.id}` })
				}
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
							this.load()
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
	.hist-hint {
		display: block;
		font-size: $oa-fs-caption;
		color: $oa-text-muted;
		line-height: 1.4;
		margin-bottom: $oa-sp-1;
	}
	.hist-row {
		display: flex;
		align-items: center;
		transition: opacity 0.15s ease;
	}
	.hist-row:active {
		opacity: 0.7;
	}
	.hist-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: $oa-radius-full;
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
	.hist-ping {
		flex-shrink: 0;
		margin-right: $oa-sp-2;
	}
	.hist-more {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80rpx;
		height: 80rpx;
		transition: opacity 0.15s ease;
	}
	.hist-more:active {
		opacity: 0.5;
	}
	.hist-more__img {
		width: 36rpx;
		height: 36rpx;
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
		transition: background-color 0.15s ease;
	}
	.hist-menu__item:active {
		background: $oa-surface-sunken;
	}
	.hist-menu__item--danger {
		color: $oa-danger;
		font-weight: 600;
		border-bottom: none;
	}
</style>
