
<template>
	<view class="container">

		<page-tab :tabs="tab_list" v-model="currentTab" />

		<view v-if="currentTab === 0">
			<oa-card v-for="iface in interfaceList" :key="iface.name" padding="lg" :divider="true">
				<view slot="header" class="iface-title">{{ iface.name.toUpperCase() }}<span v-if="iface.l3_device">({{ iface.l3_device }})</span></view>
				<view slot="actions">
					<oa-status-badge type="info" :text="iface.proto || '-'" />
				</view>
				<view class="iface-row" v-if="iface.mac && iface.mac !== '-'">
					<text class="label">{{ $t('network.mac') }}：</text><oa-copy-text class="value" :text="iface.mac">{{ iface.mac }}</oa-copy-text>
				</view>
				<view class="iface-row">
					<text class="label">{{ $t('network.traffic_rx_tx') }}：</text>
					<text class="value">{{ formatBytes(iface.rx_bytes) }} / {{ formatBytes(iface.tx_bytes) }}</text>
				</view>
				<view class="iface-row" v-if="iface.ipv4"><text class="label">{{ $t('network.ipv4') }}：</text><oa-copy-text class="value" :text="iface.ipv4">{{ iface.ipv4 }}</oa-copy-text></view>
				<view class="iface-row ipv6-row" v-if="hasIpv6Data(iface)">
					<text class="label">{{ $t('network.ipv6') }}：</text>
					<view class="value ipv6-value-wrap">
						<text class="ipv6-text">{{ getShortAddress(iface.ipv6List) }}</text>
						<image v-if="hasIpv6MoreDetail(iface)" class="ipv6-eye" src="/static/eye.png" mode="aspectFit" @click.stop="showIpv6Detail(iface)" />
					</view>
				</view>
				<view class="iface-row ipv6-row" v-if="iface.pdAssignList && iface.pdAssignList.length">
					<text class="label">{{ $t('network.ipv6_pd_assign') }}：</text>
					<view class="value ipv6-value-wrap">
						<text class="ipv6-text">{{ getShortAddress(iface.pdAssignList) }}</text>
						<image v-if="hasMoreAddress(iface.pdAssignList)" class="ipv6-eye" src="/static/eye.png" mode="aspectFit" @click.stop="showAddressDetail($t('network.ipv6_pd_assign'), iface.pdAssignList)" />
					</view>
				</view>
				<view class="iface-row" v-if="iface.gateway"><text class="label">{{ $t('network.gateway') }}：</text><oa-copy-text class="value" :text="iface.gateway">{{ iface.gateway }}</oa-copy-text></view>
				<view class="iface-row" v-if="iface.dnsList && iface.dnsList.length">
					<text class="label">{{ $t('network.dns') }}：</text>
					<view class="value" style="text-align:right;">
						<oa-copy-text v-for="dns in iface.dnsList" :key="dns" :text="dns" class="dns-line">{{ dns }}</oa-copy-text>
					</view>
				</view>
			</oa-card>
		</view>

		<view v-else-if="currentTab === 1">
			<view v-for="group in deviceGroups" :key="group.type" class="dev-group">
				<view class="dev-group-title">{{ group.label }} ({{ group.count }})</view>
				<oa-card v-for="dev in group.devices" :key="dev.name" padding="lg" :divider="true">
					<view slot="header" class="dev-title">{{ dev.name }}</view>
					<view slot="actions">
						<oa-status-badge :type="dev.up ? 'up' : 'down'" :text="dev.up ? $t('network.up') : $t('network.down')" />
					</view>
					<view class="dev-row"><text class="label">{{ $t('network.mac') }}：</text><oa-copy-text class="value" :text="dev.macaddr">{{ dev.macaddr || '-' }}</oa-copy-text></view>
					<view v-if="group.type === 'bridge' && dev.ports && dev.ports.length" class="dev-row">
						<text class="label">{{ $t('network.bridge_ports') }}：</text><oa-copy-text class="value" :text="dev.ports.join(', ')">{{ dev.ports.join(', ') }}</oa-copy-text>
					</view>
					<view class="dev-row"><text class="label">{{ $t('network.mtu') }}：</text><oa-copy-text class="value" :text="dev.mtu">{{ dev.mtu || '-' }}</oa-copy-text></view>
					<view class="dev-row"><text class="label">{{ $t('network.receive') }}：</text><text class="value">{{ formatBytes(dev.rx_bytes) }} ({{ formatPacketCount(dev.rx_packets) }} {{ $t('network.packets') }}.)</text></view>
					<view class="dev-row"><text class="label">{{ $t('network.send') }}：</text><text class="value">{{ formatBytes(dev.tx_bytes) }} ({{ formatPacketCount(dev.tx_packets) }} {{ $t('network.packets') }}.)</text></view>
				</oa-card>
			</view>
		</view>

		<view v-else-if="currentTab === 2">
			<oa-empty v-if="wirelessList.length === 0" :text="$t('network.wireless_loading')" />
			<oa-card v-for="radio in wirelessList" :key="radio.name" padding="lg" :divider="true">
				<view slot="header" class="wireless-radio-title">{{ radio.name }}</view>
				<view slot="actions">
					<text class="wireless-radio-edit" @click="goWifiSettings">{{ $t('wifi.settings') }} ›</text>
				</view>
				<view class="wireless-radio-row"><text class="label">{{ $t('network.chip') }}：</text><oa-copy-text class="value" :text="radio.chip">{{ radio.chip }}</oa-copy-text></view>
				<view class="wireless-radio-row"><text class="label">{{ $t('network.band') }}：</text><oa-copy-text class="value" :text="radio.band">{{ radio.band }}</oa-copy-text></view>
				<view class="wireless-radio-row"><text class="label">{{ $t('network.channel') }}：</text><oa-copy-text class="value" :text="String(radio.channel)">{{ radio.channel }}</oa-copy-text></view>
				<view class="wireless-radio-row"><text class="label">{{ $t('network.protocol') }}：</text><oa-copy-text class="value" :text="'802.11' + radio.protocols">802.11{{ radio.protocols }}</oa-copy-text></view>
				<oa-card v-for="iface in radio.interfaces" :key="iface.ifname" padding="md" :divider="true">
					<view slot="header" class="wireless-iface-title">{{ $t('network.ssid') }}：{{ iface.ssid || '-' }}</view>
					<view slot="actions" class="wireless-iface-mode">{{ $t('network.mode') }}：{{ iface.mode || '-' }}</view>
					<view class="wireless-iface-row"><text class="label">{{ $t('network.bssid') }}：</text><oa-copy-text class="value" :text="iface.bssid">{{ iface.bssid }}</oa-copy-text></view>
					<view class="wireless-iface-row"><text class="label">{{ $t('network.signal') }}：</text><text class="value">{{ iface.signal }}</text></view>
					<view class="wireless-iface-row"><text class="label">{{ $t('network.bitrate') }}：</text><text class="value">{{ iface.bitrate }}</text></view>
					<view class="wireless-iface-row"><text class="label">{{ $t('network.encryption') }}：</text><oa-copy-text class="value" :text="iface.encryption">{{ iface.encryption }}</oa-copy-text></view>
				</oa-card>
			</oa-card>
		</view>

		<!-- IPv6 详情弹窗（短地址 + 眼睛图标触发） -->
		<uni-popup ref="ipv6DialogPopup" type="center" :mask-click="true">
			<view class="ipv6-dialog popup">
				<view class="ipv6-dialog-header">
					<text class="ipv6-dialog-title">{{ ipv6Dialog.title }}</text>
					<view class="ipv6-dialog-close" @click="closeIpv6Dialog"><text class="ipv6-dialog-close-text">X</text></view>
				</view>
				<scroll-view scroll-y="true" :show-scrollbar="false" class="ipv6-dialog-scroll">
					<view v-for="(section, sIdx) in ipv6Dialog.sections" :key="sIdx" class="ipv6-dialog-section">
						<text class="ipv6-dialog-section-title">{{ section.title }}</text>
						<view class="ipv6-dialog-list">
							<view v-for="(item, iIdx) in section.list" :key="iIdx" class="ipv6-dialog-item">
								<oa-copy-text class="ipv6-dialog-item-text" :text="item">{{ item }}</oa-copy-text>
							</view>
						</view>
					</view>
				</scroll-view>
				<view class="ipv6-dialog-footer">
					<view class="ipv6-dialog-btn" @click="closeIpv6Dialog"><text>OK</text></view>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
		import UciRpc from '@/utils/uci-rpc.js'
	import { formatBytes } from '@/utils/format.js'
	import PageTab from '@/components/PageTab.vue'

	export default {
		components: { PageTab },
		data() {
			return {
				currentTab: 0,
				interfaceList: [],
				deviceGroups: [],
				wirelessList: [],
				ipv6Dialog: { title: '', sections: [] }
			}
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.$t('network.title')
			})
			uni.setNavigationBarColor({
				frontColor: '#000000',
				backgroundColor: '#F8F8F8'
			})

			this.loadData()
		},
		onShow() {
			uni.setNavigationBarTitle({
				title: this.$t('network.title')
			})
			uni.setNavigationBarColor({
				frontColor: '#000000',
				backgroundColor: '#F8F8F8'
			})
		},
		computed: {
			tab_list() {
				return [
					{ value: 0, label: this.$t('network.interfaces') },
					{ value: 1, label: this.$t('network.devices') },
					{ value: 2, label: this.$t('network.wireless') }
				]
			}
		},
		methods: {
			formatBytes,

			goBack() {
				uni.reLaunch({
					url: '/pages/device_list'
				})
			},
			goWifiSettings() {
				uni.navigateTo({
					url: '/pages/device/plugins/wifi/index'
				})
			},
			loadData() {
				this.fetchInterfaces()
				this.fetchWireless()
			},
			fetchInterfaces() {
				Promise.all([
					UciRpc.callUbus('network.interface', 'dump', {}),
					UciRpc.callUbus('luci-rpc', 'getNetworkDevices', {})
				]).then(([ifacePayload, devMap]) => {
												let interfaces = (ifacePayload && ifacePayload.interface) || []
						let deviceMap = devMap || {}
						this.interfaceList = interfaces
							.filter(i => i.interface !== 'loopback' && i.up !== false)
							.map(i => {
								let ipv4 = ''
								let ipv6List = []
								let ipv6pdList = []
								let pdAssignList = []
								let dnsList = []
								if (i['ipv4-address'] && i['ipv4-address'].length > 0) {
									const ip = i['ipv4-address'][0]
									ipv4 = ip.address + '/' + ip.mask
								}
								if (i['ipv6-address'] && i['ipv6-address'].length > 0) {
									ipv6List = this.sortIpv6List(i['ipv6-address'].map(ip6 => ip6.address + '/' + ip6.mask))
								}
								if (i['ipv6-prefix'] && i['ipv6-prefix'].length > 0) {
									ipv6pdList = i['ipv6-prefix'].map(pd => {
										if (pd.address && pd.mask !== undefined) {
											return pd.address + '/' + pd.mask
										}
										return ''
									}).filter(Boolean)
								}
								if (i['ipv6-prefix-assignment'] && i['ipv6-prefix-assignment'].length > 0) {
									pdAssignList = i['ipv6-prefix-assignment'].map(pda => {
										if (pda['local-address'] && pda['local-address'].address && pda['local-address'].mask !== undefined) {
											return pda['local-address'].address + '/' + pda['local-address'].mask
										} else if (pda.address && pda.mask !== undefined) {
											return pda.address + '/' + pda.mask
										}
										return ''
									}).filter(Boolean)
								}
								if (i['dns-server'] && Array.isArray(i['dns-server']) && i['dns-server'].length > 0) {
									dnsList = i['dns-server']
								}
								let mac = '-'
								let rx_bytes = 0, rx_packets = 0, tx_bytes = 0, tx_packets = 0
								const dev = deviceMap[i.l3_device]
								if (dev) {
									mac = dev.mac || '-'
									rx_bytes = dev.stats ? dev.stats.rx_bytes : 0
									rx_packets = dev.stats ? dev.stats.rx_packets : 0
									tx_bytes = dev.stats ? dev.stats.tx_bytes : 0
									tx_packets = dev.stats ? dev.stats.tx_packets : 0
								}
								let gateway = ''
								if (i.route && Array.isArray(i.route)) {
									const gw = i.route.find(r => r.target === '0.0.0.0' && r.mask === 0)
									if (gw && gw.nexthop) gateway = gw.nexthop
								}
								return {
									name: i.interface,
									proto: i.proto,
									uptime: i.uptime,
									l3_device: i.l3_device,
									mac,
									rx_bytes,
									rx_packets,
									tx_bytes,
									tx_packets,
									ipv4,
									ipv6List,
									ipv6pdList,
									pdAssignList,
									gateway,
									dnsList
								}
							})

						const loopbackIface = interfaces.find(i => i.interface === 'loopback')
						if (loopbackIface) {
							let mac = '-'
							let rx_bytes = 0, rx_packets = 0, tx_bytes = 0, tx_packets = 0
							const dev = deviceMap[loopbackIface.l3_device]
							if (dev) {
								mac = dev.mac || '-'
								rx_bytes = dev.stats ? dev.stats.rx_bytes : 0
								rx_packets = dev.stats ? dev.stats.rx_packets : 0
								tx_bytes = dev.stats ? dev.stats.tx_bytes : 0
								tx_packets = dev.stats ? dev.stats.tx_packets : 0
							}
							let ipv4 = ''
							if (loopbackIface['ipv4-address'] && loopbackIface['ipv4-address'].length > 0) {
								const ip = loopbackIface['ipv4-address'][0]
								ipv4 = ip.address + '/' + ip.mask
							}
							let ipv6List = []
							if (loopbackIface['ipv6-address'] && loopbackIface['ipv6-address'].length > 0) {
								ipv6List = this.sortIpv6List(loopbackIface['ipv6-address'].map(ip6 => ip6.address + '/' + ip6.mask))
							}
							let ipv6pdList = []
							if (loopbackIface['ipv6-prefix'] && loopbackIface['ipv6-prefix'].length > 0) {
								ipv6pdList = loopbackIface['ipv6-prefix'].map(pd => {
									if (pd.address && pd.mask !== undefined) {
										return pd.address + '/' + pd.mask
									}
									return ''
								}).filter(Boolean)
							}
							let pdAssignList = []
							if (loopbackIface['ipv6-prefix-assignment'] && loopbackIface['ipv6-prefix-assignment'].length > 0) {
								pdAssignList = loopbackIface['ipv6-prefix-assignment'].map(pda => {
									if (pda['local-address'] && pda['local-address'].address && pda['local-address'].mask !== undefined) {
										return pda['local-address'].address + '/' + pda['local-address'].mask
									} else if (pda.address && pda.mask !== undefined) {
										return pda.address + '/' + pda.mask
									}
									return ''
								}).filter(Boolean)
							}
							let dnsList = []
							if (loopbackIface['dns-server'] && Array.isArray(loopbackIface['dns-server']) && loopbackIface['dns-server'].length > 0) {
								dnsList = loopbackIface['dns-server']
							}
							let gateway = ''
							if (loopbackIface.route && Array.isArray(loopbackIface.route)) {
								const gw = loopbackIface.route.find(r => r.target === '0.0.0.0' && r.mask === 0)
								if (gw && gw.nexthop) gateway = gw.nexthop
							}
							this.interfaceList.push({
								name: loopbackIface.interface,
								proto: loopbackIface.proto,
								uptime: loopbackIface.uptime,
								l3_device: loopbackIface.l3_device,
								mac,
								rx_bytes,
								rx_packets,
								tx_bytes,
								tx_packets,
								ipv4,
								ipv6List,
								ipv6pdList,
								pdAssignList,
								gateway,
								dnsList
							})
						}
						this.deviceGroups = this.generateDeviceGroups(deviceMap)
					}
				).catch(() => {})
			},
			fetchWireless() {
				this.wirelessList = [];
								UciRpc.callUbus('luci-rpc', 'getWirelessDevices', {})
				.then((radios) => {
												if (radios) {							this.wirelessList = Object.keys(radios).map(radioName => {
								const radio = radios[radioName];
								const iw = radio.iwinfo || {};
								return {
									name: radioName,
									chip: (iw.hardware && iw.hardware.name) || '-',
									band: radio.config && radio.config.band ? radio.config.band.toUpperCase() : '-',
									channel: iw.channel || radio.config.channel || '-',
									protocols: this.formatHwModes(iw.hwmodes_text, iw.hwmodes) || '-',
									interfaces: (radio.interfaces || []).map(iface => {
										const ifaceInfo = iface.iwinfo || {};
										let encryption = this.$t('network.no_encryption');
										if (ifaceInfo.encryption && ifaceInfo.encryption.enabled) {
											let wpa = '';
											if (Array.isArray(ifaceInfo.encryption.wpa) && ifaceInfo.encryption.wpa.length > 0) {
												wpa = ifaceInfo.encryption.wpa.map(v => v === 1 ? 'WPA' : v === 2 ? 'WPA2' : v === 3 ? 'WPA3' : v).join('+');
											}
											let auth = '';
											if (Array.isArray(ifaceInfo.encryption.authentication) && ifaceInfo.encryption.authentication.length > 0) {
												auth = ifaceInfo.encryption.authentication.map(a => a.toUpperCase()).join('+');
											}
											let ciphers = '';
											if (Array.isArray(ifaceInfo.encryption.ciphers) && ifaceInfo.encryption.ciphers.length > 0) {
												ciphers = ifaceInfo.encryption.ciphers.map(c => c.toUpperCase()).join('/');
											}
											let arr = [];
											if (wpa) arr.push(wpa.toUpperCase());
											if (auth) arr.push(auth);
											let encStr = arr.join(' ');
											if (ciphers) encStr += ' (' + ciphers + ')';
											encryption = encStr || this.$t('network.encrypted');
										}
										return {
											ifname: iface.ifname,
											ssid: ifaceInfo.ssid || '-',
											bssid: ifaceInfo.bssid || '-',
											mode: ifaceInfo.mode || iface.config?.mode || '-',
											signal: ifaceInfo.signal !== undefined ? ifaceInfo.signal + ' dBm' : '-',
											noise: ifaceInfo.noise !== undefined ? ifaceInfo.noise + ' dBm' : '-',
											bitrate: ifaceInfo.bitrate ? (ifaceInfo.bitrate / 1000).toFixed(1) + ' Mbit/s' : '-',
											encryption
										}
									})
								};
							});
						}
					}
				).catch(() => {});
			},
			generateDeviceGroups(deviceMap) {
				const typeMap = {
					bridge: this.$t('network.device_type_bridge'),
					ethernet: this.$t('network.device_type_ethernet'),
					wireless: this.$t('network.device_type_wireless'),
					vlan: this.$t('network.device_type_vlan'),
					tunnel: this.$t('network.device_type_tunnel'),
				}
				const groupMap = {}
				Object.values(deviceMap).forEach(d => {
					if (!d.up || d.name === 'lo') return
					let type = d.devtype || 'other'
					if (!typeMap[type]) type = 'other'
					if (!groupMap[type]) groupMap[type] = []
					groupMap[type].push({
						name: d.name,
						up: d.up,
						macaddr: d.mac,
						devtype: d.devtype,
						ports: d.ports || [],
						speed: d.link && d.link.speed ? d.link.speed : '',
						mtu: d.mtu,
						rx_bytes: d.stats ? d.stats.rx_bytes : 0,
						rx_packets: d.stats ? d.stats.rx_packets : 0,
						tx_bytes: d.stats ? d.stats.tx_bytes : 0,
						tx_packets: d.stats ? d.stats.tx_packets : 0
					})
				})
				if (groupMap.ethernet) {
					const ethList = groupMap.ethernet.filter(dev => dev.name.startsWith('eth'))
					const otherList = groupMap.ethernet.filter(dev => !dev.name.startsWith('eth'))
					groupMap.ethernet = [...ethList, ...otherList]
				}
				const groupArr = Object.keys(groupMap).map(type => ({
					type,
					label: typeMap[type] || this.$t('network.other'),
					count: groupMap[type].length,
					devices: groupMap[type]
				}))
				// bridge 最前、other 最后、其余居中
				groupArr.sort((a, b) => {
					if (a.type === 'bridge') return -1
					if (b.type === 'bridge' || a.type === 'other') return 1
					if (b.type === 'other') return -1
					return 0
				})
				return groupArr
			},
			// IPv6 地址排序：ULA（fd*）后置，公网优先
			sortIpv6List(arr) {
				if (!Array.isArray(arr)) return []
				return [...arr].sort((a, b) => {
					const aUla = String(a || '').toLowerCase().startsWith('fd')
					const bUla = String(b || '').toLowerCase().startsWith('fd')
					if (aUla === bUla) return 0
					return aUla ? 1 : -1
				})
			},
			// 取排序后首个地址，超 30 字符截断
			getShortAddress(arr) {
				if (!Array.isArray(arr) || arr.length === 0) return '-'
				const sorted = this.sortIpv6List(arr)
				const first = String(sorted[0] || '')
				return first.length > 30 ? first.slice(0, 30) + '...' : first
			},
			// 是否有更多 IPv6 详情（PD 存在 或 多个 IPv6）→ 显示眼睛图标
			hasIpv6MoreDetail(iface) {
				if (!iface) return false
				const ipv6Len = Array.isArray(iface.ipv6List) ? iface.ipv6List.length : 0
				const pdLen = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList.length : 0
				return pdLen > 0 || ipv6Len > 1
			},
			hasIpv6Data(iface) {
				if (!iface) return false
				const ipv6Len = Array.isArray(iface.ipv6List) ? iface.ipv6List.length : 0
				const pdLen = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList.length : 0
				return ipv6Len + pdLen > 0
			},
			showIpv6Detail(iface) {
				if (!iface) return
				const ipv6 = this.sortIpv6List(Array.isArray(iface.ipv6List) ? iface.ipv6List : [])
				const pd = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList : []
				const sections = []
				if (ipv6.length > 0) sections.push({ title: this.$t('network.ipv6'), list: ipv6 })
				if (pd.length > 0) sections.push({ title: this.$t('network.ipv6_pd'), list: pd })
				if (sections.length !== 0) {
					this.openIpv6Dialog(this.$t('network.ipv6'), sections)
				}
			},
			hasMoreAddress(arr) {
				if (!Array.isArray(arr) || arr.length === 0) return false
				if (arr.length > 1) return true
				return String(arr[0] || '').length > 30
			},
			showAddressDetail(title, list) {
				if (Array.isArray(list) && list.length !== 0) {
					this.openIpv6Dialog(title || this.$t('network.ipv6'), [{ title: title || this.$t('network.ipv6'), list }])
				}
			},
			openIpv6Dialog(title, sections) {
				if (!Array.isArray(sections) || sections.length === 0) return
				const filtered = sections
					.map(s => ({
						title: s && s.title ? s.title : this.$t('network.ipv6'),
						list: Array.isArray(s && s.list) ? s.list.filter(Boolean) : []
					}))
					.filter(s => s.list.length > 0)
				if (filtered.length === 0) return
				this.ipv6Dialog = { title: title || this.$t('network.ipv6'), sections: filtered }
				this.$nextTick(() => {
					if (this.$refs.ipv6DialogPopup) this.$refs.ipv6DialogPopup.open()
				})
			},
			closeIpv6Dialog() {
				if (this.$refs.ipv6DialogPopup) this.$refs.ipv6DialogPopup.close()
			},
			formatHwModes(hwmodes_text, hwmodes) {
				if (hwmodes_text) {
					return hwmodes_text
				}
				if (hwmodes && Array.isArray(hwmodes)) {
					return hwmodes.join(', ').toUpperCase()
				}
				return null
			},
			// 紧凑数据包显示（1.2k 风格）
			formatPacketCount(val) {
				const n = Number(val || 0)
				if (n >= 1000) {
					const k = n / 1000
					const str = k >= 100 ? k.toFixed(0) : k.toFixed(1)
					return str.replace(/\.0$/, '') + 'k'
				}
				return String(Math.floor(n))
			},
		},
		watch: {
			currentTab(val) {
				if (val === 2) {
					this.fetchWireless();
				}
			}
		}
	}
</script>

<style scoped lang="scss">

@import '@/styles/common.scss';

.iface-title {
	flex: 1;
	min-width: 0;
	font-size: 30rpx;
	font-weight: 600;
	color: $oa-text;
	word-break: break-all;
}
.iface-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}
.iface-row:last-child {
	border-bottom: none;
}
.iface-row .label {
	font-size: 24rpx;
	color: $oa-text-muted;
	font-weight: 500;
	min-width: 140rpx;
	flex-shrink: 0;
}
.iface-row .value {
	font-size: 24rpx;
	font-weight: 500;
	color: $oa-text;
	text-align: right;
	max-width: 64%;
	word-break: break-all;
	flex: 1;
}
.ipv6-row {
	align-items: center;
}
.ipv6-value-wrap {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10rpx;
	max-width: 68%;
	min-width: 0;
	text-align: right;
}
.ipv6-text {
	display: block;
	max-width: 420rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: $oa-text;
}
.ipv6-eye {
	width: 34rpx;
	height: 34rpx;
	flex-shrink: 0;
	opacity: 0.92;
}
.ipv6-dialog {
	width: 660rpx;
	max-height: 72vh;
	border: 1rpx solid $oa-hairline;
	box-sizing: border-box;
}
.ipv6-dialog-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
	padding-bottom: 10rpx;
	border-bottom: 1rpx solid $oa-hairline;
}
.ipv6-dialog-title {
	font-size: 30rpx;
	font-weight: 600;
	color: $oa-text;
	padding-right: 10rpx;
}
.ipv6-dialog-close {
	width: 44rpx;
	height: 44rpx;
	border-radius: $oa-radius-lg;
	background: $oa-surface-sunken;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.ipv6-dialog-close-text {
	font-size: 30rpx;
	line-height: 30rpx;
	color: $oa-text-subtle;
	font-weight: 500;
}
.ipv6-dialog-scroll {
	max-height: 52vh;
}
.ipv6-dialog-section {
	margin-bottom: 16rpx;
}
.ipv6-dialog-section:last-child {
	margin-bottom: 0;
}
.ipv6-dialog-section-title {
	display: block;
	font-size: 24rpx;
	font-weight: 600;
	color: $oa-brand;
	margin-bottom: 10rpx;
}
.ipv6-dialog-list {
	background: $oa-surface-overlay;
	border: 1rpx solid $oa-hairline;
	border-radius: $oa-radius-md;
	overflow: hidden;
}
.ipv6-dialog-item {
	padding: 16rpx 18rpx;
	border-bottom: 1rpx solid $oa-hairline;
}
.ipv6-dialog-item:last-child {
	border-bottom: none;
}
.ipv6-dialog-item-text {
	font-size: 24rpx;
	font-weight: 500;
	color: $oa-text;
	word-break: break-all;
	line-height: 1.45;
}
.ipv6-dialog-footer {
	margin-top: 18rpx;
	display: flex;
	justify-content: flex-end;
}
.ipv6-dialog-btn {
	min-width: 140rpx;
	padding: 10rpx 22rpx;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
	color: $oa-brand;
	background: $oa-brand-subtle;
	border: 1rpx solid $oa-brand-subtle;
	border-radius: $oa-radius-full;
}
.dev-title {
	flex: 1;
	min-width: 0;
	font-size: 30rpx;
	font-weight: 600;
	color: $oa-text;
	word-break: break-all;
}
.dev-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}
.dev-row:last-child {
	border-bottom: none;
}
.dev-row .label {
	font-size: 24rpx;
	color: $oa-text-muted;
	font-weight: 500;
	min-width: 140rpx;
	flex-shrink: 0;
}
.dev-row .value {
	font-size: 24rpx;
	color: $oa-text;
	font-weight: 500;
	text-align: right;
	max-width: 64%;
	word-break: break-all;
	flex: 1;
}
.dev-group {
	margin-bottom: 20rpx;
}
.dev-group-title {
	font-size: 24rpx;
	font-weight: 600;
	color: $oa-text;
	margin: 18rpx 0 12rpx 0;
	padding-left: 12rpx;
	border-left: 6rpx solid $oa-brand;
	background: transparent;
	box-shadow: none;
}
.wireless-radio-title {
	font-size: 28rpx;
	font-weight: 700;
	color: $oa-text;
}
.wireless-radio-chip {
	font-size: 22rpx;
	color: $oa-text-subtle;
}
.wireless-radio-edit {
	font-size: 24rpx;
	color: $oa-brand;
	font-weight: 600;
}
.wireless-radio-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
	font-size: 26rpx;
	color: $oa-text-muted;
}
.wireless-radio-row:last-child {
	border-bottom: none;
}
.wireless-iface-title {
	font-size: 26rpx;
	font-weight: 700;
	color: $oa-text;
}
.wireless-iface-mode {
	font-size: 22rpx;
	color: $oa-text-muted;
}
.wireless-iface-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
	font-size: 26rpx;
	color: $oa-text-muted;
}
.wireless-iface-row:last-child {
	border-bottom: none;
}
</style>
