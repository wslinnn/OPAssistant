<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<view class="page-actions">
				<text class="page-hint">{{ $t('arpbind.desc') }}</text>
				<oa-button type="positive" size="small" @click="add">{{ $t('arpbind.add_rule') }}</oa-button>
			</view>

			<oa-empty v-if="sections.length === 0" :text="$t('arpbind.empty')" />

			<oa-card v-for="s in sections" :key="s['.name']" padding="lg">
				<view class="bind">
					<view class="bind__main" @click="edit(s)">
						<oa-copy-text class="bind__ip" :text="s.ipaddr">{{ s.ipaddr || '-' }}</oa-copy-text>
						<text class="bind__mac">{{ s.macaddr || '-' }}</text>
						<text class="bind__iface">{{ s.ifname || '-' }}</text>
					</view>
					<view class="bind__switch" @click.stop="">
						<oa-switch :value="isEnabled(s)" @input="onToggle(s, $event)" />
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list
			ref="editor"
			config="arpbind"
			section-type="arpbind"
			:schema="schema"
			init-script="arpbind"
			:candidates="candidates"
			:create-title="$t('arpbind.add_rule')"
			:edit-title="$t('arpbind.edit_rule')"
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
			candidates: { hosthintsIp: [], hosthintsMac: [], devices: [] }
		}
	},
	computed: {
		schema() {
			return [
				{ key: 'enabled', label: this.$t('arpbind.enable'), type: 'switch', invert: true, default: '0' },
				{ key: 'ipaddr', label: this.$t('arpbind.ipaddr'), type: 'text', candidates: 'hosthints-ip', required: true, placeholder: '192.168.1.100' },
				{ key: 'macaddr', label: this.$t('arpbind.macaddr'), type: 'text', candidates: 'hosthints-mac', required: true, placeholder: '00:11:22:33:44:55' },
				{ key: 'ifname', label: this.$t('arpbind.ifname'), type: 'deviceSelect', required: true }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('arpbind.title') })
		this.load()
		this.loadCandidates()
	},
	methods: {
		async load() {
			this.loading = this.sections.length === 0
			try {
				const data = await UciRpc.get('arpbind')
				const list = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s && s['.type'] === 'arpbind') list.push({ ...s, '.name': name })
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
				this.candidates = { ...hints, ...devs }
			} catch (e) { /* 候选缺失退化为手填 */ }
		},
		// 反逻辑：enabled='0' = 启用
		isEnabled(s) {
			return s.enabled === '0' || s.enabled === undefined || s.enabled === ''
		},
		async onToggle(s, on) {
			const newEnabled = on ? '0' : '1'
			try {
				await UciRpc.setCommit('arpbind', s['.name'], { enabled: newEnabled })
				try { await UciRpc.apply('arpbind') } catch (e) {}
				this.$set(s, 'enabled', newEnabled)
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
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
.bind {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.bind__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.bind__ip {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
	word-break: break-all;
}
.bind__mac {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.bind__iface {
	font-size: $oa-fs-caption;
	color: $oa-text-subtle;
}
.bind__switch {
	flex-shrink: 0;
}
</style>
