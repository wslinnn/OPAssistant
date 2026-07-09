<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<view class="page-actions">
				<text class="page-hint">{{ $t('cifs.desc') }}</text>
				<oa-button type="positive" size="small" @click="add">{{ $t('cifs.add_mount') }}</oa-button>
			</view>

			<oa-empty v-if="sections.length === 0" :text="$t('cifs.empty')" />

			<oa-card v-for="s in sections" :key="s['.name']" padding="lg">
				<view class="cifs">
					<view class="cifs__main" @click="edit(s)">
						<text class="cifs__share">//{{ s.server || '?' }}{{ s.remote_path || '' }}</text>
						<view class="cifs__sub">
							<text class="cifs__local">→ {{ s.local_path || '/mnt' }}</text>
							<oa-status-badge v-if="s.enabled === '1'" type="up" :text="$t('common.enabled')" />
							<oa-status-badge v-else type="neutral" :text="$t('common.disabled')" />
						</view>
					</view>
					<view class="cifs__switch" @click.stop="">
						<oa-switch :value="s.enabled === '1'" @input="onToggle(s, $event)" />
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list
			ref="editor"
			config="cifs-mount"
			section-type="mount"
			:schema="schema"
			init-script="cifs-mount"
			:create-title="$t('cifs.add_mount')"
			:edit-title="$t('cifs.edit_mount')"
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
			sections: []
		}
	},
	computed: {
		schema() {
			return [
				{ key: 'enabled', label: this.$t('cifs.enable'), type: 'switch', default: '0', group: 'base', groupLabel: this.$t('cifs.g_base') },
				{ key: 'server', label: this.$t('cifs.server'), type: 'text', required: true, group: 'base', placeholder: '192.168.1.1' },
				{ key: 'remote_path', label: this.$t('cifs.remote_path'), type: 'text', required: true, group: 'base', placeholder: '/share' },
				{ key: 'local_path', label: this.$t('cifs.local_path'), type: 'text', options: [{ value: '/mnt', label: '/mnt' }], default: '/mnt', required: true, group: 'base', placeholder: '/mnt' },
				{ key: 'smb_version', label: this.$t('cifs.smb_version'), type: 'select', options: this.smbVersionOptions, default: '', group: 'adv', groupLabel: this.$t('cifs.g_adv') },
				{ key: 'iocharset', label: this.$t('cifs.charset'), type: 'select', options: [{ value: '-', label: this.$t('cifs.charset_none') }, { value: 'utf8', label: 'UTF-8' }], default: 'utf8', required: true, group: 'adv' },
				{ key: 'ro', label: this.$t('cifs.read_only'), type: 'switch', default: '0', group: 'adv' },
				{ key: 'username', label: this.$t('cifs.username'), type: 'text', default: 'guest', group: 'auth', groupLabel: this.$t('cifs.g_auth') },
				{ key: 'password', label: this.$t('cifs.password'), type: 'password', group: 'auth' },
				{ key: 'workgroup', label: this.$t('cifs.workgroup'), type: 'text', default: 'WORKGROUP', group: 'auth' },
				{ key: 'options', label: this.$t('cifs.options'), type: 'dynamicList', group: 'auth', validate: { pattern: '^[A-Za-z0-9_=,.-]+$' } }
			]
		},
		smbVersionOptions() {
			return [
				{ value: '', label: this.$t('cifs.smb_default') },
				{ value: '1.0', label: 'SMBv1' },
				{ value: '2.0', label: 'SMBv2' },
				{ value: '2.1', label: 'SMBv2.1' },
				{ value: '3.0', label: 'SMBv3' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('cifs.title') })
		this.load()
	},
	methods: {
		async load() {
			this.loading = this.sections.length === 0
			try {
				const data = await UciRpc.get('cifs-mount')
				const list = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s && s['.type'] === 'mount') list.push({ ...s, '.name': name })
				})
				this.sections = list
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async onToggle(s, on) {
			const v = on ? '1' : '0'
			try {
				await UciRpc.setCommit('cifs-mount', s['.name'], { enabled: v })
				try { await UciRpc.apply('cifs-mount') } catch (e) {}
				this.$set(s, 'enabled', v)
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
.cifs {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.cifs__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.cifs__share {
	font-size: $oa-fs-body;
	font-weight: 600;
	color: $oa-text;
	word-break: break-all;
}
.cifs__sub {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.cifs__local {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.cifs__switch {
	flex-shrink: 0;
}
</style>
