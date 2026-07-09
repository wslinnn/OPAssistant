<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-card :title="$t('firewall.general')" divider padding="lg" @click.native="editDefaults">
				<view class="kv"><text class="kv__k">{{ $t('firewall.field_input') }}</text><text class="kv__v">{{ defaults.input || 'DROP' }}</text></view>
				<view class="kv"><text class="kv__k">{{ $t('firewall.field_output') }}</text><text class="kv__v">{{ defaults.output || 'ACCEPT' }}</text></view>
				<view class="kv"><text class="kv__k">{{ $t('firewall.field_forward') }}</text><text class="kv__v">{{ defaults.forward || 'REJECT' }}</text></view>
				<view class="kv kv--last"><text class="kv__k">{{ $t('firewall.field_synflood') }}</text><oa-status-badge :type="defaults.synflood_protect === '1' ? 'up' : 'neutral'" :text="defaults.synflood_protect === '1' ? $t('common.enabled') : $t('common.disabled')" /></view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('firewall.zones') }}</text>
				<oa-button type="positive" size="small" @click="addZone">{{ $t('firewall.add_zone') }}</oa-button>
			</view>
			<oa-empty v-if="zones.length === 0" :text="$t('firewall.no_zones')" />
			<oa-card v-for="z in zones" :key="z['.name']" padding="lg">
				<view class="entity" @click="editZone(z)">
					<view class="entity__dot" :style="{ background: zoneColor(z.name || z['.name']) }" />
					<view class="entity__main">
						<text class="entity__title">{{ z.name || z['.name'] }}</text>
						<text class="entity__sub">in:{{ z.input || '?' }} · out:{{ z.output || '?' }} · fwd:{{ z.forward || '?' }}</text>
					</view>
					<view class="entity__tags">
						<oa-status-badge v-if="z.masq === '1'" type="info" text="MASQ" />
						<oa-status-badge v-if="z.mtu_fix === '1'" type="neutral" text="MSS" />
					</view>
				</view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('firewall.forwardings') }}</text>
				<oa-button type="positive" size="small" @click="addFwd">{{ $t('firewall.add_fwd') }}</oa-button>
			</view>
			<oa-empty v-if="forwardings.length === 0" :text="$t('firewall.no_forwardings')" />
			<oa-card v-for="f in forwardings" :key="f['.name']" padding="lg">
				<view class="fwd" @click="editFwd(f)">
					<view class="fwd__dot" :style="{ background: zoneColor(f.src) }" />
					<text class="fwd__name">{{ f.src || '?' }}</text>
					<text class="fwd__arrow">→</text>
					<view class="fwd__dot" :style="{ background: zoneColor(f.dest) }" />
					<text class="fwd__name">{{ f.dest || '?' }}</text>
				</view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('firewall.redirects') }}</text>
				<oa-button type="positive" size="small" @click="addRedirect">{{ $t('firewall.add_redirect') }}</oa-button>
			</view>
			<oa-empty v-if="redirects.length === 0" :text="$t('firewall.no_redirects')" />
			<oa-card v-for="rd in redirects" :key="rd['.name']" padding="none">
				<view class="rl">
					<view class="rl__main" @click="editRedirect(rd)">
						<text class="rl__title">{{ rd.name || $t('firewall.unnamed') }}</text>
						<text class="rl__sub">{{ redirectLine(rd) }}</text>
					</view>
					<view class="rl__op" @click.stop=""><oa-switch :value="rd.enabled !== '0'" @input="toggleEnabled(rd, $event)" /></view>
				</view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('firewall.rules') }}</text>
				<oa-button type="positive" size="small" @click="addRule">{{ $t('firewall.add_rule') }}</oa-button>
			</view>
			<oa-empty v-if="rules.length === 0" :text="$t('firewall.no_rules')" />
			<oa-card v-for="rl in rules" :key="rl['.name']" padding="none">
				<view class="rl">
					<view class="rl__main" @click="editRule(rl)">
						<text class="rl__title">{{ rl.name || $t('firewall.unnamed') }}</text>
						<text class="rl__sub">{{ ruleLine(rl) }}</text>
					</view>
					<view class="rl__op" @click.stop=""><oa-switch :value="rl.enabled !== '0'" @input="toggleEnabled(rl, $event)" /></view>
				</view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('firewall.nats') }}</text>
				<oa-button type="positive" size="small" @click="addNat">{{ $t('firewall.add_nat') }}</oa-button>
			</view>
			<oa-empty v-if="nats.length === 0" :text="$t('firewall.no_nats')" />
			<oa-card v-for="nt in nats" :key="nt['.name']" padding="none">
				<view class="rl">
					<view class="rl__main" @click="editNat(nt)">
						<text class="rl__title">{{ nt.name || $t('firewall.unnamed') }}</text>
						<text class="rl__sub">{{ natLine(nt) }}</text>
					</view>
					<view class="rl__op" @click.stop=""><oa-switch :value="nt.enabled !== '0'" @input="toggleEnabled(nt, $event)" /></view>
				</view>
			</oa-card>

			<oa-card :title="$t('firewall.custom_rules')" divider padding="lg">
				<text class="custom-hint">{{ $t('firewall.custom_hint') }}</text>
				<view class="custom-row">
					<text class="custom-count">{{ customRules ? customLines + ' ' + $t('firewall.lines') : $t('firewall.empty_rules') }}</text>
					<oa-button type="neutral" size="small" @click="openCustom">{{ $t('firewall.edit_custom') }}</oa-button>
				</view>
			</oa-card>
		</view>

		<oa-uci-list ref="defaultsEditor" :allow-delete="false" config="firewall" section-type="defaults" :schema="defaultsSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.edit_defaults')" :edit-title="$t('firewall.edit_defaults')" @saved="load" />
		<oa-uci-list ref="zoneEditor" config="firewall" section-type="zone" :schema="zoneSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.add_zone')" :edit-title="$t('firewall.edit_zone')" @saved="load" @deleted="load" />
		<oa-uci-list ref="fwdEditor" config="firewall" section-type="forwarding" :schema="forwardingSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.add_fwd')" :edit-title="$t('firewall.edit_fwd')" @saved="load" @deleted="load" />
		<oa-uci-list ref="redirectEditor" config="firewall" section-type="redirect" :schema="redirectSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.add_redirect')" :edit-title="$t('firewall.edit_redirect')" @saved="load" @deleted="load" />
		<oa-uci-list ref="ruleEditor" config="firewall" section-type="rule" :schema="ruleSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.add_rule')" :edit-title="$t('firewall.edit_rule')" @saved="load" @deleted="load" />
		<oa-uci-list ref="natEditor" config="firewall" section-type="nat" :schema="natSchema" init-script="firewall" :candidates="candidates" :create-title="$t('firewall.add_nat')" :edit-title="$t('firewall.edit_nat')" @saved="load" @deleted="load" />

		<uni-popup ref="customPopup" type="center" :mask-click="false">
			<view class="custom-dialog">
				<view class="custom-dialog__header"><text class="custom-dialog__title">{{ $t('firewall.custom_rules') }}</text></view>
				<textarea class="custom-dialog__area" v-model="customDraft" :maxlength="-1" auto-height :placeholder="$t('firewall.custom_placeholder')" />
				<view class="custom-dialog__actions">
					<oa-button type="neutral" block :disabled="savingCustom" @click="closeCustom">{{ $t('common.cancel') }}</oa-button>
					<oa-button type="primary" block :loading="savingCustom" @click="saveCustom">{{ $t('firewall.save_apply') }}</oa-button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import { getZoneColor, redirectSummary, ruleSummary, natSummary } from '@/utils/firewall.js'

const PORT = '^!?\\s*\\d{1,5}(-\\d{1,5})?$'
const IP = '^!?\\s*[0-9a-fA-F:.]+(\\/\\d{1,3})?$'

export default {
	data() {
		return {
			loading: false,
			defaults: {},
			zones: [],
			forwardings: [],
			redirects: [],
			rules: [],
			nats: [],
			candidates: { zones: [], interfaces: [], helpers: [] },
			customRules: '',
			customDraft: '',
			savingCustom: false
		}
	},
	computed: {
		customLines() {
			return this.customRules ? this.customRules.split('\n').filter(l => l.trim()).length : 0
		},
		policyOptions() {
			return [
				{ value: 'ACCEPT', label: this.$t('firewall.opt_accept') },
				{ value: 'DROP', label: this.$t('firewall.opt_drop') },
				{ value: 'REJECT', label: this.$t('firewall.opt_reject') }
			]
		},
		protoOptions() {
			return [
				{ value: 'tcp', label: this.$t('firewall.opt_proto_tcp') },
				{ value: 'udp', label: this.$t('firewall.opt_proto_udp') },
				{ value: 'icmp', label: this.$t('firewall.opt_proto_icmp') },
				{ value: 'icmpv6', label: this.$t('firewall.opt_proto_icmpv6') }
			]
		},
		targetOptions() {
			return [
				{ value: 'ACCEPT', label: this.$t('firewall.opt_accept') },
				{ value: 'DROP', label: this.$t('firewall.opt_drop') },
				{ value: 'REJECT', label: this.$t('firewall.opt_reject') },
				{ value: 'NOTRACK', label: this.$t('firewall.opt_notrack') }
			]
		},
		natTargetOptions() {
			return [
				{ value: 'MASQUERADE', label: this.$t('firewall.opt_masquerade') },
				{ value: 'SNAT', label: this.$t('firewall.opt_snat') },
				{ value: 'ACCEPT', label: this.$t('firewall.opt_no_rewrite') }
			]
		},
		defaultsSchema() {
			return [
				{ key: 'input', label: this.$t('firewall.field_input'), type: 'select', options: this.policyOptions, group: 'd', groupLabel: this.$t('firewall.general') },
				{ key: 'output', label: this.$t('firewall.field_output'), type: 'select', options: this.policyOptions, group: 'd' },
				{ key: 'forward', label: this.$t('firewall.field_forward'), type: 'select', options: this.policyOptions, group: 'd' },
				{ key: 'synflood_protect', label: this.$t('firewall.field_synflood'), type: 'switch', default: '1', group: 'd' },
				{ key: 'drop_invalid', label: this.$t('firewall.field_drop_invalid'), type: 'switch', group: 'd' }
			]
		},
		zoneSchema() {
			return [
				{ key: 'name', label: this.$t('firewall.field_name'), type: 'text', required: true, validate: { pattern: '^[a-zA-Z_][a-zA-Z0-9_]+$', message: this.$t('firewall.invalid_name') }, group: 'z', groupLabel: this.$t('firewall.edit_zone') },
				{ key: 'network', label: this.$t('firewall.field_network'), type: 'multiSelect', candidates: 'interfaces', uciList: true, group: 'z' },
				{ key: 'input', label: this.$t('firewall.field_input'), type: 'select', options: this.policyOptions, default: 'DROP', group: 'z' },
				{ key: 'output', label: this.$t('firewall.field_output'), type: 'select', options: this.policyOptions, default: 'ACCEPT', group: 'z' },
				{ key: 'forward', label: this.$t('firewall.field_forward'), type: 'select', options: this.policyOptions, default: 'REJECT', group: 'z' },
				{ key: 'masq', label: this.$t('firewall.field_masq'), type: 'switch', group: 'z' },
				{ key: 'masq6', label: this.$t('firewall.field_masq6'), type: 'switch', group: 'z' },
				{ key: 'mtu_fix', label: this.$t('firewall.field_mtu'), type: 'switch', group: 'z' }
			]
		},
		forwardingSchema() {
			return [
				{ key: 'src', label: this.$t('firewall.field_src'), type: 'select', candidates: 'zones', required: true, group: 'f', groupLabel: this.$t('firewall.edit_fwd') },
				{ key: 'dest', label: this.$t('firewall.field_dest'), type: 'select', candidates: 'zones', required: true, group: 'f' }
			]
		},
		redirectSchema() {
			return [
				{ key: 'name', label: this.$t('firewall.field_name'), type: 'text', placeholder: this.$t('firewall.unnamed'), group: 'r', groupLabel: this.$t('firewall.edit_redirect') },
				{ key: 'enabled', label: this.$t('firewall.field_enabled'), type: 'switch', default: '1', group: 'r' },
				{ key: 'proto', label: this.$t('firewall.field_proto'), type: 'multiSelect', options: this.protoOptions, default: 'tcp udp', uciList: true, group: 'r' },
				{ key: 'src', label: this.$t('firewall.field_src'), type: 'select', candidates: 'zones', default: 'wan', group: 'r' },
				{ key: 'src_dport', label: this.$t('firewall.field_ext_port'), type: 'text', required: true, validate: { pattern: PORT, message: this.$t('firewall.invalid_port') }, depends: { key: 'proto', value: ['tcp', 'udp'] }, group: 'r' },
				{ key: 'dest', label: this.$t('firewall.field_dest'), type: 'select', candidates: 'zones', group: 'r' },
				{ key: 'dest_ip', label: this.$t('firewall.field_dest_ip'), type: 'text', required: true, validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, group: 'r' },
				{ key: 'dest_port', label: this.$t('firewall.field_dest_port'), type: 'text', validate: { pattern: PORT, message: this.$t('firewall.invalid_port') }, depends: { key: 'proto', value: ['tcp', 'udp'] }, group: 'r' },
				{ key: 'reflection', label: this.$t('firewall.field_reflection'), type: 'switch', default: '1', group: 'r' }
			]
		},
		ruleSchema() {
			return [
				{ key: 'name', label: this.$t('firewall.field_name'), type: 'text', placeholder: this.$t('firewall.unnamed'), group: 'ru', groupLabel: this.$t('firewall.edit_rule') },
				{ key: 'enabled', label: this.$t('firewall.field_enabled'), type: 'switch', default: '1', group: 'ru' },
				{ key: 'proto', label: this.$t('firewall.field_proto'), type: 'multiSelect', options: this.protoOptions, default: 'tcp udp', uciList: true, group: 'ru' },
				{ key: 'target', label: this.$t('firewall.field_target'), type: 'select', options: this.targetOptions, default: 'ACCEPT', group: 'ru' },
				{ key: 'src', label: this.$t('firewall.field_src'), type: 'select', candidates: 'zones', group: 'ru' },
				{ key: 'dest', label: this.$t('firewall.field_dest'), type: 'select', candidates: 'zones', group: 'ru' },
				{ key: 'src_ip', label: this.$t('firewall.field_src_ip'), type: 'dynamicList', validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, group: 'ru' },
				{ key: 'dest_ip', label: this.$t('firewall.field_dest_ip'), type: 'dynamicList', validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, group: 'ru' },
				{ key: 'src_port', label: this.$t('firewall.field_src_port'), type: 'text', validate: { pattern: PORT, message: this.$t('firewall.invalid_port') }, depends: { key: 'proto', value: ['tcp', 'udp'] }, group: 'ru' },
				{ key: 'dest_port', label: this.$t('firewall.field_dest_port'), type: 'text', validate: { pattern: PORT, message: this.$t('firewall.invalid_port') }, depends: { key: 'proto', value: ['tcp', 'udp'] }, group: 'ru' }
			]
		},
		natSchema() {
			return [
				{ key: 'name', label: this.$t('firewall.field_name'), type: 'text', placeholder: this.$t('firewall.unnamed'), group: 'n', groupLabel: this.$t('firewall.edit_nat') },
				{ key: 'enabled', label: this.$t('firewall.field_enabled'), type: 'switch', default: '1', group: 'n' },
				{ key: 'proto', label: this.$t('firewall.field_proto'), type: 'multiSelect', options: this.protoOptions, default: 'tcp udp', uciList: true, group: 'n' },
				{ key: 'src', label: this.$t('firewall.field_src'), type: 'select', candidates: 'zones', group: 'n' },
				{ key: 'dest', label: this.$t('firewall.field_dest'), type: 'select', candidates: 'zones', group: 'n' },
				{ key: 'target', label: this.$t('firewall.field_target'), type: 'select', options: this.natTargetOptions, default: 'MASQUERADE', group: 'n' },
				{ key: 'snat_ip', label: this.$t('firewall.field_snat_ip'), type: 'text', validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, depends: { key: 'target', value: ['SNAT'] }, group: 'n' },
				{ key: 'snat_port', label: this.$t('firewall.field_snat_port'), type: 'text', validate: { pattern: PORT, message: this.$t('firewall.invalid_port') }, depends: { key: 'target', value: ['SNAT'] }, group: 'n' },
				{ key: 'src_ip', label: this.$t('firewall.field_src_ip'), type: 'dynamicList', validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, group: 'n' },
				{ key: 'dest_ip', label: this.$t('firewall.field_dest_ip'), type: 'dynamicList', validate: { pattern: IP, message: this.$t('firewall.invalid_ip') }, group: 'n' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('firewall.title') })
		this.load()
		this.loadCandidates()
		this.loadCustom()
	},
	methods: {
		zoneColor(name) { return getZoneColor(name) },
		redirectLine(r) { const s = redirectSummary(r); return `${s.proto} · ${s.line}` },
		ruleLine(r) { const s = ruleSummary(r); return `${s.proto} · ${s.line} · ${s.action}` },
		natLine(r) { const s = natSummary(r); return `${s.proto} · ${s.line} · ${s.action}` },
		async load() {
			this.loading = this.zones.length === 0
			try {
				const data = await UciRpc.get('firewall')
				const defaults = {}
				const zones = [], forwardings = [], redirects = [], rules = [], nats = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name] || {}
					const t = s['.type']
					const item = { ...s, '.name': name }
					if (t === 'defaults') Object.assign(defaults, s, { '.name': name })
					else if (t === 'zone') zones.push(item)
					else if (t === 'forwarding') forwardings.push(item)
					else if (t === 'redirect') redirects.push(item)
					else if (t === 'rule') rules.push(item)
					else if (t === 'nat') nats.push(item)
				})
				this.defaults = defaults
				this.zones = zones
				this.forwardings = forwardings
				this.redirects = redirects
				this.rules = rules
				this.nats = nats
				this.loadCandidates()
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadCandidates() {
			try {
				const [z, i, h] = await Promise.all([
					UciRpc.getZoneCandidates(),
					UciRpc.getInterfaceCandidates(),
					UciRpc.getConntrackHelpers().catch(() => ({ helpers: [] }))
				])
				this.candidates = {
					zones: (z && z.zones) || [],
					interfaces: (i && i.interfaces) || [],
					helpers: (h && h.helpers) || []
				}
			} catch (e) { /* 候选缺失退化为空，select 降级 */ }
		},
		async loadCustom() {
			try { this.customRules = await UciRpc.readFile('/etc/firewall.user') }
			catch (e) { this.customRules = '' }
		},
		// redirect/rule/nat 启停：uci set + commit + apply reload（ubus uci.commit 不触发 ucitrack，须显式 reload）
		async toggleEnabled(item, on) {
			try {
				await UciRpc.setCommit('firewall', item['.name'], { enabled: on ? '1' : '0' })
				try { await UciRpc.apply('firewall') } catch (e) { /* apply 失败不阻断，配置已落盘，下次 reload 生效 */ }
				this.$set(item, 'enabled', on ? '1' : '0')
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			}
		},
		editDefaults() { if (this.defaults['.name']) this.$refs.defaultsEditor.openEdit(this.defaults) },
		addZone() { this.$refs.zoneEditor.openCreate() },
		editZone(z) { this.$refs.zoneEditor.openEdit(z) },
		addFwd() { this.$refs.fwdEditor.openCreate() },
		editFwd(f) { this.$refs.fwdEditor.openEdit(f) },
		addRedirect() { this.$refs.redirectEditor.openCreate() },
		editRedirect(r) { this.$refs.redirectEditor.openEdit(r) },
		addRule() { this.$refs.ruleEditor.openCreate() },
		editRule(r) { this.$refs.ruleEditor.openEdit(r) },
		addNat() { this.$refs.natEditor.openCreate() },
		editNat(n) { this.$refs.natEditor.openEdit(n) },
		openCustom() { this.customDraft = this.customRules; this.$refs.customPopup.open() },
		closeCustom() { if (this.savingCustom) return; this.$refs.customPopup.close() },
		// 自定义规则：file write（与 luci 同款规范化 trim+CRLF→LF+末尾\n）+ file exec restart 全量重建
		async saveCustom() {
			const normalized = (this.customDraft || '').trim().replace(/\r\n/g, '\n') + '\n'
			this.savingCustom = true
			try {
				await UciRpc.writeFile('/etc/firewall.user', normalized)
				try { await UciRpc.apply('firewall', 'restart') } catch (e) { /* apply 失败不阻断，规则已写入，下次 fw restart 生效 */ }
				this.customRules = normalized
				this.$refs.customPopup.close()
				uni.showToast({ title: this.$t('common.save_success'), icon: 'success' })
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			} finally {
				this.savingCustom = false
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.sec-head { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; margin: $oa-sp-3 0 $oa-sp-2; }
.sec-head__title { font-size: $oa-fs-title; font-weight: 600; color: $oa-text; }
.kv { display: flex; align-items: center; justify-content: space-between; padding: $oa-sp-1 0; border-bottom: 1rpx solid $oa-hairline; }
.kv--last { border-bottom: none; }
.kv__k { font-size: $oa-fs-label; color: $oa-text-muted; }
.kv__v { font-size: $oa-fs-body; color: $oa-text; font-weight: 500; }
.entity { display: flex; align-items: center; gap: $oa-sp-2; }
.entity__dot { width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; }
.entity__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.entity__title { font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.entity__sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
.entity__tags { display: flex; gap: 8rpx; flex-shrink: 0; }
.fwd { display: flex; align-items: center; gap: 12rpx; }
.fwd__dot { width: 20rpx; height: 20rpx; border-radius: 50%; }
.fwd__name { font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.fwd__arrow { color: $oa-text-subtle; font-size: $oa-fs-body; }
.rl { display: flex; align-items: center; gap: $oa-sp-2; padding: $oa-sp-2 $oa-sp-3; }
.rl__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.rl__title { font-size: $oa-fs-body; font-weight: 500; color: $oa-text; }
.rl__sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
.rl__op { flex-shrink: 0; }
.custom-hint { display: block; font-size: $oa-fs-caption; color: $oa-text-muted; line-height: 1.4; margin-bottom: $oa-sp-2; }
.custom-row { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; }
.custom-count { font-size: $oa-fs-caption; color: $oa-text-muted; }
.custom-dialog { width: 640rpx; max-height: 80vh; background: $oa-surface; border-radius: $oa-radius-2xl; padding: $oa-sp-3; display: flex; flex-direction: column; box-sizing: border-box; }
.custom-dialog__header { text-align: center; margin-bottom: $oa-sp-2; }
.custom-dialog__title { font-size: $oa-fs-title; font-weight: 600; color: $oa-text; }
.custom-dialog__area { width: 100%; box-sizing: border-box; min-height: 400rpx; max-height: 56vh; background: $oa-surface-sunken; border-radius: $oa-radius-md; padding: $oa-sp-2; font-size: $oa-fs-caption; color: $oa-text; }
.custom-dialog__actions { display: flex; gap: $oa-sp-2; margin-top: $oa-sp-3; }
</style>
