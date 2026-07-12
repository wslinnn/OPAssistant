<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />
		<oa-empty v-else-if="loadError" :text="$t('toolbox.load_failed')" />

		<view v-else>
			<!-- WiFi：每 radio 一行 -->
			<oa-card v-if="radios.length" padding="none">
				<view v-for="r in radios" :key="r.name" class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ r.label }}</text>
						<text class="tb-row-sub">{{ r.on ? $t('toolbox.toggle_on') : $t('toolbox.toggle_off') }}</text>
					</view>
					<oa-switch :value="r.on" :disabled="r.busy" @input="toggleWifi(r)" />
				</view>
			</oa-card>

			<!-- IPv6(仅关 LAN 侧分发) -->
			<oa-card v-if="ipv6.available" padding="none">
				<view class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ $t('toolbox.ipv6') }}</text>
						<text class="tb-row-sub">{{ $t('toolbox.ipv6_hint') }}</text>
					</view>
					<oa-switch :value="ipv6.on" :disabled="ipv6.busy" @input="toggleIpv6" />
				</view>
			</oa-card>

			<!-- 防火墙(高危:关闭需二次确认) -->
			<oa-card v-if="firewall.available" padding="none">
				<view class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ $t('toolbox.firewall') }}</text>
						<text class="tb-row-sub">{{ firewall.on ? $t('toolbox.toggle_on') : $t('toolbox.toggle_off') }}</text>
					</view>
					<oa-switch :value="firewall.on" :disabled="firewall.busy" @input="toggleFirewall" />
				</view>
			</oa-card>

			<!-- FullCone NAT(IPv4 / IPv6 独立) -->
			<oa-card v-if="fullcone.available || fullcone6.available" padding="none">
				<view v-if="fullcone.available" class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ $t('toolbox.fullcone') }}</text>
						<text class="tb-row-sub">{{ fullcone.on ? $t('toolbox.toggle_on') : $t('toolbox.toggle_off') }}</text>
					</view>
					<oa-switch :value="fullcone.on" :disabled="fullcone.busy" @input="toggleFullcone" />
				</view>
				<view v-if="fullcone6.available" class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ $t('toolbox.fullcone6') }}</text>
						<text class="tb-row-sub">{{ fullcone6.on ? $t('toolbox.toggle_on') : $t('toolbox.toggle_off') }}</text>
					</view>
					<oa-switch :value="fullcone6.on" :disabled="fullcone6.busy" @input="toggleFullcone6" />
				</view>
			</oa-card>

			<!-- UPnP(需 luci-app-upnp;无配置则整行隐藏) -->
			<oa-card v-if="upnp.available" padding="none">
				<view class="tb-row">
					<view class="tb-row-main">
						<text class="tb-row-title">{{ $t('toolbox.upnp') }}</text>
						<text class="tb-row-sub">{{ upnp.on ? $t('toolbox.toggle_on') : $t('toolbox.toggle_off') }}</text>
					</view>
					<oa-switch :value="upnp.on" :disabled="upnp.busy" @input="toggleUpnp" />
				</view>
			</oa-card>
		</view>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import DeviceManager from '@/utils/device-manager.js'

export default {
	data() {
		return {
			loading: true,
			loadError: false,
			radios: [],
			ipv6: { available: false, on: false, busy: false },
			firewall: { available: false, on: false, busy: false, section: '' },
			fullcone: { available: false, on: false, busy: false, section: '' },
			fullcone6: { available: false, on: false, busy: false, section: '' },
			upnp: { available: false, on: false, busy: false }
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('toolbox.title') })
		this.loadStates()
	},
	onPullDownRefresh() {
		Promise.resolve(this.loadStates()).finally(() => uni.stopPullDownRefresh())
	},
	methods: {
		async loadStates() {
			this.loading = true
			this.loadError = false
			try {
				await Promise.all([ this.probeWifi(), this.probeIpv6(), this.probeFirewall(), this.probeFullcone(), this.probeUpnp() ])
			} catch (e) {
				this.loadError = true
			} finally {
				this.loading = false
			}
		},
		async probeWifi() {
			try {
				const data = await UciRpc.get('wireless')
				const radios = []
				Object.keys(data).forEach(name => {
					const s = data[name]
					if (s && s['.type'] === 'wifi-device') {
						radios.push({
							name,
							section: s['.name'] || name,
							label: this.wifiLabel(s, name),
							on: s.disabled !== '1',
							busy: false
						})
					}
				})
				this.radios = radios
			} catch (e) {
				this.radios = []
			}
		},
		wifiLabel(s, name) {
			const hwmode = s.hwmode || ''
			const channel = parseInt(s.channel, 10)
			if (/a|ac|ax/.test(hwmode) || channel >= 36) return this.$t('toolbox.wifi_5g')
			if (/g|n|b/.test(hwmode) || (channel > 0 && channel <= 14)) return this.$t('toolbox.wifi_24g')
			return this.$t('toolbox.wifi_radio', { device: name })
		},
		toggleWifi(r) {
			if (r.busy) return
			const next = !r.on
			r.busy = true
			UciRpc.set('wireless', r.section, { disabled: next ? '1' : '0' })
				.then(() => UciRpc.commit('wireless'))
				.then(() => UciRpc.callUbus('file', 'exec', { command: '/sbin/wifi', params: ['reload'] }, 12000))
				.then(() => {
					r.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { r.busy = false })
		},
		async probeIpv6() {
			try {
				const data = await UciRpc.get('dhcp')
				const lan = data.lan
				if (lan && lan['.type'] === 'dhcp') {
					this.ipv6.available = true
					this.ipv6.on = lan.ra !== 'disabled'
				}
			} catch (e) {
				this.ipv6.available = false
			}
		},
		toggleIpv6() {
			if (this.ipv6.busy) return
			const next = !this.ipv6.on
			const device = DeviceManager.getCurrentDevice()
			const backupKey = 'ipv6_backup_' + (device && device.id ? device.id : 'default')
			this.ipv6.busy = true
			const task = next ? this.enableIpv6(backupKey) : this.disableIpv6(backupKey)
			task
				.then(() => {
					this.ipv6.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { this.ipv6.busy = false })
		},
		async disableIpv6(backupKey) {
			const data = await UciRpc.get('dhcp')
			const lan = data.lan || {}
			// 按设备备份原 ra 值,供恢复(规避 rpcd option-delete,故只切 ra)
			uni.setStorageSync(backupKey, JSON.stringify({ ra: lan.ra || '' }))
			await UciRpc.set('dhcp', 'lan', { ra: 'disabled' })
			await UciRpc.commit('dhcp')
			await UciRpc.apply('odhcpd', 'restart')
		},
		async enableIpv6(backupKey) {
			let ra = 'hybrid'
			try {
				const raw = uni.getStorageSync(backupKey)
				if (raw) {
					const backup = JSON.parse(raw)
					if (backup.ra && backup.ra !== 'disabled') ra = backup.ra
				}
			} catch (e) {}
			await UciRpc.set('dhcp', 'lan', { ra })
			await UciRpc.commit('dhcp')
			await UciRpc.apply('odhcpd', 'restart')
		},
		async probeFirewall() {
			try {
				const data = await UciRpc.get('firewall')
				const defaults = Object.keys(data).map(k => data[k]).find(s => s && s['.type'] === 'defaults')
				if (defaults) {
					this.firewall.available = true
					this.firewall.on = defaults.enabled !== '0'
					this.firewall.section = defaults['.name']
				}
			} catch (e) {
				this.firewall.available = false
			}
		},
		toggleFirewall() {
			if (this.firewall.busy) return
			const next = !this.firewall.on
			if (!next) {
				// 关闭防火墙 = 高危:二次确认 + 风险提示(远程可能失联,但有 rollback 兜底)
				uni.showModal({
					title: this.$t('toolbox.firewall'),
					content: this.$t('toolbox.firewall_risk'),
					confirmColor: '#ff3b30',
					success: (res) => { if (res.confirm) this.doToggleFirewall(next) }
				})
				return
			}
			this.doToggleFirewall(next)
		},
		doToggleFirewall(next) {
			this.firewall.busy = true
			UciRpc.set('firewall', this.firewall.section, { enabled: next ? '1' : '0' })
				.then(() => UciRpc.commit('firewall'))
				.then(() => UciRpc.apply('firewall', 'reload'))
				.then(() => {
					this.firewall.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { this.firewall.busy = false })
		},
		async probeFullcone() {
			try {
				const data = await UciRpc.get('firewall')
				const defaults = Object.keys(data).map(k => data[k]).find(s => s && s['.type'] === 'defaults')
				if (defaults) {
					const section = defaults['.name']
					if (defaults.fullcone !== undefined) {
						this.fullcone.available = true
						this.fullcone.on = defaults.fullcone === '1'
						this.fullcone.section = section
					}
					if (defaults.fullcone6 !== undefined) {
						this.fullcone6.available = true
						this.fullcone6.on = defaults.fullcone6 === '1'
						this.fullcone6.section = section
					}
				}
			} catch (e) {
				// 两者保持 available:false
			}
		},
		toggleFullcone() {
			if (this.fullcone.busy) return
			const next = !this.fullcone.on
			this.fullcone.busy = true
			UciRpc.set('firewall', this.fullcone.section, { fullcone: next ? '1' : '0' })
				.then(() => UciRpc.commit('firewall'))
				.then(() => UciRpc.apply('firewall', 'reload'))
				.then(() => {
					this.fullcone.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { this.fullcone.busy = false })
		},
		toggleFullcone6() {
			if (this.fullcone6.busy) return
			const next = !this.fullcone6.on
			this.fullcone6.busy = true
			UciRpc.set('firewall', this.fullcone6.section, { fullcone6: next ? '1' : '0' })
				.then(() => UciRpc.commit('firewall'))
				.then(() => UciRpc.apply('firewall', 'reload'))
				.then(() => {
					this.fullcone6.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { this.fullcone6.busy = false })
		},
		async probeUpnp() {
			try {
				await UciRpc.get('upnpd')   // config 不存在 → 抛 → 隐藏该行
				let on = true
				try {
					// /etc/init.d/miniupnpd enabled:exit 0=已启用(固定命令,无注入面,直走 callUbus 读探针)
					const r = await UciRpc.callUbus('file', 'exec', { command: '/etc/init.d/miniupnpd', params: ['enabled'] }, 5000)
					on = !!(r && r.code === 0)
				} catch (e) { on = true }
				this.upnp.available = true
				this.upnp.on = on
			} catch (e) {
				this.upnp.available = false
			}
		},
		toggleUpnp() {
			if (this.upnp.busy) return
			const next = !this.upnp.on
			this.upnp.busy = true
			const task = next
				? UciRpc.apply('miniupnpd', 'enable').then(() => UciRpc.apply('miniupnpd', 'start'))
				: UciRpc.apply('miniupnpd', 'stop').then(() => UciRpc.apply('miniupnpd', 'disable'))
			task
				.then(() => {
					this.upnp.on = next
					uni.showToast({ title: this.$t('toolbox.switch_success'), icon: 'success' })
				})
				.catch(() => uni.showToast({ title: this.$t('toolbox.switch_failed'), icon: 'none' }))
				.finally(() => { this.upnp.busy = false })
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.tb-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
}
.tb-row:last-child {
	border-bottom: none;
}
.tb-row-main {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	gap: 4rpx;
	margin-right: $oa-sp-2;
}
.tb-row-title {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
}
.tb-row-sub {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
</style>
