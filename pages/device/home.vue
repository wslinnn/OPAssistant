<template>
	<view class="container">
		<oa-loading v-if="loading" overlay :text="$t('home.loading')" />

		<oa-nav-header :title="truncatedModel || $t('home.openwrt_device')" show-back @back="goBack" />

		<scroll-view scroll-y="true" class="content-scroll">
			<!-- 系统状态 -->
			<view class="device-card">
				<view class="device-header">
					<text class="card-title">{{ $t('home.system_status') }}</text>
				</view>
				<view class="device-details">
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.hostname') }}</text>
						<text class="detail-value">{{ systemStatus.hostname || '--' }}</text>
					</view>
					<view class="detail-row" v-if="truncatedVersion">
						<text class="detail-label">{{ $t('home.version_info') }}</text>
						<text class="detail-value">{{ truncatedVersion }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.architecture') }}</text>
						<text class="detail-value">{{ truncatedArchitecture }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.target_platform') }}</text>
						<text class="detail-value">{{ systemStatus.target || '--' }}</text>
					</view>
					<view class="detail-row" v-if="systemStatus.temperature && systemStatus.temperature !== '--'">
						<text class="detail-label">{{ $t('home.temperature') }}</text>
						<text class="detail-value temperature-value">{{ systemStatus.temperature }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.uptime') }}</text>
						<text class="detail-value">{{ systemStatus.uptime || '0' + $t('home.days') }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.cpu_load') }}</text>
						<text class="detail-value">{{ systemStatus.cpuLoad || '0.00 0.00 0.00' }}</text>
					</view>
				</view>
			</view>

			<!-- 资源监控（双环形图） -->
			<view class="cpu-mem-card">
				<view class="card-header">
					<text class="card-title">{{ $t('home.resource_monitor') }}</text>
				</view>
				<view class="ring-row">
					<view class="ring-item">
						<view class="ring-chart-wrap">
							<l-echart ref="overlayChartRef" @finished="initOverlayChart" style="width: 100%; height: 100%;"></l-echart>
							<view class="ring-center">
								<text class="ring-center-title">{{ $t('home.overlay') }}</text>
								<text class="ring-center-percent">{{ overlayPercentNum }}</text>
							</view>
						</view>
						<text class="ring-detail">{{ overlayDetail }}</text>
					</view>
					<view class="ring-item">
						<view class="ring-chart-wrap">
							<l-echart ref="memChartRef" @finished="initMemChart" style="width: 100%; height: 100%;"></l-echart>
							<view class="ring-center">
								<text class="ring-center-title">{{ $t('home.memory') }}</text>
								<text class="ring-center-percent">{{ systemStatus.memoryUsage || '0%' }}</text>
							</view>
						</view>
						<text class="ring-detail">{{ systemStatus.memoryDetail || '0MB / 0MB' }}</text>
					</view>
				</view>
			</view>

			<!-- 实时带宽（WAN 优先 / LAN 兜底） -->
			<view class="quick-bandwidth-card" v-if="quickBandwidthDevice">
				<view class="quick-bandwidth-header">
					<view class="quick-bandwidth-title-wrap">
						<text class="card-title">{{ quickBandwidthDisplayName }}</text>
					</view>
					<view class="quick-bandwidth-metrics">
						<view class="quick-bandwidth-metric quick-bandwidth-metric-down">
							<text class="quick-bandwidth-arrow">↓</text>
							<text class="quick-bandwidth-metric-value">{{ formatBandwidth(quickRxRate) }}</text>
						</view>
						<view class="quick-bandwidth-metric quick-bandwidth-metric-up">
							<text class="quick-bandwidth-arrow">↑</text>
							<text class="quick-bandwidth-metric-value">{{ formatBandwidth(quickTxRate) }}</text>
						</view>
					</view>
				</view>
				<view class="quick-bandwidth-chart">
					<l-echart ref="quickBandwidthChartRef" @finished="initQuickBandwidthChart" style="width: 100%; height: 100%;"></l-echart>
				</view>
			</view>

			<!-- 网络 -->
			<view class="network-card">
				<view class="card-header">
					<text class="card-title">{{ $t('home.network_status') }}</text>
				</view>
				<view class="network-details">
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.wan_ip') }}</text>
						<text class="detail-value">{{ networkStatus.wanIp || '--' }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.lan_ip') }}</text>
						<text class="detail-value">{{ networkStatus.lanIp || '--' }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.gateway') }}</text>
						<text class="detail-value">{{ networkStatus.gateway || '--' }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.dns') }}</text>
						<text class="detail-value">{{ networkStatus.dns || '--' }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">{{ $t('home.connections') }}</text>
						<text class="detail-value">{{ systemStatus.connectionsDetail || '0 / 0' }}</text>
					</view>
				</view>
			</view>

			<!-- 存储 -->
			<view class="disk-card" v-if="diskInfo.length > 0">
				<view class="card-header">
					<text class="card-title">{{ $t('home.disk_status') }}</text>
				</view>
				<view class="disk-list">
					<view class="disk-item" v-for="(disk, index) in diskInfo" :key="index">
						<view class="disk-info">
							<text class="disk-mount">
								{{ diskMountDisplay(disk) }}<text v-if="disk.mount === '/tmp' && disk.device !== 'tmpfs'" class="disk-temp-label">{{ $t('home.temp_space') }}</text>
							</text>
						</view>
						<view class="disk-usage">
							<text class="disk-usage-line">{{ disk.usedSize }} / {{ disk.totalSize }} ({{ disk.usagePercent }}%)</text>
							<view class="disk-progress-bar">
								<view class="disk-progress-fill" :style="{width: disk.usagePercent + '%'}"></view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import DeviceManager from '@/utils/deviceManager.js'
	import { OA_ECHART } from '@/utils/echart-theme.js'
	// #ifdef MP
	const echarts = require('@/uni_modules/lime-echart/static/app/echarts.min.js')
	// #endif
	// #ifndef MP
	const echarts = null
	// #endif

	export default {
		data() {
			return {
				_overlayChartInstance: null,
				_memChartInstance: null,
				_quickBandwidthChartInstance: null,
				loading: false,
				isFirstLoad: true,
				timer: null,
				url: '/ubus',
				session: '',
				deviceInfo: {
					model: '',
					version: '',
					cpu: '',
					kernel: ''
				},
				systemStatus: {
					cpuUsage: '0%',
					cpuLoad: '0.00 0.00 0.00',
					memoryUsage: '0%',
					memoryDetail: '0MB / 0MB',
					memoryCache: '0MB',
					memoryCacheDetail: '0MB / 0MB',
					memoryCachePercent: '0%',
					hostname: '--',
					architecture: '--',
					target: '--',
					kernel: '--',
					temperature: '--',
					localtime: '--',
					uptime: '0' + this.$t('home.days'),
					onlineUsers: '0',
					connections: '0',
					connectionsDetail: '0 / 0',
					connectionsPercent: '0%'
				},
				networkStatus: {
					wanIp: '--',
					lanIp: '--',
					gateway: '--',
					dns: '--'
				},
				diskInfo: [],
				quickBandwidthDevice: '',
				quickBandwidthSource: '',
				quickRxRate: 0,
				quickTxRate: 0,
				quickBandwidthChartData: { timestamps: [], rxRates: [], txRates: [] }
			}
		},
		computed: {
			truncatedModel() {
				const model = this.deviceInfo.model || this.$t('home.openwrt_device')
				return model.length > 20 ? model.substring(0, 20) + '...' : model
			},
			truncatedVersion() {
				const version = this.deviceInfo.version || this.$t('home.version_info')
				return version.length > 24 ? version.substring(0, 24) + '...' : version
			},
			truncatedArchitecture() {
				const arch = this.systemStatus.architecture || '--'
				return arch.length > 32 ? arch.substring(0, 32) + '...' : arch
			},
			overlayDisk() {
				return this.diskInfo.find(t => t.mount === '/overlay') || null
			},
			overlayPercentNum() {
				const t = this.overlayDisk
				return t ? Math.min(100, Math.max(0, t.usagePercent)) : 0
			},
			overlayDetail() {
				const t = this.overlayDisk
				return t ? `${t.usedSize} / ${t.totalSize}` : '0MB / 0MB'
			},
			memPercentNum() {
				const s = (this.systemStatus.memoryUsage || '0%').toString()
				const n = parseInt(s.replace(/\D/g, ''), 10)
				return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
			},
			quickBandwidthDisplayName() {
				return this.quickBandwidthSource === 'wan' ? 'WAN' : 'LAN'
			}
		},
		watch: {
			overlayPercentNum() {
				this.updateOverlayChart()
			},
			memPercentNum() {
				this.updateMemChart()
			}
		},
		onLoad() {
			this.updateTabBarText()
			this.deviceInfo = DeviceManager.getCurrentDevice()
			this.session = this.deviceInfo.sysauth
			const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
			const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
			this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
			this.loadData()
			this.startAutoRefresh()
		},
		onShow() {
			this.startAutoRefresh()
		},
		onHide() {
			this.stopAutoRefresh()
		},
		onUnload() {
			this.stopAutoRefresh()
			if (this._overlayChartInstance) {
				this._overlayChartInstance.dispose()
				this._overlayChartInstance = null
			}
			if (this._memChartInstance) {
				this._memChartInstance.dispose()
				this._memChartInstance = null
			}
			if (this._quickBandwidthChartInstance) {
				this._quickBandwidthChartInstance.dispose()
				this._quickBandwidthChartInstance = null
			}
		},
		methods: {
			goBack() {
				this.stopAutoRefresh()
				uni.reLaunch({
					url: '/pages/device_list'
				})
			},
			updateTabBarText() {
				uni.setTabBarItem({ index: 0, text: this.$t('tabbar.home') })
				uni.setTabBarItem({ index: 1, text: this.$t('tabbar.statistics') })
				uni.setTabBarItem({ index: 2, text: this.$t('tabbar.clients') })
				uni.setTabBarItem({ index: 3, text: this.$t('tabbar.network') })
				uni.setTabBarItem({ index: 4, text: this.$t('tabbar.apps') })
			},
			loadData() {
				if (this.isFirstLoad) {
					this.loading = true
				}
				this.fetchAllStatusData()
			},

			// ===== 资源监控环形图 =====
			getOverlayRingOption() {
				const v = this.overlayPercentNum
				return {
					graphic: [],
					series: [{
						type: 'pie',
						radius: ['72%', '90%'],
						center: ['50%', '50%'],
						startAngle: 90,
						clockWise: true,
						roundCap: true,
						silent: true,
						data: [
							{ value: v, itemStyle: { color: OA_ECHART.ringMain, borderRadius: 8 } },
							{ value: 100 - v, itemStyle: { color: OA_ECHART.ringBg } }
						],
						label: { show: false },
						labelLine: { show: false }
					}]
				}
			},
			getMemRingOption() {
				const v = this.memPercentNum
				return {
					graphic: [],
					series: [{
						type: 'pie',
						radius: ['72%', '90%'],
						center: ['50%', '50%'],
						startAngle: 90,
						clockWise: true,
						roundCap: true,
						silent: true,
						data: [
							{ value: v, itemStyle: { color: OA_ECHART.ringMain, borderRadius: 8 } },
							{ value: 100 - v, itemStyle: { color: OA_ECHART.ringBg } }
						],
						label: { show: false },
						labelLine: { show: false }
					}]
				}
			},
			async initOverlayChart() {
				if (!this.$refs.overlayChartRef) return
				try {
					const chart = await this.$refs.overlayChartRef.init(echarts)
					this._overlayChartInstance = chart
					this._overlayChartInstance.setOption(this.getOverlayRingOption(), false)
				} catch (err) {
					console.error('overlay chart init failed:', err)
				}
			},
			async initMemChart() {
				if (!this.$refs.memChartRef) return
				try {
					const chart = await this.$refs.memChartRef.init(echarts)
					this._memChartInstance = chart
					this._memChartInstance.setOption(this.getMemRingOption(), false)
				} catch (err) {
					console.error('mem chart init failed:', err)
				}
			},
			updateOverlayChart() {
				if (this._overlayChartInstance) {
					this._overlayChartInstance.setOption(this.getOverlayRingOption(), false)
				}
			},
			updateMemChart() {
				if (this._memChartInstance) {
					this._memChartInstance.setOption(this.getMemRingOption(), false)
				}
			},

			// ===== 实时带宽折线图 =====
			async initQuickBandwidthChart() {
				if (!this.$refs.quickBandwidthChartRef) return
				try {
					const chart = await this.$refs.quickBandwidthChartRef.init(echarts)
					this._quickBandwidthChartInstance = chart
					this.updateQuickBandwidthChart()
				} catch (err) {
					console.error('quick bandwidth chart init failed:', err)
				}
			},
			updateQuickBandwidthChart() {
				if (this._quickBandwidthChartInstance) {
					this._quickBandwidthChartInstance.setOption(this.getQuickBandwidthChartOption(), false)
				}
			},
			getQuickBandwidthChartOption() {
				const timestamps = Array.isArray(this.quickBandwidthChartData.timestamps) ? this.quickBandwidthChartData.timestamps : []
				const rxRates = Array.isArray(this.quickBandwidthChartData.rxRates) ? this.quickBandwidthChartData.rxRates : []
				const txRates = Array.isArray(this.quickBandwidthChartData.txRates) ? this.quickBandwidthChartData.txRates : []
				const xAxisData = timestamps.map(() => '')
				const all = [...rxRates, ...txRates]
				const maxVal = all.length > 0 ? Math.max.apply(Math, all) : 0
				const scale = this.getQuickBandwidthAxisScale(maxVal)
				return {
					animation: false,
					tooltip: {
						trigger: 'axis',
						axisPointer: { type: 'cross' },
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						borderColor: OA_ECHART.tooltipBorder,
						borderWidth: 1,
						textStyle: { color: '#fff', fontSize: 12 },
						formatter: (params) => {
							const rx = params && params[0] ? this.formatBandwidth(params[0].value) : '0 B/s'
							const tx = params && params[1] ? this.formatBandwidth(params[1].value) : '0 B/s'
							return `${this.$t('statistics.inbound')}: ${rx}\n${this.$t('statistics.outbound')}: ${tx}`
						}
					},
					grid: { left: '0px', right: '8px', bottom: '12px', top: '10px', containLabel: false },
					xAxis: {
						type: 'category',
						boundaryGap: false,
						data: xAxisData,
						axisLabel: { show: false },
						axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } },
						axisLine: { lineStyle: { color: OA_ECHART.axisLine } },
						splitLine: { show: false }
					},
					yAxis: {
						type: 'value',
						min: 0,
						max: scale.max,
						interval: scale.interval,
						splitNumber: 5,
						position: 'left',
						axisLabel: {
							inside: true,
							align: 'left',
							margin: 8,
							color: OA_ECHART.axisLabel,
							fontSize: 10,
							formatter: (val) => this.formatQuickBandwidthAxis(val)
						},
						splitLine: { show: true, lineStyle: { color: OA_ECHART.splitLine, type: 'dashed' } },
						axisLine: { show: true, lineStyle: { color: OA_ECHART.axisLine } },
						axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } }
					},
					series: [
						{
							name: this.$t('statistics.inbound'),
							type: 'line',
							data: rxRates,
							smooth: true,
							showSymbol: false,
							symbol: 'none',
							animation: false,
							lineStyle: { color: OA_ECHART.inband, width: 1.2 },
							areaStyle: {
								color: {
									type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
									colorStops: [
										{ offset: 0, color: 'rgba(79, 172, 254, 0.28)' },
										{ offset: 1, color: 'rgba(79, 172, 254, 0.06)' }
									]
								}
							}
						},
						{
							name: this.$t('statistics.outbound'),
							type: 'line',
							data: txRates,
							smooth: true,
							showSymbol: false,
							symbol: 'none',
							animation: false,
							lineStyle: { color: OA_ECHART.outband, width: 1.2 },
							areaStyle: {
								color: {
									type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
									colorStops: [
										{ offset: 0, color: 'rgba(0, 196, 204, 0.24)' },
										{ offset: 1, color: 'rgba(0, 196, 204, 0.05)' }
									]
								}
							}
						}
					]
				}
			},
			getQuickBandwidthAxisScale(val) {
				const v = Number(val) > 0 ? Number(val) : 0
				const rawMax = Math.max(1.1 * v, 10240)
				const step = rawMax / 5
				const minStep = rawMax < 102400 ? 10240 : 102400
				const interval = Math.max(minStep, Math.ceil(step / minStep) * minStep)
				const max = 5 * interval
				return { max, interval }
			},
			formatQuickBandwidthAxis(val) {
				if (!val || val < 0) return '0'
				const kb = val / 1024
				if (kb >= 1000) {
					const mb = kb / 1000
					return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB/s`
				}
				return this.formatBandwidth(val)
			},
			formatChartTime(ts) {
				const d = new Date(1000 * Number(ts || 0))
				const h = String(d.getHours()).padStart(2, '0')
				const m = String(d.getMinutes()).padStart(2, '0')
				const s = String(d.getSeconds()).padStart(2, '0')
				return `${h}:${m}:${s}`
			},
			getQuickBandwidthTarget(interfaces) {
				if (!Array.isArray(interfaces)) {
					return { device: 'br-lan', source: 'br-lan' }
				}
				const wan = interfaces.find(t => t && t.interface === 'wan')
				return wan
					? { device: wan.l3_device || wan.device || 'wan', source: 'wan' }
					: { device: 'br-lan', source: 'br-lan' }
			},
			fetchQuickBandwidthData(device) {
				if (!device) return
				uni.request({
					method: 'POST',
					url: this.url,
					data: {
						jsonrpc: '2.0',
						id: 10,
						method: 'call',
						params: [this.session, 'luci', 'getRealtimeStats', { mode: 'interface', device }]
					},
					header: {
						'Content-Type': 'application/json',
						'x-uniauth': 'true'
					},
					timeout: 3000,
					success: (res) => {
						const result = res && res.data && res.data.result && res.data.result[1] ? res.data.result[1].result : null
						this.processQuickBandwidthData(result)
					},
					fail: () => {}
				})
			},
			processQuickBandwidthData(samples) {
				if (!Array.isArray(samples) || samples.length < 2) return
				const timestamps = []
				const rxRates = []
				const txRates = []
				for (let i = 1; i < samples.length; i++) {
					const cur = samples[i]
					const prev = samples[i - 1]
					const dt = cur[0] - prev[0]
					if (dt <= 0) continue
					const rx = Math.max(0, (cur[1] - prev[1]) / dt)
					const tx = Math.max(0, (cur[3] - prev[3]) / dt)
					timestamps.push(cur[0])
					rxRates.push(rx)
					txRates.push(tx)
				}
				if (timestamps.length > 60) {
					timestamps.splice(0, timestamps.length - 60)
					rxRates.splice(0, rxRates.length - 60)
					txRates.splice(0, txRates.length - 60)
				}
				this.quickBandwidthChartData = { timestamps, rxRates, txRates }
				if (rxRates.length > 0) this.quickRxRate = rxRates[rxRates.length - 1]
				if (txRates.length > 0) this.quickTxRate = txRates[txRates.length - 1]
				this.updateQuickBandwidthChart()
			},
			formatBandwidth(val) {
				if (!val || val < 0) return '0 B/s'
				const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
				const i = Math.floor(Math.log(val) / Math.log(1024))
				if (i === 0) return Math.round(val) + ' B/s'
				const n = val / Math.pow(1024, i)
				return i === 1 ? Math.round(n) + ' ' + units[i] : n.toFixed(1) + ' ' + units[i]
			},
			truncateString(str) {
				const max = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 32
				return !str || str.length <= max ? str : str.substring(0, max) + '...'
			},
			diskMountDisplay(disk) {
				if (!disk) return ''
				const text = disk.mount + ' (' + (disk.device || '') + ')'
				return this.truncateString(text, 32)
			},

			// ===== 状态数据采集 =====
			fetchAllStatusData() {
				uni.request({
					method: 'POST',
					url: this.url,
					timeout: 3000,
					data: [
						{ jsonrpc: '2.0', id: 1, method: 'call', params: [this.session, 'system', 'board', {}] },
						{ jsonrpc: '2.0', id: 2, method: 'call', params: [this.session, 'system', 'info', {}] },
						{ jsonrpc: '2.0', id: 3, method: 'call', params: [this.session, 'luci', 'getCPUUsage', {}] },
						{ jsonrpc: '2.0', id: 4, method: 'call', params: [this.session, 'luci', 'getOnlineUsers', {}] },
						{ jsonrpc: '2.0', id: 5, method: 'call', params: [this.session, 'file', 'read', { path: '/proc/sys/net/netfilter/nf_conntrack_count' }] },
						{ jsonrpc: '2.0', id: 6, method: 'call', params: [this.session, 'file', 'read', { path: '/proc/sys/net/netfilter/nf_conntrack_max' }] },
						{ jsonrpc: '2.0', id: 7, method: 'call', params: [this.session, 'network.interface', 'dump', {}] },
						{ jsonrpc: '2.0', id: 8, method: 'call', params: [this.session, 'luci', 'getTempInfo', {}] },
						{ jsonrpc: '2.0', id: 9, method: 'call', params: [this.session, 'luci', 'getMountPoints', {}] }
					],
					header: {
						'Content-Type': 'application/json',
						'x-uniauth': 'true'
					},
					success: (res) => {
						this.processAllStatusData(res.data)
					},
					fail: (err) => {
						console.error('data error:', err)
						this.loading = false
					}
				})
			},
			processAllStatusData(dataArray) {
				if (!Array.isArray(dataArray)) {
					console.error('data format error')
					this.loading = false
					return
				}

				// 设备信息：version 由 distribution+version+kernel 拼接
				const deviceInfoRes = dataArray[0]
				if (deviceInfoRes && deviceInfoRes.result && deviceInfoRes.result[1]) {
					const data = deviceInfoRes.result[1]
					const distribution = data.release && data.release.distribution ? data.release.distribution : 'OpenWrt'
					const version = data.release && data.release.version ? data.release.version : ''
					const kernel = data.kernel || '--'
					const versionStr = version ? `${distribution} ${version}(${kernel})` : `${distribution} (${kernel})`
					this.deviceInfo = {
						model: data.model || this.$t('home.openwrt'),
						version: versionStr.trim() || this.$t('home.version_info'),
						cpu: data.system || '--',
						kernel: data.kernel || '--'
					}
					this.systemStatus.hostname = data.hostname || '--'
					this.systemStatus.architecture = data.system || '--'
					this.systemStatus.kernel = data.kernel || '--'
					if (data.release && data.release.target) {
						this.systemStatus.target = data.release.target
					}
				}

				// 系统信息：内存 / 负载 / 时间 / 在线时长
				const systemInfoRes = dataArray[1]
				if (systemInfoRes && systemInfoRes.result && systemInfoRes.result[1]) {
					const data = systemInfoRes.result[1]
					const memory = data.memory
					if (memory) {
						const used = memory.total - memory.available
						const usage = Math.round((used / memory.total) * 100)
						this.systemStatus.memoryUsage = usage + '%'
						this.systemStatus.memoryDetail = this.formatBytes(used) + ' / ' + this.formatBytes(memory.total)
						if (memory.cached) {
							this.systemStatus.memoryCache = this.formatBytes(memory.cached)
							const cacheUsage = Math.round((memory.cached / memory.total) * 100)
							this.systemStatus.memoryCachePercent = cacheUsage + '%'
							this.systemStatus.memoryCacheDetail = this.formatBytes(memory.cached) + ' / ' + this.formatBytes(memory.total)
						}
					}
					if (data.load && Array.isArray(data.load) && data.load.length >= 3) {
						const load1 = (data.load[0] / 65536).toFixed(2)
						const load5 = (data.load[1] / 65536).toFixed(2)
						const load15 = (data.load[2] / 65536).toFixed(2)
						this.systemStatus.cpuLoad = `${load1} ${load5} ${load15}`
					}
					if (data.localtime) {
						const utcDate = new Date(data.localtime * 1000)
						const beijingOffset = 8 * 60 * 60 * 1000
						const beijingDate = new Date(utcDate.getTime() - beijingOffset)
						const year = beijingDate.getFullYear()
						const month = String(beijingDate.getMonth() + 1).padStart(2, '0')
						const day = String(beijingDate.getDate()).padStart(2, '0')
						const hours = String(beijingDate.getHours()).padStart(2, '0')
						const minutes = String(beijingDate.getMinutes()).padStart(2, '0')
						const seconds = String(beijingDate.getSeconds()).padStart(2, '0')
						this.systemStatus.localtime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
					}
					if (data.uptime) {
						const days = Math.floor(data.uptime / 86400)
						const hours = Math.floor((data.uptime % 86400) / 3600)
						const minutes = Math.floor((data.uptime % 3600) / 60)
						const seconds = data.uptime % 60
						let uptimeStr = ''
						if (days > 0) uptimeStr += days + 'd '
						if (hours > 0 || days > 0) uptimeStr += hours + 'h '
						if (minutes > 0 || hours > 0 || days > 0) uptimeStr += minutes + 'm '
						uptimeStr += seconds + 's'
						this.systemStatus.uptime = uptimeStr
					}
				}

				// CPU 使用率：兼容数字（0-1 归一化）/ 百分比字符串 / 纯数字，钳制 0-100
				const cpuRes = dataArray[2]
				console.log('[getCPUUsage] raw response:', cpuRes)
				if (cpuRes && cpuRes.result && cpuRes.result[1]) {
					const data = cpuRes.result[1]
					console.log('[getCPUUsage] result[1] data:', data)
					const raw = data.cpuusage
					let cpuUsage = '0%'
					if (raw !== undefined && raw !== null) {
						if (typeof raw === 'number') {
							const clamped = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0))
							cpuUsage = ((raw <= 1 && clamped <= 1) ? Math.round(100 * clamped) : Math.round(clamped)) + '%'
						} else {
							const s = String(raw).trim()
							if (s.includes('CPU:') && s.includes('%')) {
								const m = s.match(/CPU:\s*([\d.]+)\s*%?/)
								if (m) cpuUsage = Math.min(100, Math.max(0, Math.round(parseFloat(m[1])))) + '%'
							} else if (s.includes('%')) {
								const m = s.match(/([\d.]+)\s*%/)
								if (m) cpuUsage = Math.min(100, Math.max(0, Math.round(parseFloat(m[1])))) + '%'
							} else {
								const num = parseFloat(s)
								if (!isNaN(num)) {
									cpuUsage = Math.min(100, Math.max(0, num <= 1 ? Math.round(100 * num) : Math.round(num))) + '%'
								}
							}
						}
					}
					this.systemStatus.cpuUsage = cpuUsage
				}

				const usersRes = dataArray[3]
				if (usersRes && usersRes.result && usersRes.result[1]) {
					const data = usersRes.result[1]
					this.systemStatus.onlineUsers = (data.onlineusers && data.onlineusers.trim) ? data.onlineusers.trim() : '0'
				}

				const connectionsRes = dataArray[4]
				const maxConnectionsRes = dataArray[5]
				if (connectionsRes && connectionsRes.result && connectionsRes.result[1]) {
					const data = connectionsRes.result[1]
					const currentConnections = parseInt((data.data && data.data.trim) ? data.data.trim() : '0')
					this.systemStatus.connections = currentConnections.toString()
					if (maxConnectionsRes && maxConnectionsRes.result && maxConnectionsRes.result[1]) {
						const maxData = maxConnectionsRes.result[1]
						const maxConnections = parseInt((maxData.data && maxData.data.trim) ? maxData.data.trim() : '0')
						this.systemStatus.connectionsDetail = currentConnections + ' / ' + maxConnections
						if (maxConnections > 0) {
							this.systemStatus.connectionsPercent = Math.round((currentConnections / maxConnections) * 100) + '%'
						} else {
							this.systemStatus.connectionsPercent = '0%'
						}
					}
				}

				// 网络：解析 WAN/LAN 后追加实时带宽采集
				const networkRes = dataArray[6]
				if (networkRes && networkRes.result && networkRes.result[1]) {
					const interfaces = networkRes.result[1].interface
					this.parseNetworkInterfaces(interfaces)
					const target = this.getQuickBandwidthTarget(interfaces)
					if (target && target.device) {
						if (this.quickBandwidthDevice !== target.device) {
							this.quickBandwidthChartData = { timestamps: [], rxRates: [], txRates: [] }
							this.quickRxRate = 0
							this.quickTxRate = 0
							this.updateQuickBandwidthChart()
						}
						this.quickBandwidthSource = target.source
						this.quickBandwidthDevice = target.device
						this.fetchQuickBandwidthData(target.device)
					}
				}

				const tempRes = dataArray[7]
				if (tempRes && tempRes.result && tempRes.result[1]) {
					const data = tempRes.result[1]
					this.systemStatus.temperature = data.tempinfo || '--'
				}

				const diskRes = dataArray[8]
				if (diskRes && diskRes.result && diskRes.result[1] && diskRes.result[1].result) {
					const mountPoints = diskRes.result[1].result
					this.processDiskInfo(mountPoints)
				}

				this.loading = false
				this.isFirstLoad = false
			},

			startAutoRefresh() {
				this.stopAutoRefresh()
				this.timer = setInterval(() => {
					this.loadData()
				}, 3000)
			},
			stopAutoRefresh() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			formatBytes(bytes) {
				if (bytes === 0) return '0 B'
				const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
				const i = Math.floor(Math.log(bytes) / Math.log(1024))
				const n = Math.min(i, sizes.length - 1)
				return parseFloat((bytes / Math.pow(1024, n)).toFixed(1)) + ' ' + sizes[n]
			},
			parseNetworkInterfaces(interfaces) {
				if (!interfaces || !Array.isArray(interfaces)) {
					return
				}
				for (const iface of interfaces) {
					if (iface.interface === 'wan') {
						this.parseWANInterface(iface)
					} else if (iface.interface === 'lan') {
						this.parseLANInterface(iface)
					}
				}
			},
			parseWANInterface(wanData) {
				if (wanData['ipv4-address'] && wanData['ipv4-address'].length > 0) {
					const ipInfo = wanData['ipv4-address'][0]
					this.networkStatus.wanIp = ipInfo.address + '/' + ipInfo.mask
				}
				if (wanData.route && wanData.route.length > 0) {
					for (const route of wanData.route) {
						if (route.target === '0.0.0.0' && route.mask === 0) {
							this.networkStatus.gateway = route.nexthop
							break
						}
					}
				}
				if (wanData['dns-server'] && wanData['dns-server'].length > 0) {
					const dnsServers = []
					for (let i = 0; i < Math.min(wanData['dns-server'].length, 2); i++) {
						dnsServers.push(wanData['dns-server'][i])
					}
					this.networkStatus.dns = dnsServers.join(', ')
				}
			},
			parseLANInterface(lanData) {
				if (lanData['ipv4-address'] && lanData['ipv4-address'].length > 0) {
					const ipInfo = lanData['ipv4-address'][0]
					this.networkStatus.lanIp = ipInfo.address + '/' + ipInfo.mask
				}
			},
			processDiskInfo(mountPoints) {
				if (!Array.isArray(mountPoints)) {
					return
				}
				this.diskInfo = mountPoints.map(mount => {
					const totalSize = mount.size || 0
					const freeSize = mount.free || 0
					const usedSize = totalSize - freeSize
					const usagePercent = totalSize > 0 ? Math.round((usedSize / totalSize) * 100) : 0
					return {
						device: this.truncateString(mount.device || '--'),
						mount: this.truncateString(mount.mount || '--'),
						totalSize: this.formatBytes(totalSize),
						usedSize: this.formatBytes(usedSize),
						freeSize: this.formatBytes(freeSize),
						usagePercent: usagePercent
					}
				}).filter(disk => {
					return disk.mount !== '/' && disk.mount !== '/dev'
				}).sort((a, b) => {
					if (a.mount === '/overlay') return -1
					if (b.mount === '/overlay') return 1
					if (a.mount === '/tmp') return -1
					if (b.mount === '/tmp') return 1
					return 0
				})
			}
		}
	}
</script>

<style scoped>

	@import '@/styles/common.scss';

	.container {
		padding: 0 $oa-sp-2 $oa-sp-3;
		background: $oa-bg;
		height: 100vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.content-scroll {
		flex: 1;
		min-height: 0;
	}

	.device-card,
	.cpu-mem-card,
	.quick-bandwidth-card,
	.network-card,
	.disk-card {
		margin-left: 3px;
		margin-right: 3px;
	}

	.device-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 24rpx 40rpx;
		margin-bottom: 13rpx;
		box-shadow: $oa-shadow-md;
	}
	.device-header {
		margin-bottom: 20rpx;
	}
	.device-name {
		font-size: 32rpx;
		font-weight: 700;
		color: $oa-text;
		display: block;
		margin-bottom: 13rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	.device-version {
		font-size: 24rpx;
		color: $oa-text-muted;
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	.device-details {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}
	.device-card .device-details {
		gap: 4rpx;
	}
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8rpx 0;
		border-bottom: 1rpx solid $oa-hairline;
	}
	.device-card .detail-row {
		padding: 4rpx 0;
	}
	.detail-row:last-child {
		border-bottom: none;
	}
	.detail-label {
		font-size: 26rpx;
		color: $oa-text-muted;
		font-weight: 500;
	}
	.detail-value {
		font-size: 26rpx;
		font-weight: 610;
		color: $oa-text;
		text-align: right;
		max-width: 60%;
		word-break: break-all;
	}
	.temperature-value {
		max-width: 70% !important;
		font-size: 24rpx !important;
		line-height: 1.4 !important;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	.card-title {
		font-size: 28rpx;
		font-weight: 600;
		color: $oa-text;
	}

	.cpu-mem-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 10rpx 40rpx 20rpx;
		margin-bottom: 13rpx;
		box-shadow: $oa-shadow-md;
	}
	.ring-row {
		display: flex;
		justify-content: space-around;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 24rpx;
		margin-top: 16rpx;
	}
	.ring-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		min-width: 180rpx;
	}
	.ring-chart-wrap {
		width: 160rpx;
		height: 160rpx;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}
	.ring-chart-wrap .lime-echart {
		width: 100%;
		height: 100%;
	}
	.ring-center {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		pointer-events: none;
		z-index: 2;
	}
	.ring-center-title {
		position: absolute;
		top: 32%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 20rpx;
		font-weight: 400;
		color: $oa-text-muted;
		line-height: 1;
		white-space: nowrap;
	}
	.ring-center-percent {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 24rpx;
		font-weight: 700;
		color: $oa-text;
		line-height: 1;
		white-space: nowrap;
	}
	.ring-detail {
		font-size: 22rpx;
		color: $oa-text-subtle;
		margin-top: 12rpx;
		text-align: center;
		word-break: break-all;
	}

	.quick-bandwidth-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 24rpx 40rpx 20rpx;
		margin-bottom: 13rpx;
		box-shadow: $oa-shadow-md;
	}
	.quick-bandwidth-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 12rpx;
		gap: 16rpx;
	}
	.quick-bandwidth-title-wrap {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}
	.quick-bandwidth-device {
		font-size: 22rpx;
		color: $oa-text-subtle;
	}
	.quick-bandwidth-metrics {
		display: flex;
		align-items: center;
		gap: 18rpx;
		padding-top: 2rpx;
		flex-shrink: 0;
	}
	.quick-bandwidth-metric {
		display: flex;
		align-items: center;
		gap: 6rpx;
	}
	.quick-bandwidth-metric-down {
		color: #4facfe;
	}
	.quick-bandwidth-metric-up {
		color: #00c4cc;
	}
	.quick-bandwidth-arrow {
		font-size: 24rpx;
		font-weight: 600;
		line-height: 1;
	}
	.quick-bandwidth-metric-value {
		font-size: 24rpx;
		font-weight: 600;
		line-height: 1.2;
	}
	.quick-bandwidth-chart {
		width: 100%;
		height: 340rpx;
	}
	.quick-bandwidth-chart .lime-echart {
		width: 100%;
		height: 100%;
	}

	.network-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 24rpx 40rpx;
		margin-bottom: 13rpx;
		box-shadow: $oa-shadow-md;
	}
	.network-details {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}
	.network-card .network-details {
		gap: 4rpx;
	}
	.network-card .detail-row {
		padding: 4rpx 0;
	}

	.disk-card {
		background: $oa-surface;
		border-radius: $oa-radius-lg;
		padding: 24rpx 40rpx;
		margin-bottom: 13rpx;
		box-shadow: $oa-shadow-md;
	}
	.disk-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}
	.disk-item {
		padding: 20rpx;
		background: $oa-surface-sunken;
		border-radius: $oa-radius-md;
		border-left: 4rpx solid $oa-brand;
	}
	.disk-info {
		margin-bottom: 12rpx;
	}
	.disk-mount {
		font-size: 26rpx;
		font-weight: 700;
		color: $oa-text;
		line-height: 1.4;
	}
	.disk-usage {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}
	.disk-usage-line {
		font-size: 24rpx;
		color: $oa-text-muted;
		text-align: right;
	}
	.disk-progress-bar {
		width: 100%;
		height: 8rpx;
		background: $oa-surface-sunken;
		border-radius: $oa-radius-sm;
		overflow: hidden;
	}
	.disk-progress-fill {
		height: 100%;
		border-radius: $oa-radius-sm;
		background: $oa-success;
		transition: width 0.3s ease;
	}
	.disk-temp-label {
		font-size: 22rpx;
		color: $oa-text-subtle;
		font-weight: 400;
		margin-left: 8rpx;
	}

</style>
