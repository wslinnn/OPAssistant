<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-card :title="$t('passwall2.status')" divider padding="lg">
				<view class="kv"><text class="kv__k">{{ $t('passwall2.service') }}</text><oa-status-badge :type="enabled ? 'up' : 'neutral'" :text="enabled ? $t('passwall2.running') : $t('passwall2.stopped')" /></view>
				<view class="kv"><text class="kv__k">{{ $t('passwall2.node') }}</text><text class="kv__v">{{ nodeLabel || $t('passwall2.no_node') }}</text></view>
				<view class="kv kv--last"><text class="kv__k">{{ $t('passwall2.mode') }}</text><text class="kv__v">{{ modeLabel }}</text></view>
			</oa-card>

			<oa-card padding="lg">
				<view class="toggle-row">
					<view class="toggle-main">
						<text class="toggle-label">{{ $t('passwall2.enable') }}</text>
						<text class="toggle-sub">{{ $t('passwall2.enable_hint') }}</text>
					</view>
					<oa-switch :value="enabled" @input="toggle" />
				</view>
			</oa-card>

			<!-- ① 基本设置 -->
			<oa-card :title="$t('passwall2.basic_settings')" divider padding="lg">
				<view class="adv-actions">
					<oa-button type="neutral" block @click="openGlobal">{{ $t('passwall2.basic_settings') }}</oa-button>
				</view>
			</oa-card>

			<!-- ③ 规则管理（@global_rules 单例 + @shunt_rules 多例可排序） -->
			<oa-card :title="$t('passwall2.rules')" divider padding="lg">
				<view class="adv-actions">
					<oa-button type="neutral" block @click="openRules">{{ $t('passwall2.rules_settings') }}</oa-button>
				</view>
			</oa-card>

			<view class="sec-head">
				<text class="sec-head__title">{{ $t('passwall2.shunt_rules') }}</text>
				<oa-button type="positive" size="small" @click="addShunt">{{ $t('passwall2.add_shunt') }}</oa-button>
			</view>
			<oa-empty v-if="shuntRules.length === 0" :text="$t('passwall2.no_shunt')" />
			<oa-card v-for="(r, i) in shuntRules" :key="r['.name']" padding="none">
				<view class="shunt-row">
					<view class="shunt-main" @click="editShunt(r)">
						<text class="shunt-title">{{ r.remarks || r['.name'] }}</text>
						<text class="shunt-sub">{{ shuntLine(r) }}</text>
					</view>
					<view class="shunt-op" @click.stop="">
						<text class="shunt-move" :class="{ 'is-disabled': i === 0 }" @click="moveShunt(i, 'up')">▲</text>
						<text class="shunt-move" :class="{ 'is-disabled': i === shuntRules.length - 1 }" @click="moveShunt(i, 'down')">▼</text>
					</view>
				</view>
			</oa-card>

			<oa-card :title="$t('passwall2.advanced')" divider padding="lg">
				<text class="adv-hint">{{ $t('passwall2.advanced_hint') }}</text>
				<view class="adv-actions">
					<oa-button type="neutral" block @click="openExternal">{{ $t('passwall2.open_web') }}</oa-button>
				</view>
			</oa-card>
		</view>

		<!-- ① 基本设置编辑(@global[0] 单例,allow-delete=false) -->
		<oa-uci-list ref="globalEditor" config="passwall2" :schema="globalSchema" :allow-delete="false" :edit-title="$t('passwall2.basic_settings')" @saved="onSaved" />

		<!-- ③ 规则管理编辑(@global_rules 单例 + @shunt_rules 多例 CRUD+排序) -->
		<oa-uci-list ref="rulesEditor" config="passwall2" :schema="rulesSchema" :allow-delete="false" :edit-title="$t('passwall2.rules_settings')" @saved="load" />
		<oa-uci-list ref="shuntEditor" config="passwall2" section-type="shunt_rules" :schema="shuntSchema" init-script="passwall2" :create-title="$t('passwall2.add_shunt')" :edit-title="$t('passwall2.edit_shunt')" @saved="load" @deleted="load" />
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import DeviceManager from '@/utils/deviceManager.js'

export default {
	data() {
		return {
			loading: false,
			globalSection: {},
			enabled: false,
			nodeLabel: '',
			mode: '',
			nodeOptions: [],
			nodeMap: {},
			rulesSection: {},
			shuntRules: [],
			allSectionOrder: []
		}
	},
	computed: {
		modeLabel() {
			if (this.mode === 'tproxy') return 'TProxy'
			if (this.mode === 'redirect') return 'Redirect'
			return this.mode || '-'
		},
		globalSchema() {
			return [
				{ key: 'node', label: this.$t('passwall2.node'), type: 'select', options: this.nodeOptions, group: 'global', groupLabel: this.$t('passwall2.basic_settings') },
				{ key: 'localhost_proxy', label: this.$t('passwall2.localhost_proxy'), type: 'switch', group: 'global' },
				{ key: 'client_proxy', label: this.$t('passwall2.client_proxy'), type: 'switch', group: 'global' },
				{ key: 'socks_enabled', label: this.$t('passwall2.socks_enabled'), type: 'switch', group: 'global' },
				{ key: 'node_socks_port', label: this.$t('passwall2.socks_port'), type: 'text', placeholder: '1070', group: 'global' }
			]
		},
		protocolOptions() {
			return [
				{ value: 'http', label: 'HTTP' },
				{ value: 'tls', label: 'TLS' },
				{ value: 'quic', label: 'QUIC' },
				{ value: 'bittorrent', label: 'BitTorrent' }
			]
		},
		networkOptions() {
			return [
				{ value: 'tcp,udp', label: 'TCP UDP' },
				{ value: 'tcp', label: 'TCP' },
				{ value: 'udp', label: 'UDP' }
			]
		},
		weekOptions() {
			return [
				{ value: '8', label: this.$t('passwall2.rules_week_loop') },
				{ value: '7', label: this.$t('passwall2.rules_week_daily') },
				{ value: '1', label: this.$t('passwall2.rules_week_mon') },
				{ value: '2', label: this.$t('passwall2.rules_week_tue') },
				{ value: '3', label: this.$t('passwall2.rules_week_wed') },
				{ value: '4', label: this.$t('passwall2.rules_week_thu') },
				{ value: '5', label: this.$t('passwall2.rules_week_fri') },
				{ value: '6', label: this.$t('passwall2.rules_week_sat') },
				{ value: '0', label: this.$t('passwall2.rules_week_sun') }
			]
		},
		hourOptions() {
			return Array.from({ length: 24 }, (_, t) => ({ value: String(t), label: `${String(t).padStart(2, '0')}:00` }))
		},
		intervalOptions() {
			return Array.from({ length: 24 }, (_, t) => t + 1).map((t) => ({ value: String(t), label: `${t} ${this.$t('passwall2.rules_hour')}` }))
		},
		geoipUrlOptions() {
			return [
				{ value: 'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat', label: 'Loyalsoldier/geoip' },
				{ value: 'https://gh-proxy.org/https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat', label: 'Loyalsoldier/geoip (gh-proxy)' },
				{ value: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat', label: 'Loyalsoldier/geoip (CDN)' },
				{ value: 'https://github.com/MetaCubeX/meta-rules-dat/releases/latest/download/geoip.dat', label: 'MetaCubeX/geoip' }
			]
		},
		geositeUrlOptions() {
			return [
				{ value: 'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat', label: 'Loyalsoldier/geosite' },
				{ value: 'https://gh-proxy.org/https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat', label: 'Loyalsoldier/geosite (gh-proxy)' },
				{ value: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat', label: 'Loyalsoldier/geosite (CDN)' },
				{ value: 'https://github.com/MetaCubeX/meta-rules-dat/releases/latest/download/geosite.dat', label: 'MetaCubeX/geosite' }
			]
		},
		// @global_rules[0] 单例：geo 资源地址 + 自动更新(周期 depends auto_update)
		rulesSchema() {
			return [
				{ key: 'auto_update', label: this.$t('passwall2.rules_auto_update'), type: 'switch', default: '0', group: 'gr', groupLabel: this.$t('passwall2.rules_settings') },
				{ key: 'week_update', label: this.$t('passwall2.rules_week_update'), type: 'select', options: this.weekOptions, default: '7', depends: { key: 'auto_update', value: '1' }, group: 'gr' },
				{ key: 'time_update', label: this.$t('passwall2.rules_time_update'), type: 'select', options: this.hourOptions, default: '0', depends: [{ key: 'auto_update', value: '1' }, { key: 'week_update', value: ['0', '1', '2', '3', '4', '5', '6', '7'] }], group: 'gr' },
				{ key: 'interval_update', label: this.$t('passwall2.rules_interval_update'), type: 'select', options: this.intervalOptions, default: '2', depends: [{ key: 'auto_update', value: '1' }, { key: 'week_update', value: '8' }], group: 'gr' },
				{ key: 'v2ray_location_asset', label: this.$t('passwall2.rules_asset'), type: 'text', placeholder: '/usr/share/v2ray/', default: '/usr/share/v2ray/', group: 'gr' },
				{ key: 'geoip_url', label: this.$t('passwall2.rules_geoip_url'), type: 'text', options: this.geoipUrlOptions, group: 'gr' },
				{ key: 'geosite_url', label: this.$t('passwall2.rules_geosite_url'), type: 'text', options: this.geositeUrlOptions, group: 'gr' }
			]
		},
		// @shunt_rules 多例：protocol/network 多值 + domain_list/ip_list 多行 textarea + invert
		shuntSchema() {
			return [
				{ key: 'remarks', label: this.$t('passwall2.shunt_remarks'), type: 'text', required: true, group: 'sr', groupLabel: this.$t('passwall2.edit_shunt') },
				{ key: 'protocol', label: this.$t('passwall2.shunt_protocol'), type: 'multiSelect', options: this.protocolOptions, uciList: true, group: 'sr' },
				{ key: 'network', label: this.$t('passwall2.shunt_network'), type: 'select', options: this.networkOptions, default: 'tcp,udp', group: 'sr' },
				{ key: 'domain_list', label: this.$t('passwall2.shunt_domain'), type: 'textarea', placeholder: this.$t('passwall2.shunt_domain_hint'), group: 'sr' },
				{ key: 'ip_list', label: this.$t('passwall2.shunt_ip'), type: 'textarea', placeholder: this.$t('passwall2.shunt_ip_hint'), group: 'sr' },
				{ key: 'invert', label: this.$t('passwall2.shunt_invert'), type: 'switch', group: 'sr' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('passwall2.title') })
		this.load()
	},
	methods: {
		async load() {
			this.loading = true
			try {
				const data = await UciRpc.get('passwall2')
				let globalS = null
				let forwarding = null
				const nodes = {}
				const nodeMap = {}
				let rulesS = null
				const shuntRules = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s['.type'] === 'global' && !globalS) globalS = { ...s, '.name': name }
					else if (s['.type'] === 'global_forwarding' && !forwarding) forwarding = s
					else if (s['.type'] === 'nodes') { nodes[name] = s.remarks || name; nodeMap[name] = s.remarks || name }
					else if (s['.type'] === 'global_rules' && !rulesS) rulesS = { ...s, '.name': name }
					else if (s['.type'] === 'shunt_rules') shuntRules.push({ ...s, '.name': name })
				})
				this.globalSection = globalS || {}
				this.enabled = !!(globalS && globalS.enabled === '1')
				const node = globalS ? globalS.node : ''
				this.nodeLabel = node ? (nodeMap[node] || node) : ''
				this.nodeMap = nodeMap
				this.mode = forwarding ? forwarding.tcp_proxy_way : ''
				this.nodeOptions = Object.keys(nodes).map(name => ({ value: name, label: nodes[name] }))
				this.rulesSection = rulesS || {}
				this.shuntRules = shuntRules
				this.allSectionOrder = Object.keys(data || {})
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		// 主开关(高危:透明代理 reload 致 LAN 短暂断网,二次确认 + rollback 兜底)
		toggle(on) {
			if (!this.globalSection['.name']) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
				return
			}
			uni.showModal({
				title: this.$t('common.save'),
				content: this.$t('common.risk_network_warning'),
				confirmText: this.$t('common.confirm'),
				cancelText: this.$t('common.cancel'),
				confirmColor: '#e64646',
				success: async (r) => {
					if (!r.confirm) return
					const prev = this.enabled
					this.enabled = on
					try {
						await UciRpc.setCommit('passwall2', this.globalSection['.name'], { enabled: on ? '1' : '0' })
						try { await UciRpc.apply('passwall2') } catch (e) { /* apply 失败不阻断，配置已落盘 */ }
					} catch (e) {
						this.enabled = prev
						uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
					}
				}
			})
		},
		openGlobal() {
			if (!this.globalSection['.name']) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
				return
			}
			this.$refs.globalEditor.openEdit(this.globalSection)
		},
		onSaved() { this.load() },
		// @global_rules[0] 单例编辑（geo 资源 + 自动更新周期）
		openRules() {
			if (!this.rulesSection['.name']) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
				return
			}
			this.$refs.rulesEditor.openEdit(this.rulesSection)
		},
		addShunt() { this.$refs.shuntEditor.openCreate() },
		editShunt(r) { this.$refs.shuntEditor.openEdit(r) },
		// @shunt_rules 排序(优先级，越靠前优先级越高)：rpcd uci.order 全量重排(与 luci uci.callOrder 同)。
		// 取 load 时缓存的全量 section 顺序，交换两个相邻 shunt name 后整体 order，其他 section 位置不变。
		async moveShunt(index, dir) {
			const target = dir === 'up' ? index - 1 : index + 1
			if (target < 0 || target >= this.shuntRules.length) return
			const nameA = this.shuntRules[index]['.name']
			const nameB = this.shuntRules[target]['.name']
			const order = [...this.allSectionOrder]
			const ia = order.indexOf(nameA)
			const ib = order.indexOf(nameB)
			if (ia < 0 || ib < 0) return
			order[ia] = nameB
			order[ib] = nameA
			try {
				await UciRpc.reorder('passwall2', order)
				await UciRpc.commit('passwall2')
				this.load()
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			}
		},
		shuntLine(r) {
			const parts = []
			const proto = Array.isArray(r.protocol) ? r.protocol.join('/') : (r.protocol || '')
			const net = r.network || ''
			const protoNet = [proto, net].filter(Boolean).join('/')
			if (protoNet) parts.push(protoNet)
			if (r.domain_list) parts.push(this.$t('passwall2.shunt_domain'))
			if (r.ip_list) parts.push(this.$t('passwall2.shunt_ip'))
			if (String(r.invert) === '1') parts.push('invert')
			return parts.join(' · ')
		},
		// 外部浏览器打开路由器 luci passwall2 页（luci admin 无 URL token，用户需手动登录管理完整配置）
		openExternal() {
			const d = DeviceManager.getCurrentDevice() || {}
			const proto = d.useHttps ? 'https' : 'http'
			const host = DeviceManager.formatHostForUrl(d.ip)
			const url = `${proto}://${host}:${d.port}/cgi-bin/luci/admin/services/passwall2`
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
				plus.runtime.openURL(url)
			} else {
				uni.setClipboardData({ data: url })
				uni.showToast({ title: this.$t('passwall2.copied_url'), icon: 'none' })
			}
			// #endif
			// #ifdef H5
			window.open(url, '_blank')
			// #endif
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.kv { display: flex; align-items: center; justify-content: space-between; padding: $oa-sp-1 0; border-bottom: 1rpx solid $oa-hairline; }
.kv--last { border-bottom: none; }
.kv__k { font-size: $oa-fs-label; color: $oa-text-muted; }
.kv__v { font-size: $oa-fs-body; color: $oa-text; font-weight: 500; max-width: 60%; text-align: right; word-break: break-all; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; }
.toggle-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.toggle-label { font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.toggle-sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
.adv-hint { display: block; font-size: $oa-fs-caption; color: $oa-text-muted; line-height: 1.5; margin-bottom: $oa-sp-2; }
.adv-actions { display: flex; }
.sec-head { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; margin: $oa-sp-3 0 $oa-sp-2; }
.sec-head__title { font-size: $oa-fs-title; font-weight: 600; color: $oa-text; }
.shunt-row { display: flex; align-items: center; gap: $oa-sp-2; padding: $oa-sp-2 $oa-sp-3; }
.shunt-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.shunt-title { font-size: $oa-fs-body; font-weight: 500; color: $oa-text; }
.shunt-sub { font-size: $oa-fs-caption; color: $oa-text-muted; }
.shunt-op { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.shunt-move { font-size: $oa-fs-caption; color: $oa-text-subtle; padding: 4rpx $oa-sp-2; }
.shunt-move.is-disabled { opacity: 0.3; }
</style>
