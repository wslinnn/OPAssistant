<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<view class="page-actions">
				<text class="page-hint">{{ $t('wolplus.desc') }}</text>
				<oa-button type="positive" size="small" @click="add">{{ $t('wolplus.add_host') }}</oa-button>
			</view>

			<oa-empty v-if="sections.length === 0" :text="$t('wolplus.empty')" />

			<oa-card v-for="s in sections" :key="s['.name']" padding="lg">
				<view class="wol">
					<view class="wol__main" @click="edit(s)">
						<text class="wol__name">{{ s.name || s['.name'] }}</text>
						<view class="wol__sub">
							<oa-copy-text class="wol__mac" :text="s.macaddr">{{ s.macaddr || '-' }}</oa-copy-text>
							<text class="wol__iface">{{ s.maceth || 'br-lan' }}</text>
						</view>
					</view>
					<view class="wol__action">
						<oa-button type="positive" size="small" :loading="waking === s['.name']" @click="wake(s)">{{ $t('wolplus.wake') }}</oa-button>
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list
			ref="editor"
			config="wolplus"
			section-type="macclient"
			:schema="schema"
			:candidates="candidates"
			:create-title="$t('wolplus.add_host')"
			:edit-title="$t('wolplus.edit_host')"
			@saved="load"
			@deleted="load"
		/>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			loading: false,
			sections: [],
			candidates: { hosthintsMac: [], devices: [] },
			waking: ''
		}
	},
	computed: {
		schema() {
			return [
				{ key: 'name', label: this.$t('wolplus.name'), type: 'text', required: true },
				{ key: 'macaddr', label: this.$t('wolplus.macaddr'), type: 'text', candidates: 'hosthints-mac', required: true, placeholder: '00:11:22:33:44:55', validate: { pattern: '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$' } },
				{ key: 'maceth', label: this.$t('wolplus.iface'), type: 'deviceSelect', default: 'br-lan', required: true }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('wolplus.title') })
		this.load()
		this.loadCandidates()
	},
	onPullDownRefresh() { Promise.all([Promise.resolve(this.load()), Promise.resolve(this.loadCandidates())]).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		async load() {
			this.loading = this.sections.length === 0
			try {
				const data = await UciRpc.get('wolplus')
				const list = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s && s['.type'] === 'macclient') list.push({ ...s, '.name': name })
				})
				this.sections = list
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadCandidates() {
			try {
				const [hints, devs] = await Promise.all([UciRpc.getHostHintCandidates(), UciRpc.getDeviceCandidates()])
				this.candidates = { hosthintsMac: hints.hosthintsMac || [], devices: devs.devices || [] }
			} catch (e) { /* 候选缺失退化为手填 */ }
		},
		async wake(s) {
			if (!s.macaddr) {
				uni.showToast({ title: this.$t('wolplus.save_first'), icon: 'none' })
				return
			}
			if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(s.macaddr)) {
				uni.showToast({ title: `${this.$t('wolplus.macaddr')} ${this.$t('common.invalid')}`, icon: 'none' })
				return
			}
			this.waking = s['.name']
			try {
				const res = await UciRpc.callUbus('luci.wolplus', 'wake', { iface: s.maceth || 'br-lan', mac: s.macaddr })
				const code = res && res.code
				const out = ((res && (res.stdout || res.stderr)) || '').trim()
				if (code === 0 || code === null) {
					uni.showToast({ title: this.$t('wolplus.wake_sent', { name: s.name || s.macaddr }), icon: 'none' })
				} else {
					uni.showModal({ title: this.$t('wolplus.wake_failed'), content: out || this.$t('wolplus.wake_failed'), showCancel: false })
				}
			} catch (e) {
				uni.showToast({ title: this.$t('wolplus.wake_failed'), icon: 'none' })
			} finally {
				this.waking = ''
			}
		},
		add() { this.$refs.editor.openCreate() },
		edit(s) { this.$refs.editor.openEdit(s) }
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.page-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $oa-sp-2;
	margin-bottom: $oa-sp-2;
}
.page-hint {
	flex: 1;
	min-width: 0;
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
	line-height: 1.4;
}
.wol {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.wol__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.wol__name {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
}
.wol__sub {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.wol__mac {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.wol__iface {
	font-size: $oa-fs-caption;
	color: $oa-text-subtle;
}
.wol__action {
	flex-shrink: 0;
}
</style>
