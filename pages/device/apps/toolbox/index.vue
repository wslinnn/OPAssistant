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
		</view>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import DeviceManager from '@/utils/deviceManager.js'

export default {
	data() {
		return {
			loading: true,
			loadError: false,
			radios: [],
			ipv6: { available: false, on: false, busy: false },
			firewall: { available: false, on: false, busy: false, section: '' },
			fullcone: { available: false, on: false, busy: false, section: '', has6: false },
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
				await Promise.all([ this.probeWifi(), this.probeIpv6() ])
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
