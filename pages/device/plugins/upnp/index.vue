<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-card :title="$t('upnp.active_maps')" divider padding="none">
				<oa-empty v-if="rules.length === 0" :text="$t('upnp.no_rules')" />
				<view v-for="(r, i) in rules" :key="(r.num || '') + '-' + i" class="rule" :class="{ 'rule--last': i === rules.length - 1 }">
					<view class="rule__main">
						<text class="rule__desc">{{ r.descr || r.host_hint || r.proto }}</text>
						<text class="rule__port">{{ r.proto }} {{ r.extport }} → {{ r.intaddr }}:{{ r.intport }}</text>
					</view>
					<oa-button type="negative" size="small" @click="deleteRule(r)">{{ $t('common.delete') }}</oa-button>
				</view>
			</oa-card>

			<oa-card :title="$t('upnp.service_settings')" divider padding="lg" @click.native="editConfig">
				<view class="kv kv--last">
					<text class="kv__k">{{ $t('upnp.service_status') }}</text>
					<oa-status-badge :type="config.enabled === '1' ? 'up' : 'neutral'" :text="config.enabled === '1' ? $t('upnp.running') : $t('upnp.stopped')" />
				</view>
			</oa-card>

			<view class="page-actions">
				<text class="page-hint">{{ $t('upnp.acl_desc') }}</text>
				<oa-button type="positive" size="small" @click="addAcl">{{ $t('upnp.add_acl') }}</oa-button>
			</view>
			<oa-empty v-if="acls.length === 0" :text="$t('upnp.no_acl')" />
			<oa-card v-for="a in acls" :key="a['.name']" padding="lg">
				<view class="acl" @click="editAcl(a)">
					<view class="acl__main">
						<text class="acl__comment">{{ a.comment || a['.name'] }}</text>
						<text class="acl__sub">{{ a.int_addr || '*' }}:{{ a.int_ports || '*' }} → {{ a.ext_ports || '*' }}</text>
					</view>
					<oa-status-badge :type="a.action === 'allow' ? 'up' : 'down'" :text="a.action === 'allow' ? $t('upnp.allow') : $t('upnp.deny')" />
				</view>
			</oa-card>
		</view>

		<oa-uci-list ref="cfgEditor" config="upnpd" section-type="config" :allow-delete="false" :schema="configSchema" init-script="miniupnpd" :create-title="$t('upnp.edit_config')" :edit-title="$t('upnp.edit_config')" @saved="onSaved" />
		<oa-uci-list ref="aclEditor" config="upnpd" section-type="perm_rule" :schema="aclSchema" init-script="miniupnpd" :create-title="$t('upnp.add_acl')" :edit-title="$t('upnp.edit_acl')" @saved="load" @deleted="load" />
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
export default {
	data() {
		return {
			loading: false,
			rules: [],
			config: {},
			acls: [],
			pollTimer: null
		}
	},
	computed: {
		configSchema() {
			return [
				{ key: 'enabled', label: this.$t('upnp.enable'), type: 'switch' },
				{ key: 'enable_upnp', label: this.$t('upnp.enable_upnp'), type: 'switch', default: '1' },
				{ key: 'enable_natpmp', label: this.$t('upnp.enable_natpmp'), type: 'switch', default: '1' },
				{ key: 'igdv1', label: this.$t('upnp.igdv1'), type: 'switch', default: '1', depends: { key: 'enable_upnp', value: '1' } },
				{ key: 'download', label: this.$t('upnp.download'), type: 'text', depends: { key: 'enable_upnp', value: '1' }, validate: { pattern: '^[0-9]*$' } },
				{ key: 'upload', label: this.$t('upnp.upload'), type: 'text', depends: { key: 'enable_upnp', value: '1' }, validate: { pattern: '^[0-9]*$' } },
				{ key: 'use_stun', label: this.$t('upnp.use_stun'), type: 'switch' },
				{ key: 'stun_host', label: this.$t('upnp.stun_host'), type: 'text', depends: { key: 'use_stun', value: '1' }, validate: { pattern: '^[a-zA-Z0-9.:_-]+$' } },
				{ key: 'stun_port', label: this.$t('upnp.stun_port'), type: 'text', depends: { key: 'use_stun', value: '1' }, validate: { pattern: '^[0-9]*$' } },
				{ key: 'secure_mode', label: this.$t('upnp.secure_mode'), type: 'switch', default: '1', depends: { key: 'enable_upnp', value: '1' } },
				{ key: 'system_uptime', label: this.$t('upnp.system_uptime'), type: 'switch', default: '1', depends: { key: 'enable_upnp', value: '1' } },
				{ key: 'log_output', label: this.$t('upnp.log_output'), type: 'switch' }
			]
		},
		aclSchema() {
			return [
				{ key: 'comment', label: this.$t('upnp.comment'), type: 'text', required: true },
				{ key: 'int_addr', label: this.$t('upnp.int_addr'), type: 'text', placeholder: '0.0.0.0/0', validate: { pattern: '^[0-9a-zA-Z./:_-]+$' } },
				{ key: 'int_ports', label: this.$t('upnp.int_ports'), type: 'text', placeholder: '1-65535', validate: { pattern: '^[0-9,-]+$' } },
				{ key: 'ext_ports', label: this.$t('upnp.ext_ports'), type: 'text', placeholder: '1-65535', validate: { pattern: '^[0-9,-]+$' } },
				{ key: 'action', label: this.$t('upnp.action'), type: 'select', options: [{ value: 'allow', label: this.$t('upnp.allow') }, { value: 'deny', label: this.$t('upnp.deny') }], default: 'allow', required: true }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('upnp.title') })
		this.load()
		this.startPoll()
	},
	onHide() { this.stopPoll() },
	onUnload() { this.stopPoll() },
	methods: {
		async load() {
			this.loading = this.acls.length === 0 && this.rules.length === 0
			try {
				const data = await UciRpc.get('upnpd')
				const config = {}
				const acls = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s['.type'] === 'config' || name === 'config') Object.assign(config, s, { '.name': name })
					else if (s['.type'] === 'perm_rule') acls.push({ ...s, '.name': name })
				})
				this.config = config
				this.acls = acls
				this.fetchRules()
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		onSaved() { this.load() },
		async fetchRules() {
			try {
				const res = await UciRpc.callUbus('luci.upnp', 'get_status')
				this.rules = (res && res.rules) || []
			} catch (e) { this.rules = [] }
		},
		startPoll() {
			this.stopPoll()
			this.pollTimer = setInterval(() => { this.fetchRules() }, 5000)
		},
		stopPoll() {
			if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
		},
		deleteRule(r) {
			uni.showModal({
				title: this.$t('upnp.title'),
				content: this.$t('upnp.delete_confirm'),
				success: async (res) => {
					if (!res.confirm) return
					try {
						await UciRpc.callUbus('luci.upnp', 'delete_rule', { token: r.num })
						uni.showToast({ title: this.$t('upnp.delete_success'), icon: 'success' })
						this.fetchRules()
					} catch (e) {
						uni.showToast({ title: this.$t('upnp.delete_failed'), icon: 'none' })
					}
				}
			})
		},
		editConfig() {
			if (!this.config['.name']) return
			this.$refs.cfgEditor.openEdit(this.config)
		},
		addAcl() { this.$refs.aclEditor.openCreate() },
		editAcl(a) { this.$refs.aclEditor.openEdit(a) }
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.page-actions { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; margin-bottom: $oa-sp-2; }
.page-hint { flex: 1; min-width: 0; font-size: $oa-fs-caption; color: $oa-text-muted; line-height: 1.4; }
.rule { display: flex; align-items: center; gap: $oa-sp-2; padding: $oa-sp-2 $oa-sp-3; border-bottom: 1rpx solid $oa-hairline; }
.rule--last { border-bottom: none; }
.rule__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.rule__desc { font-size: $oa-fs-body; color: $oa-text; font-weight: 500; }
.rule__port { font-size: $oa-fs-caption; color: $oa-text-muted; }
.kv { display: flex; align-items: center; justify-content: space-between; padding: $oa-sp-1 0; }
.kv--last { /* 无底边 */ }
.kv__k { font-size: $oa-fs-label; color: $oa-text-muted; }
.acl { display: flex; align-items: center; gap: $oa-sp-2; }
.acl__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.acl__comment { font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.acl__sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
</style>
