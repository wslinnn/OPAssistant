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
				await Promise.all([ this.probeWifi() ])
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
