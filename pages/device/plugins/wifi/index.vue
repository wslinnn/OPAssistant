<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-empty v-if="radios.length === 0" :text="$t('wifi.no_radio')" />

			<oa-card v-for="radio in radios" :key="radio['.name']" padding="none">
				<view class="radio-head">
					<view class="radio-head__main">
						<view class="radio-head__title">
							<text class="radio-name">{{ radio['.name'] }}</text>
							<oa-status-badge :type="branchType(radio) === 'mtk' ? 'info' : 'up'" :text="branchText(radio)" />
						</view>
						<text class="radio-sub">{{ radioBand(radio) }} · {{ $t('wifi.channel') }} {{ radio.channel || 'auto' }} · {{ radio.htmode || '-' }}</text>
					</view>
					<view class="radio-head__actions">
						<oa-button type="neutral" size="small" :loading="restarting === radio['.name']" @click="restart(radio)">{{ $t('wifi.restart') }}</oa-button>
						<view @click.stop=""><oa-switch :value="radioEnabled(radio)" @input="toggleRadio(radio, $event)" /></view>
					</view>
				</view>

				<view class="radio-body">
					<view class="radio-op">
						<oa-button type="positive" size="small" @click="editRadio(radio)">{{ $t('wifi.radio_settings') }}</oa-button>
					</view>

					<view v-for="iface in ifacesOf(radio)" :key="iface['.name']" class="iface-block">
						<view class="iface-row" @click="editIface(iface)">
							<view class="iface-main">
								<text class="iface-ssid">{{ iface.ssid || $t('wifi.hidden_ssid') }}</text>
								<text class="iface-sub">{{ encText(iface) }}{{ iface.disabled === '1' ? ' · ' + $t('common.disabled') : '' }}</text>
							</view>
							<text class="iface-arrow">›</text>
						</view>
						<view v-if="branchType(radio) === 'mtk'" class="iface-mtk">
							<text class="iface-mtk-btn" @click="editMtk(iface)">{{ $t('wifi.mtk_advanced') }} ›</text>
						</view>
						<view v-for="c in clientsOf(iface)" :key="c.mac" class="client-row">
							<text class="client-mac">{{ c.mac }}</text>
							<text class="client-signal">{{ c.signal }} dBm</text>
							<text class="client-kick" @click.stop="kick(iface, c)">{{ $t('wifi.kick') }}</text>
						</view>
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list ref="radioEditor" config="wireless" section-type="wifi-device" :schema="radioSchema" :create-title="$t('wifi.radio_settings')" :edit-title="$t('wifi.radio_settings')" @saved="onSaved" />
		<oa-uci-list ref="ifaceEditor" config="wireless" section-type="wifi-iface" :schema="ifaceSchema" :create-title="$t('wifi.edit_ssid')" :edit-title="$t('wifi.edit_ssid')" @saved="onSaved" />
		<oa-uci-list ref="mtkEditor" config="wireless" section-type="wifi-iface" :schema="mtkSchema" :create-title="$t('wifi.mtk_advanced')" :edit-title="$t('wifi.mtk_advanced')" @saved="onSaved" />
	</view>
</template>

<script>
import Wireless from '@/utils/wireless.js'

export default {
	data() {
		return {
			loading: false,
			radios: [],
			ifaces: [],
			clients: {},
			restarting: '',
			kicking: ''
		}
	},
	computed: {
		htmodeOptions() {
			return [
				{ value: 'NOHT', label: 'Legacy' },
				{ value: 'HT20', label: 'HT20' },
				{ value: 'HT40', label: 'HT40' },
				{ value: 'VHT20', label: 'VHT20' },
				{ value: 'VHT40', label: 'VHT40' },
				{ value: 'VHT80', label: 'VHT80' },
				{ value: 'VHT160', label: 'VHT160' },
				{ value: 'HE20', label: 'HE20 (WiFi6)' },
				{ value: 'HE40', label: 'HE40' },
				{ value: 'HE80', label: 'HE80' },
				{ value: 'HE160', label: 'HE160' }
			]
		},
		encOptions() {
			return [
				{ value: 'none', label: this.$t('wifi.enc_none') },
				{ value: 'owe', label: 'OWE' },
				{ value: 'psk2', label: 'WPA2-PSK' },
				{ value: 'psk', label: 'WPA-PSK' },
				{ value: 'psk-mixed', label: 'WPA/WPA2' },
				{ value: 'sae', label: 'WPA3-SAE' },
				{ value: 'sae-mixed', label: 'WPA2/WPA3' }
			]
		},
		radioSchema() {
			return [
				{ key: 'channel', label: this.$t('wifi.channel'), type: 'text', placeholder: 'auto 或 1-196', group: 'radio', groupLabel: this.$t('wifi.g_radio') },
				{ key: 'htmode', label: this.$t('wifi.htmode'), type: 'select', options: this.htmodeOptions, group: 'radio' },
				{ key: 'txpower', label: this.$t('wifi.txpower'), type: 'text', placeholder: 'auto 或 dBm', group: 'radio' },
				{ key: 'country', label: this.$t('wifi.country'), type: 'text', placeholder: 'CN', group: 'radio' }
			]
		},
		ifaceSchema() {
			return [
				{ key: 'ssid', label: this.$t('wifi.ssid'), type: 'text', required: true, group: 'iface', groupLabel: this.$t('wifi.g_iface') },
				{ key: 'encryption', label: this.$t('wifi.encryption'), type: 'select', options: this.encOptions, default: 'psk2', group: 'iface' },
				{ key: 'key', label: this.$t('wifi.password'), type: 'password', depends: { key: 'encryption', value: ['psk', 'psk2', 'psk-mixed', 'sae', 'sae-mixed'] }, group: 'iface' },
				{ key: 'hidden', label: this.$t('wifi.hidden_ssid_opt'), type: 'switch', group: 'iface' },
				{ key: 'isolate', label: this.$t('wifi.isolate'), type: 'switch', group: 'iface' }
			]
		},
		mtkSchema() {
			// MTK 分支 AP 级特有开关（真实 uci key，源码 wireless-mtk.js 确认）
			return [
				{ key: 'mumimo_dl', label: 'MU-MIMO DL', type: 'switch', group: 'mtk', groupLabel: this.$t('wifi.g_mtk') },
				{ key: 'mumimo_ul', label: 'MU-MIMO UL', type: 'switch', group: 'mtk' },
				{ key: 'ofdma_dl', label: 'OFDMA DL (WiFi6)', type: 'switch', group: 'mtk' },
				{ key: 'ofdma_ul', label: 'OFDMA UL (WiFi6)', type: 'switch', group: 'mtk' },
				{ key: 'amsdu', label: 'A-MSDU', type: 'switch', group: 'mtk' },
				{ key: 'uapsd', label: 'U-APSD', type: 'switch', group: 'mtk' },
				{ key: 'ieee80211k', label: '802.11k', type: 'switch', group: 'mtk' },
				{ key: 'ieee80211r', label: '802.11r', type: 'switch', group: 'mtk' },
				{ key: 'autoba', label: 'Auto Block ACK', type: 'switch', group: 'mtk' },
				{ key: 'kicklow', label: this.$t('wifi.kicklow'), type: 'text', placeholder: '0', group: 'mtk' },
				{ key: 'assocthres', label: this.$t('wifi.assocthres'), type: 'text', placeholder: '0', group: 'mtk' },
				{ key: 'steeringthresold', label: this.$t('wifi.steeringthresold'), type: 'text', placeholder: '0', group: 'mtk' },
				{ key: 'steeringbssid', label: this.$t('wifi.steeringbssid'), type: 'dynamicList', group: 'mtk' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('wifi.title') })
		this.load()
	},
	methods: {
		async load() {
			this.loading = this.radios.length === 0
			try {
				const { radios, ifaces } = await Wireless.getStatus()
				this.radios = radios
				this.ifaces = ifaces
				this.loadClients(ifaces)
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadClients(ifaces) {
			const map = {}
			await Promise.all(ifaces.map(async (iface) => {
				map[iface['.name']] = await Wireless.getAssocList(iface.ifname)
			}))
			this.clients = map
		},
		branchType(radio) { return Wireless.detectBranch(radio) },
		branchText(radio) {
			return this.branchType(radio) === 'mtk' ? this.$t('wifi.branch_mtk') : this.$t('wifi.branch_std')
		},
		radioBand(radio) {
			const b = radio.band || (radio.iwinfo && radio.iwinfo.band) || ''
			return ({ '2g': '2.4 GHz', '5g': '5 GHz', '6g': '6 GHz', '60g': '60 GHz' })[b] || b || '-'
		},
		radioEnabled(radio) { return radio.disabled !== '1' },
		async toggleRadio(radio, on) {
			try {
				await Wireless.setRadioEnabled(radio['.name'], on)
				this.$set(radio, 'disabled', on ? '0' : '1')
			} catch (e) {
				// 失败不更新 disabled：oa-switch 由 :value=radioEnabled 驱动，自动恢复原状态，避免假性关闭
				uni.showToast({ title: this.$t('wifi.apply_failed'), icon: 'none' })
			}
		},
		async restart(radio) {
			this.restarting = radio['.name']
			try {
				await Wireless.restartRadio(radio['.name'])
				uni.showToast({ title: this.$t('wifi.restarting'), icon: 'success' })
			} catch (e) {
				uni.showToast({ title: this.$t('wifi.restart_failed'), icon: 'none' })
			} finally {
				this.restarting = ''
			}
		},
		ifacesOf(radio) { return this.ifaces.filter(i => i.device === radio['.name']) },
		encText(iface) {
			const o = this.encOptions.find(o => o.value === iface.encryption)
			return o ? o.label : (iface.encryption || this.$t('wifi.enc_none'))
		},
		clientsOf(iface) { return this.clients[iface['.name']] || [] },
		async kick(iface, c) {
			this.kicking = c.mac
			try {
				await Wireless.kickClient(iface.ifname, c.mac)
				uni.showToast({ title: this.$t('wifi.kicked'), icon: 'success' })
				this.$set(this.clients, iface['.name'], (this.clients[iface['.name']] || []).filter(x => x.mac !== c.mac))
			} catch (e) {
				uni.showToast({ title: this.$t('wifi.kick_failed'), icon: 'none' })
			} finally {
				this.kicking = ''
			}
		},
		editRadio(radio) { this.$refs.radioEditor.openEdit(radio) },
		editIface(iface) { this.$refs.ifaceEditor.openEdit(iface) },
		editMtk(iface) { this.$refs.mtkEditor.openEdit(iface) },
		onSaved() {
			this.load()
			uni.showModal({
				title: this.$t('wifi.apply_title'),
				content: this.$t('wifi.apply_warn'),
				confirmText: this.$t('wifi.apply'),
				cancelText: this.$t('common.cancel'),
				success: async (r) => {
					if (!r.confirm) return
					uni.showLoading({ title: this.$t('wifi.applying') })
					try {
						await Wireless.applyWireless()
						uni.hideLoading()
						uni.showToast({ title: this.$t('wifi.applied'), icon: 'success' })
					} catch (e) {
						uni.hideLoading()
						uni.showToast({ title: this.$t('wifi.apply_failed'), icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.radio-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-2 $oa-sp-3;
	border-bottom: 1rpx solid $oa-hairline;
	gap: $oa-sp-2;
}
.radio-head__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}
.radio-head__title {
	display: flex;
	align-items: center;
	gap: 8rpx;
}
.radio-name {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
}
.radio-sub {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.radio-head__actions {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
	flex-shrink: 0;
}
.radio-body {
	padding: $oa-sp-2 $oa-sp-3 $oa-sp-3;
}
.radio-op {
	margin-bottom: $oa-sp-2;
}
.iface-block {
	border-top: 1rpx solid $oa-hairline;
	padding-top: $oa-sp-2;
	margin-top: $oa-sp-2;
}
.iface-block:first-of-type {
	border-top: none;
	margin-top: 0;
	padding-top: 0;
}
.iface-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-1 0;
}
.iface-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2rpx;
}
.iface-ssid {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
}
.iface-sub {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.iface-arrow {
	color: $oa-text-subtle;
	font-size: $oa-fs-body;
}
.iface-mtk {
	margin-top: 8rpx;
}
.iface-mtk-btn {
	font-size: $oa-fs-caption;
	color: $oa-brand;
	font-weight: 600;
}
.client-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $oa-sp-1 $oa-sp-2;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	margin-top: 8rpx;
}
.client-mac {
	flex: 1;
	font-size: $oa-fs-caption;
	color: $oa-text;
}
.client-signal {
	margin: 0 $oa-sp-2;
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.client-kick {
	padding: 4rpx $oa-sp-2;
	font-size: $oa-fs-caption;
	color: $oa-danger;
}
</style>
