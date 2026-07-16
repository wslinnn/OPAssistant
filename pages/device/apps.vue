<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<view v-for="g in groups" :key="g.id" class="app-section">
				<text class="section-title">{{ g.label }}</text>
				<view class="app-grid">
					<view class="app-item" v-for="app in g.apps" :key="app.id" @click="onAppClick(app)">
						<view class="app-icon">
							<text v-if="app.fa" class="fa" :class="app.fa"></text>
							<text v-else class="app-abbr">{{ app.abbr }}</text>
						</view>
						<view class="app-name">
							<text class="name-text">{{ app.name }}</text>
						</view>
					</view>
				</view>
			</view>
			<oa-empty v-if="groups.length === 0" :text="$t('apps.no_plugins')" />
		</view>
	</view>
</template>

<script>
import DeviceManager from '@/utils/device-manager.js'

// 固定系统工具（始终显示，Font Awesome 图标）
const TOOLS = [
	{ id: 'route', group: 'tools', fa: 'fa-route', page: '/pages/device/apps/route/index' },
	{ id: 'process', group: 'tools', fa: 'fa-microchip', page: '/pages/device/apps/process/index' },
	{ id: 'startup', group: 'tools', fa: 'fa-power-off', page: '/pages/device/apps/startup/index' },
	{ id: 'diag', group: 'tools', fa: 'fa-wave-square', page: '/pages/device/apps/diag/index' },
	{ id: 'syslog', group: 'tools', fa: 'fa-file-lines', page: '/pages/device/apps/syslog/index' },
	{ id: 'conntrack', group: 'tools', fa: 'fa-link', page: '/pages/device/apps/conntrack/index' },
	{ id: 'toolbox', group: 'tools', fa: 'fa-toolbox', page: '/pages/device/apps/toolbox/index' },
	{ id: 'reboot', group: 'tools', fa: 'fa-rotate-right', page: '/pages/device/apps/reboot/index' }
]

// luci 插件：fixed=系统自带必显示，否则由 DeviceManager.getInstalledPlugins(config) 探测；i18n 为各插件 locale section 名
const PLUGINS = [
	{ id: 'arpbind', i18n: 'arpbind', config: 'arpbind', group: 'network', fa: 'fa-thumbtack', page: '/pages/device/plugins/arpbind/index' },
	{ id: 'firewall', i18n: 'firewall', fixed: true, group: 'network', fa: 'fa-shield-halved', page: '/pages/device/plugins/firewall/index' },
	{ id: 'upnp', i18n: 'upnp', config: 'upnpd', group: 'network', abbr: 'UPnP', page: '/pages/device/plugins/upnp/index' },
	{ id: 'wolultra', i18n: 'wolultra', config: 'wolultra', group: 'network', abbr: 'WOL', page: '/pages/device/plugins/wolultra/index' },
	{ id: 'samba4', i18n: 'samba', config: 'samba4', group: 'storage', fa: 'fa-share-nodes', page: '/pages/device/plugins/samba4/index' },
	{ id: 'cifs', i18n: 'cifs', config: 'cifs-mount', group: 'storage', fa: 'fa-hard-drive', page: '/pages/device/plugins/cifs-mount/index' },
	{ id: 'usb-printer', i18n: 'usb_printer', config: 'usb_printer', group: 'storage', fa: 'fa-print', page: '/pages/device/plugins/usb-printer/index' },
	{ id: 'autoreboot', i18n: 'autoreboot', config: 'autoreboot', group: 'system', fa: 'fa-clock', page: '/pages/device/plugins/autoreboot/index' },
	{ id: 'passwall2', i18n: 'passwall2', config: 'passwall2', group: 'proxy', abbr: 'PW', page: '/pages/device/plugins/passwall2/index' }
]

const GROUPS = ['tools', 'network', 'storage', 'system', 'proxy']

export default {
	data() {
		return {
			loading: false,
			installed: null,
			navRetryTimer1: null,
			navRetryTimer2: null
		}
	},
	computed: {
		// 按 group 聚合可见 app（tools 固定；插件 fixed 或 installed[config]）
		groups() {
			const all = [
				...TOOLS.map(t => ({ ...t, name: this.$t('apps.' + t.id), visible: true })),
				...PLUGINS.map(p => ({
					...p,
					name: this.$t(p.i18n + '.title'),
					visible: p.fixed || (this.installed ? !!this.installed[p.config] : false)
				}))
			]
			return GROUPS.map(id => ({
				id,
				label: this.$t('apps.group_' + id),
				apps: all.filter(a => a.group === id && a.visible)
			})).filter(g => g.apps.length > 0)
		}
	},
	onLoad() {
		this.applyNavigationBar()
	},
	onShow() {
		this.applyNavigationBar()
		this.loadInstalled()
	},
	onTabItemTap() {
		this.applyNavigationBar()
	},
	onHide() {
		this.clearNavRetryTimer()
	},
	onUnload() {
		this.clearNavRetryTimer()
	},
	onPullDownRefresh() { Promise.resolve(this.loadInstalled()).finally(() => uni.stopPullDownRefresh()) },
	methods: {
		applyNavigationBar() {
			const title = this.$t('apps.title') || 'App Center'
			const apply = () => {
				uni.setNavigationBarTitle({ title })
				uni.setNavigationBarColor({
					frontColor: '#000000',
					backgroundColor: '#F8F8F8'
				})
			}
			apply()
			this.$nextTick(() => {
				apply()
			})
			this.clearNavRetryTimer()
			this.navRetryTimer1 = setTimeout(() => {
				apply()
			}, 80)
			this.navRetryTimer2 = setTimeout(() => {
				apply()
			}, 220)
		},
		clearNavRetryTimer() {
			if (this.navRetryTimer1) {
				clearTimeout(this.navRetryTimer1)
				this.navRetryTimer1 = null
			}
			if (this.navRetryTimer2) {
				clearTimeout(this.navRetryTimer2)
				this.navRetryTimer2 = null
			}
		},
		async loadInstalled() {
			if (this.installed === null) this.loading = true
			try {
				this.installed = await DeviceManager.getInstalledPlugins()
			} catch (e) {
				this.installed = this.installed || {}
			} finally {
				this.loading = false
			}
		},
		onAppClick(app) {
			if (app.page) {
				uni.navigateTo({ url: app.page })
			} else {
				uni.showToast({ title: this.$t('apps.coming_soon'), icon: 'none' })
			}
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.app-section {
	margin-bottom: $oa-sp-1;
}

.section-title {
	display: block;
	font-size: $oa-fs-label;
	font-weight: 600;
	color: $oa-text-muted;
	padding: $oa-sp-3 $oa-sp-3 $oa-sp-1;
}

.app-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: $oa-sp-3;
	padding: 0 $oa-sp-2 $oa-sp-2;
}

.app-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	background: transparent;
	border-radius: 0;
	padding: 0;
	box-shadow: none;
	min-height: auto;
	transition: all 0.2s ease;
}

.app-item:active {
	transform: scale(0.9);
}

.app-icon {
	width: 100rpx;
	height: 100rpx;
	margin-bottom: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $oa-brand;
	border-radius: $oa-radius-lg;
	box-shadow: $oa-shadow-sm;
}

.app-icon .fa {
	font-size: 48rpx;
	color: #FFFFFF;
}

.app-abbr {
	font-size: $oa-fs-caption;
	color: #FFFFFF;
	font-weight: 700;
}

.app-name {
	text-align: center;
	width: 100%;
}

.name-text {
	font-size: 22rpx;
	color: $oa-text;
	font-weight: 400;
	line-height: 1.3;
	word-break: break-all;
}
</style>
