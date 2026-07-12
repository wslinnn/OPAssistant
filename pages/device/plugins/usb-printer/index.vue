<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-card padding="lg">
				<text class="hint">{{ $t('usb_printer.hint') }}</text>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('usb_printer.detected') }}</text>
				<oa-button type="neutral" size="small" :loading="scanning" @click="loadPrinters">{{ $t('common.retry') }}</oa-button>
			</view>
			<oa-empty v-if="printers.length === 0" :text="$t('usb_printer.no_printers')" />
			<oa-card v-for="p in printers" :key="p.devname" padding="lg">
				<text class="p-model">{{ p.description || p.model || p.devname }}</text>
				<text class="p-sub">{{ p.devname }} · {{ p.id }} · {{ p.devicePath }}</text>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('usb_printer.bindings') }}</text>
				<oa-button type="positive" size="small" @click="addBinding">{{ $t('usb_printer.add_binding') }}</oa-button>
			</view>
			<oa-empty v-if="bindings.length === 0" :text="$t('usb_printer.no_bindings')" />
			<oa-card v-for="b in bindings" :key="b['.name']" padding="none">
				<view class="b-row" @click="editBinding(b)">
					<view class="b-main">
						<text class="b-dev">{{ deviceLabel(b.device) }}</text>
						<text class="b-sub">:{{ portLabel(b.port) }} · {{ b.bind || '0.0.0.0' }}{{ b.enabled === '1' ? '' : ' · ' + $t('common.disabled') }}</text>
					</view>
					<view class="b-op" @click.stop=""><oa-switch :value="b.enabled === '1'" @input="toggleEnabled(b, $event)" /></view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list ref="editor" config="usb_printer" section-type="printer" :schema="schema" init-script="usb_printer" :candidates="candidates" :create-title="$t('usb_printer.add_binding')" :edit-title="$t('usb_printer.edit_binding')" @saved="onSaved" @deleted="load" />
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			loading: false,
			initialized: false,
			scanning: false,
			printers: [],
			bindings: [],
			candidates: { printers: [] }
		}
	},
	computed: {
		portOptions() {
			return Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(9100 + i) }))
		},
		schema() {
			return [
				{ key: 'enabled', label: this.$t('usb_printer.field_enabled'), type: 'switch', default: '1', group: 'b', groupLabel: this.$t('usb_printer.edit_binding') },
				{ key: 'device', label: this.$t('usb_printer.field_device'), type: 'select', candidates: 'printers', required: true, group: 'b' },
				{ key: 'port', label: this.$t('usb_printer.field_port'), type: 'select', options: this.portOptions, default: '0', required: true, group: 'b' },
				{ key: 'bind', label: this.$t('usb_printer.field_bind'), type: 'text', placeholder: '0.0.0.0', default: '0.0.0.0', validate: { pattern: '^((25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1?\\d?\\d)$', message: this.$t('usb_printer.invalid_ip') }, group: 'b' },
				{ key: 'bidirectional', label: this.$t('usb_printer.field_bidirectional'), type: 'switch', default: '0', group: 'b' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('usb_printer.title') })
		this.load()
		this.loadPrinters()
	},
	onPullDownRefresh() { Promise.all([Promise.resolve(this.load()), Promise.resolve(this.loadPrinters())]).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		async load() {
			this.loading = !this.initialized
			try {
				const data = await UciRpc.get('usb_printer')
				const bindings = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s['.type'] === 'printer') bindings.push({ ...s, '.name': name })
				})
				this.bindings = bindings
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.initialized = true
				this.loading = false
			}
		},
		async loadPrinters() {
			this.scanning = true
			try {
				const res = await UciRpc.getUsbPrinters()
				if (res.error) {
					this.printers = []
					this.candidates = { printers: [] }
					uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
				} else {
					this.printers = res.details || []
					this.candidates = { printers: res.printers || [] }
				}
			} catch (e) {
				this.printers = []
				this.candidates = { printers: [] }
			} finally {
				this.scanning = false
			}
		},
		deviceLabel(device) {
			const p = this.candidates.printers.find(x => x.value === device)
			return p ? p.label : (device || this.$t('usb_printer.no_printers'))
		},
		portLabel(port) { return port != null && port !== '' ? String(9100 + Number(port)) : '?' },
		// 启停：uci set + commit + apply（ubus uci.commit 不触发 ucitrack，须显式 reload）
		async toggleEnabled(b, on) {
			try {
				await UciRpc.setCommit('usb_printer', b['.name'], { enabled: on ? '1' : '0' })
				try { await UciRpc.apply('usb_printer') } catch (e) { /* apply 失败不阻断，配置已落盘 */ }
				this.$set(b, 'enabled', on ? '1' : '0')
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			}
		},
		addBinding() { this.$refs.editor.openCreate() },
		editBinding(b) { this.$refs.editor.openEdit(b) },
		onSaved() {
			this.load()
			this.loadPrinters()
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.hint { display: block; font-size: $oa-fs-caption; color: $oa-text-muted; line-height: 1.5; }
.sec-head { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; margin: $oa-sp-3 0 $oa-sp-2; }
.sec-head__title { font-size: $oa-fs-title; font-weight: 600; color: $oa-text; }
.p-model { display: block; font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.p-sub { display: block; margin-top: 4rpx; font-size: $oa-fs-caption; color: $oa-text-muted; }
.b-row { display: flex; align-items: center; gap: $oa-sp-2; padding: $oa-sp-2 $oa-sp-3; }
.b-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.b-dev { font-size: $oa-fs-body; font-weight: 500; color: $oa-text; word-break: break-all; }
.b-sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
.b-op { flex-shrink: 0; }
</style>
