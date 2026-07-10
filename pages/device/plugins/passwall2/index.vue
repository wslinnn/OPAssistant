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

			<oa-card :title="$t('passwall2.advanced')" divider padding="lg">
				<text class="adv-hint">{{ $t('passwall2.advanced_hint') }}</text>
				<view class="adv-actions">
					<oa-button type="neutral" block @click="openExternal">{{ $t('passwall2.open_web') }}</oa-button>
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
			loading: false,
			globalSection: {},
			enabled: false,
			nodeLabel: '',
			mode: ''
		}
	},
	computed: {
		modeLabel() {
			if (this.mode === 'tproxy') return 'TProxy'
			if (this.mode === 'redirect') return 'Redirect'
			return this.mode || '-'
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
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s['.type'] === 'global' && !globalS) globalS = { ...s, '.name': name }
					else if (s['.type'] === 'global_forwarding' && !forwarding) forwarding = s
					else if (s['.type'] === 'nodes') nodes[name] = s.remarks || s['.name']
				})
				this.globalSection = globalS || {}
				this.enabled = !!(globalS && globalS.enabled === '1')
				const node = globalS ? globalS.node : ''
				this.nodeLabel = node ? (nodes[node] || node) : ''
				this.mode = forwarding ? forwarding.tcp_proxy_way : ''
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		// 主开关：uci set + commit + apply（ubus uci.commit 不触发 ucitrack，须显式 reload passwall2）
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
</style>
