<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<oa-card :title="$t('samba.global')" divider padding="lg" @click.native="editGlobal">
				<view class="kv"><text class="kv__k">{{ $t('samba.workgroup') }}</text><text class="kv__v">{{ global.workgroup || 'WORKGROUP' }}</text></view>
				<view class="kv"><text class="kv__k">{{ $t('samba.interface') }}</text><text class="kv__v">{{ formatInterface(global.interface) }}</text></view>
				<view class="kv kv--last"><text class="kv__k">{{ $t('samba.macos') }}</text><oa-status-badge :type="global.macos === '1' ? 'up' : 'neutral'" :text="global.macos === '1' ? $t('common.enabled') : $t('common.disabled')" /></view>
			</oa-card>

			<view class="page-actions">
				<text class="page-hint">{{ $t('samba.desc') }}</text>
				<oa-button type="positive" size="small" @click="addShare">{{ $t('samba.add_share') }}</oa-button>
			</view>

			<oa-empty v-if="shares.length === 0" :text="$t('samba.empty')" />

			<oa-card v-for="s in shares" :key="s['.name']" padding="lg">
				<view class="share" @click="editShare(s)">
					<view class="share__main">
						<text class="share__name">{{ s.name || s['.name'] }}</text>
						<text class="share__path">{{ s.path || '-' }}</text>
						<view class="share__sub">
							<oa-status-badge :type="s.read_only === 'yes' ? 'info' : 'up'" :text="s.read_only === 'yes' ? $t('samba.read_only') : $t('samba.read_write')" />
							<oa-status-badge v-if="s.guest_ok === 'yes'" type="warn" :text="$t('samba.guest')" />
						</view>
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list ref="globalEditor" config="samba4" section-type="samba" :allow-delete="false" :schema="globalSchema" init-script="samba4" :candidates="candidates" :create-title="$t('samba.edit_global')" :edit-title="$t('samba.edit_global')" @saved="load" />
		<oa-uci-list ref="shareEditor" config="samba4" section-type="sambashare" :schema="shareSchema" init-script="samba4" :create-title="$t('samba.add_share')" :edit-title="$t('samba.edit_share')" @saved="load" @deleted="load" />
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
export default {
	data() {
		return {
			loading: false,
			global: {},
			shares: [],
			candidates: { interfaces: [] }
		}
	},
	computed: {
		globalSchema() {
			return [
				{ key: 'interface', label: this.$t('samba.interface'), type: 'multiSelect', candidates: 'interfaces' },
				{ key: 'workgroup', label: this.$t('samba.workgroup'), type: 'text', placeholder: 'WORKGROUP' },
				{ key: 'description', label: this.$t('samba.description'), type: 'text' },
				{ key: 'enable_extra_tuning', label: this.$t('samba.extra_tuning'), type: 'switch' },
				{ key: 'disable_async_io', label: this.$t('samba.force_sync_io'), type: 'switch' },
				{ key: 'macos', label: this.$t('samba.macos'), type: 'switch' },
				{ key: 'allow_legacy_protocols', label: this.$t('samba.legacy_protocols'), type: 'switch' },
				{ key: 'disable_netbios', label: this.$t('samba.disable_netbios'), type: 'switch' },
				{ key: 'disable_ad_dc', label: this.$t('samba.disable_ad_dc'), type: 'switch' },
				{ key: 'disable_winbind', label: this.$t('samba.disable_winbind'), type: 'switch' }
			]
		},
		shareSchema() {
			return [
				{ key: 'name', label: this.$t('samba.share_name'), type: 'text', required: true },
				{ key: 'path', label: this.$t('samba.share_path'), type: 'text', required: true, placeholder: '/mnt/sda1/share', validate: { pattern: '^[A-Za-z0-9/_.\-]+$' } },
				{ key: 'browseable', label: this.$t('samba.browseable'), type: 'switch', onValue: 'yes', offValue: 'no', default: 'yes' },
				{ key: 'read_only', label: this.$t('samba.read_only'), type: 'switch', onValue: 'yes', offValue: 'no', default: 'no' },
				{ key: 'force_root', label: this.$t('samba.force_root'), type: 'switch' },
				{ key: 'users', label: this.$t('samba.users'), type: 'text' },
				{ key: 'guest_ok', label: this.$t('samba.guest_ok'), type: 'switch', onValue: 'yes', offValue: 'no', default: 'yes' },
				{ key: 'guest_only', label: this.$t('samba.guest_only'), type: 'switch', onValue: 'yes', offValue: 'no', default: 'no' },
				{ key: 'inherit_owner', label: this.$t('samba.inherit_owner'), type: 'switch', onValue: 'yes', offValue: 'no', default: 'no' },
				{ key: 'create_mask', label: this.$t('samba.create_mask'), type: 'text', default: '0666', validate: { pattern: '^[0-7]{4}$' } },
				{ key: 'dir_mask', label: this.$t('samba.dir_mask'), type: 'text', default: '0777', validate: { pattern: '^[0-7]{4}$' } },
				{ key: 'vfs_objects', label: this.$t('samba.vfs_objects'), type: 'text' },
				{ key: 'timemachine', label: this.$t('samba.timemachine'), type: 'switch' },
				{ key: 'timemachine_maxsize', label: this.$t('samba.tm_maxsize'), type: 'text', validate: { pattern: '^[0-9]{1,5}$' } }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('samba.title') })
		this.load()
		this.loadInterfaces()
	},
	methods: {
		async load() {
			this.loading = this.shares.length === 0
			try {
				const data = await UciRpc.get('samba4')
				const global = {}
				const shares = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s['.type'] === 'samba') Object.assign(global, s, { '.name': name })
					else if (s['.type'] === 'sambashare') shares.push({ ...s, '.name': name })
				})
				this.global = global
				this.shares = shares
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadInterfaces() {
			try {
				const res = await UciRpc.getInterfaceCandidates()
				this.candidates = { interfaces: res.interfaces || [] }
			} catch (e) { /* 候选缺失退化为空 */ }
		},
		formatInterface(v) {
			const arr = String(v || 'lan').split(/\s+/).filter(Boolean)
			return arr.length ? arr.join(' / ') : 'lan'
		},
		editGlobal() {
			if (!this.global['.name']) return
			this.$refs.globalEditor.openEdit(this.global)
		},
		addShare() { this.$refs.shareEditor.openCreate() },
		editShare(s) { this.$refs.shareEditor.openEdit(s) }
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.page-actions { display: flex; align-items: center; justify-content: space-between; gap: $oa-sp-2; margin-bottom: $oa-sp-2; }
.page-hint { flex: 1; min-width: 0; font-size: $oa-fs-caption; color: $oa-text-muted; line-height: 1.4; }
.kv { display: flex; align-items: center; justify-content: space-between; padding: $oa-sp-1 0; border-bottom: 1rpx solid $oa-hairline; }
.kv--last { border-bottom: none; }
.kv__k { font-size: $oa-fs-label; color: $oa-text-muted; }
.kv__v { font-size: $oa-fs-body; color: $oa-text; font-weight: 500; }
.share { display: flex; align-items: center; }
.share__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.share__name { font-size: $oa-fs-body; font-weight: 600; color: $oa-text; }
.share__path { font-size: $oa-fs-caption; color: $oa-text-muted; word-break: break-all; }
.share__sub { display: flex; gap: 8rpx; margin-top: 4rpx; }
</style>
