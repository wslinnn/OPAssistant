<template>
  <view class="container">
    <oa-page-tab :tabs="tab_list" v-model="currentTab" />

    <view v-if="currentTab === 1">
      <oa-card v-if="loadData" padding="md">
        <view class="load-stats">
          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.current_load') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ currentLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ currentLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ currentLoad15 }}</text>
            </view>
          </view>
          
          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.average') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ averageLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ averageLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ averageLoad15 }}</text>
            </view>
          </view>
          
          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.peak') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ peakLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ peakLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ peakLoad15 }}</text>
            </view>
          </view>
        </view>

        <view class="chart-container">
          <view class="chart-wrapper">
            <view class="charts-box chart-box">
              <l-echart ref="loadChartRef" @finished="initLoadChart" style="width: 100%; height: 100%;"></l-echart>
            </view>
          </view>
        </view>
      </oa-card>

      <oa-empty v-else :text="$t('statistics.loading_load')" />
    </view>

    <view v-else-if="currentTab === 0">
      <oa-card padding="md">
        <view class="selector-label">{{ $t('statistics.select_interface') }}：</view>
        <oa-segmented :value="selectedDevice" :options="interfaceOptions" @change="selectDevice" />
      </oa-card>

      <oa-card v-if="selectedDevice && bandwidthData" padding="md">
        <view class="bandwidth-stats">
          <view class="stat-section">
                  <view class="stat-title">{{ $t('statistics.inbound') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.current') }}：</text>
              <text class="stat-value current-value">{{ formatBandwidth(currentRxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.average') }}：</text>
              <text class="stat-value">{{ formatBandwidth(averageRxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.peak') }}：</text>
              <text class="stat-value">{{ formatBandwidth(peakRxRate) }}</text>
            </view>
          </view>

          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.outbound') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.current') }}：</text>
              <text class="stat-value current-value">{{ formatBandwidth(currentTxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.average') }}：</text>
              <text class="stat-value">{{ formatBandwidth(averageTxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.peak') }}：</text>
              <text class="stat-value">{{ formatBandwidth(peakTxRate) }}</text>
            </view>
          </view>
        </view>

        <view class="chart-container">
          <view class="chart-wrapper">
            <view class="charts-box chart-box">
              <l-echart ref="chartRef" @finished="initChart" style="width: 100%; height: 100%;"></l-echart>
            </view>
          </view>
        </view>
      </oa-card>

      <oa-empty v-else-if="selectedDevice && !bandwidthData" :text="$t('statistics.loading_bandwidth')" />

      <oa-empty v-else :text="$t('statistics.select_interface_first')" />
    </view>
  </view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import { computeBandwidthRates } from '@/utils/format.js'
import { OA_ECHART } from '@/utils/echart-theme.js'
// #ifdef MP
const echarts = require('@/uni_modules/lime-echart/static/app/echarts.min.js')
// #endif
// #ifndef MP
const echarts = null
// #endif

export default {
  computed: {
    tab_list() {
      return [
        { value: 0, label: this.$t('statistics.bandwidth') },
        { value: 1, label: this.$t('statistics.load') }
      ]
    },
    interfaceOptions() {
      return this.deviceList.map(d => ({ value: d.name, label: d.name }))
    }
  },
  data() {
    return {
             currentTab: 0,
       deviceList: [],
       selectedDevice: '',
       bandwidthData: null,
       lastUpdateTime: '',
       timer: null,
       currentRxRate: 0,
       currentTxRate: 0,
       averageRxRate: 0,
       averageTxRate: 0,
       peakRxRate: 0,
       peakTxRate: 0,
        loadData: null,
        lastLoadUpdateTime: '',
        loadTimer: null,
        currentLoad1: 0,
        currentLoad5: 0,
        currentLoad15: 0,
        averageLoad1: 0,
        averageLoad5: 0,
        averageLoad15: 0,
        peakLoad1: 0,
        peakLoad5: 0,
        peakLoad15: 0,
       chartData: {
         timestamps: [],
         rxRates: [],
         txRates: []
       },
       loadChartData: {
         timestamps: [],
         load1: [],
         load5: [],
         load15: []
       },
         chartOption: {
           animation: false,
           animationDuration: 0,
           tooltip: {
             trigger: 'axis',
             axisPointer: {
               type: 'cross',
               label: {
                 backgroundColor: OA_ECHART.axisLabel
               },
               crossStyle: {
                 color: OA_ECHART.axisLabel,
                 width: 2
               }
             },
             backgroundColor: 'rgba(0, 0, 0, 0.8)',
             borderColor: OA_ECHART.tooltipBorder,
             borderWidth: 1,
             textStyle: {
               color: '#fff',
               fontSize: 12
             },
             formatter: (params) => {
               // 这里假设this.formatBandwidth可用，若不可用需调整为合适作用域
               const inbound = this.formatBandwidth(params[0].value)
               const outbound = this.formatBandwidth(params[1].value)
               // 使用 \n 进行换行，并设置 tooltip 的 extraCssText: 'white-space:pre' 以支持换行
               return this.$t('statistics.inbound') + "：" + inbound + "\n" +
                      this.$t('statistics.outbound') + "：" + outbound;
             },

           },
           legend: {
             data: ['入站', '出站'],
             top: 10,
             textStyle: {
               color: OA_ECHART.legendText
             }
           },
           grid: {
             left: '10px',
             right: '5px',
             bottom: '20px',
             top: '40px',
             containLabel: true
           },
           xAxis: {
             type: 'category',
             boundaryGap: false,
             data: [],
             axisLabel: {
               show: true,
               color: OA_ECHART.axisLabel,
               fontSize: 10,
               interval: 'auto'
             },
             axisTick: {
               show: true,
               length: 4,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             axisLine: {
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             }
           },
           yAxis: {
             type: 'value',
             axisLabel: {
               color: OA_ECHART.axisLabel,
               fontSize: 10,
               formatter: (value) => {
                 return this.formatBandwidth(value)
               },
               show: true,
               inside: true
             },
             axisTick: {
               show: true,
               length: 4,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             axisLine: {
               show: true,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             splitLine: {
               show: true,
               lineStyle: {
                 color: OA_ECHART.splitLine,
                 type: 'dashed'
               }
             }
           },
           series: [
             {
               name: '入站',
               type: 'line',
               data: [],
               smooth: true,
               animation: false,
               lineStyle: {
                 color: OA_ECHART.inband,
                 width: 1
               },
               areaStyle: {
                 color: {
                   type: 'linear',
                   x: 0,
                   y: 0,
                   x2: 0,
                   y2: 1,
                   colorStops: [
                     { offset: 0, color: 'rgba(79, 172, 254, 0.3)' },
                     { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
                   ]
                 }
               }
             },
             {
               name: '出站',
               type: 'line',
               data: [],
               smooth: true,
               animation: false,
               lineStyle: {
                 color: OA_ECHART.outband,
                 width: 1
               },
               areaStyle: {
                 color: {
                   type: 'linear',
                   x: 0,
                   y: 0,
                   x2: 0,
                   y2: 1,
                   colorStops: [
                     { offset: 0, color: 'rgba(0, 242, 254, 0.3)' },
                     { offset: 1, color: 'rgba(0, 242, 254, 0.1)' }
                   ]
                 }
               }
             }
           ]
         },
         loadChartOption: {
           animation: false,
           animationDuration: 0,
           tooltip: {
             trigger: 'axis',
             axisPointer: {
               type: 'cross',
               label: {
                 backgroundColor: OA_ECHART.axisLabel
               },
               crossStyle: {
                 color: OA_ECHART.axisLabel,
                 width: 2
               }
             },
             backgroundColor: 'rgba(0, 0, 0, 0.8)',
             borderColor: OA_ECHART.load1,
             borderWidth: 1,
             textStyle: {
               color: '#fff',
               fontSize: 12
             },
             formatter: (params) => {
               // 这里假设this.formatBandwidth可用，若不可用需调整为合适作用域
               const load1 = params[0].value.toFixed(2)
               const load5 = params[1].value.toFixed(2)
               const load15 = params[2].value.toFixed(2)
               // 使用 \n 进行换行，并设置 tooltip 的 extraCssText: 'white-space:pre' 以支持换行
               return this.$t('statistics.load_1min') + "：" + load1 + "\n" +
                      this.$t('statistics.load_5min') + "：" + load5 + "\n" +
                      this.$t('statistics.load_15min') + "：" + load15;
  
             }
           },
           legend: {
             data: ['1分钟', '5分钟', '15分钟'],
             top: 10,
             textStyle: {
               color: OA_ECHART.legendText
             }
           },
           grid: {
             left: '10px',
             right: '5px',
             bottom: '20px',
             top: '40px',
             containLabel: true
           },
           xAxis: {
             type: 'category',
             boundaryGap: false,
             data: [],
             axisLabel: {
               show: true,
               color: OA_ECHART.axisLabel,
               fontSize: 10,
               interval: 'auto'
             },
             axisTick: {
               show: true,
               length: 4,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             axisLine: {
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             }
           },
           yAxis: {
             type: 'value',
             axisLabel: {
               color: OA_ECHART.axisLabel,
               fontSize: 10,
               show: true,
               inside: true,
               formatter: (value) => {
                 return value.toFixed(2)
               }
             },
             axisTick: {
               show: true,
               length: 4,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             axisLine: {
               show: true,
               lineStyle: {
                 color: OA_ECHART.axisLine
               }
             },
             splitLine: {
               show: true,
               lineStyle: {
                 color: OA_ECHART.splitLine,
                 type: 'dashed'
               }
             }
           },
           series: [
             {
               name: '1分钟',
               type: 'line',
               data: [],
               smooth: true,
               animation: false,
               lineStyle: {
                 color: OA_ECHART.load1,
                 width: 1
               },
               areaStyle: {
                 color: {
                   type: 'linear',
                   x: 0,
                   y: 0,
                   x2: 0,
                   y2: 1,
                   colorStops: [
                     { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
                     { offset: 1, color: 'rgba(255, 107, 107, 0.1)' }
                   ]
                 }
               }
             },
             {
               name: '5分钟',
               type: 'line',
               data: [],
               smooth: true,
               animation: false,
               lineStyle: {
                 color: OA_ECHART.load5,
                 width: 1
               },
               areaStyle: {
                 color: {
                   type: 'linear',
                   x: 0,
                   y: 0,
                   x2: 0,
                   y2: 1,
                   colorStops: [
                     { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
                     { offset: 1, color: 'rgba(78, 205, 196, 0.1)' }
                   ]
                 }
               }
             },
             {
               name: '15分钟',
               type: 'line',
               data: [],
               smooth: true,
               animation: false,
               lineStyle: {
                 color: OA_ECHART.load15,
                 width: 1
               },
               areaStyle: {
                 color: {
                   type: 'linear',
                   x: 0,
                   y: 0,
                   x2: 0,
                   y2: 1,
                   colorStops: [
                     { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
                     { offset: 1, color: 'rgba(69, 183, 209, 0.1)' }
                   ]
                 }
               }
             }
           ]
         }
    }
  },
     onLoad() {
     uni.setNavigationBarTitle({
       title: this.$t('statistics.title')
     })
     uni.setNavigationBarColor({
       frontColor: '#000000',
       backgroundColor: '#F8F8F8'
     })
     
     this.loadPageData()
          
     this.startLoadRefresh()
   },
   
    onReady() {

    },
    
    onShow() {
      uni.setNavigationBarTitle({
        title: this.$t('statistics.title')
      })
      uni.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#F8F8F8'
      })
      this.loadPageData()
      if (this.currentTab === 0) {
        if (this.selectedDevice && !this.timer) {
          this.startAutoRefresh()
        }
      } else if (this.currentTab === 1) {
        if (!this.loadTimer) {
          this.startLoadRefresh()
        }
      }
    },
    
    onHide() {
      console.log('onHide')
      this.stopAutoRefresh()
      this.stopLoadRefresh()
    },
    
    onUnload() {
      this.stopAutoRefresh()
      this.stopLoadRefresh()
      if (this._chartInstance) {
        this._chartInstance.dispose()
        this._chartInstance = null
      }
      if (this._loadChartInstance) {
        this._loadChartInstance.dispose()
        this._loadChartInstance = null
      }
    },
  onPullDownRefresh() { Promise.resolve(this.loadPageData()).finally(() => uni.stopPullDownRefresh()) },
  methods: {
    goBack() {
      this.stopAutoRefresh()
      this.stopLoadRefresh()
      uni.reLaunch({ url: '/pages/device_list' })
    },
    

         loadPageData() {
       if (this.currentTab === 1) {
         this.loadLoadData()
       } else if (this.currentTab === 0) {
         this.loadBandwidthData()
       }
     },
    
         loadLoadData() {
       this.fetchLoadData()
     },
    
         loadBandwidthData() {
       this.fetchDevices()
     },
    
     fetchDevices() {
       UciRpc.callUbus('luci-rpc', 'getNetworkDevices', {})
       .then((deviceMap) => {
         if (deviceMap) {
           this.deviceList = Object.keys(deviceMap)
             .filter(devName => devName !== 'lo' && deviceMap[devName].up !== false)
             .map(devName => ({
               name: devName,
               type: deviceMap[devName].type || '-',
               macaddr: deviceMap[devName].mac || '-'
             }))
             .sort((a, b) => {
               if (a.name === 'br-lan') return -1
               if (b.name === 'br-lan') return 1
               return a.name.localeCompare(b.name)
             })
           if (this.deviceList.length > 0 && !this.selectedDevice) {
             const brLanDevice = this.deviceList.find(d => d.name === 'br-lan')
             const defaultDevice = brLanDevice ? brLanDevice.name : this.deviceList[0].name
             this.selectDevice(defaultDevice)
           }
         }
       })
       .catch(() => {
         uni.showToast({ title: this.$t('statistics.get_interfaces_failed'), icon: 'none' })
       })
           },
    
     selectDevice(devname) {
       this.selectedDevice = devname
       this.chartData.timestamps = []
       this.chartData.rxRates = []
       this.chartData.txRates = []
       this.fetchBandwidthData()
       this.startAutoRefresh()
     },
    
     fetchLoadData() {
       UciRpc.callUbus('luci', 'getRealtimeStats', { mode: 'load' })
       .then((res) => {
         if (res && res.result) {
           this.loadData = res.result
           this.processLoadData()
           this.updateLastLoadUpdateTime()
         } else {
           this.loadData = null
         }
       })
       .catch(() => {
         this.loadData = null
         uni.showToast({ title: this.$t('statistics.get_load_failed'), icon: 'none' })
       })
         },

      processLoadData() {
        if (!this.loadData || this.loadData.length === 0) return
        
        const latest = this.loadData[this.loadData.length - 1]
        
        if (latest) {
          this.currentLoad1 = (latest[1] / 100).toFixed(2)
          this.currentLoad5 = (latest[2] / 100).toFixed(2)
          this.currentLoad15 = (latest[3] / 100).toFixed(2)
          
          this.calculateLoadStats()
          this.updateLoadChartData()
        }
      },

      calculateLoadStats() {
        if (!this.loadData || this.loadData.length === 0) return
        
        const loads1 = []
        const loads5 = []
        const loads15 = []
        
        this.loadData.forEach(dataPoint => {
          loads1.push(dataPoint[1] / 100)
          loads5.push(dataPoint[2] / 100)
          loads15.push(dataPoint[3] / 100)
        })
        
        const sum1 = loads1.reduce((sum, load) => sum + load, 0)
        const sum5 = loads5.reduce((sum, load) => sum + load, 0)
        const sum15 = loads15.reduce((sum, load) => sum + load, 0)
        
        this.averageLoad1 = (sum1 / loads1.length).toFixed(2)
        this.averageLoad5 = (sum5 / loads5.length).toFixed(2)
        this.averageLoad15 = (sum15 / loads15.length).toFixed(2)
        
        this.peakLoad1 = Math.max(...loads1).toFixed(2)
        this.peakLoad5 = Math.max(...loads5).toFixed(2)
        this.peakLoad15 = Math.max(...loads15).toFixed(2)
      },

      updateLoadChartData() {
        if (!this.loadData || this.loadData.length === 0) return
     
        this.loadData.forEach(dataPoint => {
          this.addLoadDataPoint(dataPoint[0], dataPoint[1], dataPoint[2], dataPoint[3])
        })
        
        if (this._loadChartInstance) {
          this.updateLoadChart()
        }
      },

     addLoadDataPoint(timestamp, load1, load5, load15) {
       const maxPoints = 60
       
       const lastTimestamp = this.loadChartData.timestamps[this.loadChartData.timestamps.length - 1]
       if (lastTimestamp && lastTimestamp === timestamp) {
         return 
       }
       
       if (this.loadChartData.timestamps.length >= maxPoints) {
         this.loadChartData.timestamps.shift()
         this.loadChartData.load1.shift()
         this.loadChartData.load5.shift()
         this.loadChartData.load15.shift()
       }
       
       this.loadChartData.timestamps.push(timestamp)
       this.loadChartData.load1.push(load1 / 100)
       this.loadChartData.load5.push(load5 / 100)
       this.loadChartData.load15.push(load15 / 100)
     },

      updateLoadChart() {
        if (!this._loadChartInstance || !this.loadChartData.timestamps.length) return
        
        const categories = this.loadChartData.timestamps.map((timestamp, index) => {
          const date = new Date(timestamp * 1000)
          const minutes = date.getMinutes().toString().padStart(2, '0')
          const seconds = date.getSeconds().toString().padStart(2, '0')
          return `${minutes}:${seconds}`
        })
        
        const allLoads = [...this.loadChartData.load1, ...this.loadChartData.load5, ...this.loadChartData.load15]
        const maxLoad = Math.max(...allLoads)
        const minLoad = Math.min(...allLoads)
        const loadRange = maxLoad - minLoad
        
        let yAxisMax
        if (loadRange < 0.1) {
          yAxisMax = Math.max(maxLoad + 0.1, 0.5)
        } else {
          yAxisMax = maxLoad + (loadRange * 0.2) 
        }
        
        const yAxisMin = Math.max(0, minLoad - (loadRange * 0.1))
        
        const option = {
          ...this.loadChartOption,
          animation: false,
          animationDuration: 0,
          xAxis: {
            ...this.loadChartOption.xAxis,
            data: categories
          },
          yAxis: {
            ...this.loadChartOption.yAxis,
            min: yAxisMin,
            max: yAxisMax
          },
          series: [
            {
              ...this.loadChartOption.series[0],
              data: this.loadChartData.load1,
              animation: false
            },
            {
              ...this.loadChartOption.series[1],
              data: this.loadChartData.load5,
              animation: false
            },
            {
              ...this.loadChartOption.series[2],
              data: this.loadChartData.load15,
              animation: false
            }
          ]
        }
        
        this._loadChartInstance.setOption(option, false)
        
      },

     async initLoadChart() {
       if (!this.$refs.loadChartRef){
        return
       }
       try {
         const chart = await this.$refs.loadChartRef.init(echarts)
         this._loadChartInstance = chart
     
         
         this.loadChartOption.legend.data = [
           this.$t('statistics.load_1min'),
           this.$t('statistics.load_5min'),
           this.$t('statistics.load_15min')
         ]
         this.loadChartOption.series[0].name = this.$t('statistics.load_1min')
         this.loadChartOption.series[1].name = this.$t('statistics.load_5min')
         this.loadChartOption.series[2].name = this.$t('statistics.load_15min')
         
         this._loadChartInstance.setOption(this.loadChartOption, false)
         
         if (this.loadChartData.timestamps.length > 0) {
           this.updateLoadChart()
         }
       } catch (error) {
         console.error('load chart init failed:', error)
       }
     },

     startLoadRefresh() {
       this.stopLoadRefresh()
       this.loadTimer = setInterval(() => {
         this.fetchLoadData()
       }, 3000) 
     },

     stopLoadRefresh() {
       if (this.loadTimer) {
         clearInterval(this.loadTimer)
         this.loadTimer = null
       }
     },

     updateLastLoadUpdateTime() {
       const now = new Date()
       const hours = String(now.getHours()).padStart(2, '0')
       const minutes = String(now.getMinutes()).padStart(2, '0')
       const seconds = String(now.getSeconds()).padStart(2, '0')
       this.lastLoadUpdateTime = `${hours}:${minutes}:${seconds}`
     },
     
     fetchBandwidthData() {
       if (!this.selectedDevice) return
       UciRpc.callUbus('luci', 'getRealtimeStats', { mode: 'interface', device: this.selectedDevice })
       .then((res) => {
         if (res && res.result) {
           this.bandwidthData = res.result
           this.processBandwidthData()
           this.updateLastUpdateTime()
         } else {
           this.bandwidthData = null
         }
       })
       .catch(() => {
         this.bandwidthData = null
         uni.showToast({ title: this.$t('statistics.get_bandwidth_failed'), icon: 'none' })
       })
         },
    
     processBandwidthData() {
       if (!this.bandwidthData || this.bandwidthData.length < 2) return
       const { rxRates, txRates } = computeBandwidthRates(this.bandwidthData)
       if (rxRates.length === 0) return
       this.currentRxRate = rxRates[rxRates.length - 1]
       this.currentTxRate = txRates[txRates.length - 1]
       this.averageRxRate = rxRates.reduce((a, b) => a + b, 0) / rxRates.length
       this.averageTxRate = txRates.reduce((a, b) => a + b, 0) / txRates.length
       this.peakRxRate = Math.max(...rxRates)
       this.peakTxRate = Math.max(...txRates)
       this.updateChartData()
     },
    
    
    formatBandwidth(bytesPerSecond) {
      if (!bytesPerSecond || bytesPerSecond < 0) return '0 B/s'
      
      const k = 1024
      const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
      
      if (i === 0) return Math.round(bytesPerSecond) + ' B/s'
      
      const value = bytesPerSecond / Math.pow(k, i)
      
      if (i === 1) {
        return Math.round(value) + ' ' + sizes[i]
      } else {
        return value.toFixed(1) + ' ' + sizes[i]
      }
    },
    
    updateLastUpdateTime() {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      this.lastUpdateTime = `${hours}:${minutes}:${seconds}`
    },
    
       startAutoRefresh() {
        this.stopAutoRefresh()
         this.timer = setInterval(() => {
           if (this.selectedDevice) {
             this.fetchBandwidthData()
           }
         }, 3000) 
       },
    
     stopAutoRefresh() {
       if (this.timer) {
         clearInterval(this.timer)
         this.timer = null
       }
     },
     
                 
     
       async initChart() {
         if (!this.$refs.chartRef) return
         try {
           const chart = await this.$refs.chartRef.init(echarts)
           this._chartInstance = chart
           
           this.chartOption.legend.data = [
             this.$t('statistics.inbound'),
             this.$t('statistics.outbound')
           ]
           this.chartOption.series[0].name = this.$t('statistics.inbound')
           this.chartOption.series[1].name = this.$t('statistics.outbound')
           
           this._chartInstance.setOption(this.chartOption, false)
           
           if (this.chartData.timestamps.length > 0) {
             this.updateChart()
           }
         } catch (error) {
           console.error('chart init failed:', error)
         }
       },
     
       updateChartData() {
         if (!this.bandwidthData || this.bandwidthData.length < 2) return
         
         for (let i = 1; i < this.bandwidthData.length; i++) {
           const current = this.bandwidthData[i]
           const previous = this.bandwidthData[i - 1]
           
           if (current && previous) {
             const timeDelta = current[0] - previous[0]
             
             if (timeDelta > 0) {
               const rxRate = (current[1] - previous[1]) / timeDelta
               const txRate = (current[3] - previous[3]) / timeDelta
               
               this.addDataPoint(current[0], rxRate, txRate)
             }
           }
         }
         
         if (this._chartInstance) {
           this.updateChart()
         }
       },
     
     addDataPoint(timestamp, rxRate, txRate) {
       const maxPoints = 60
       
       const lastTimestamp = this.chartData.timestamps[this.chartData.timestamps.length - 1]
       if (lastTimestamp && lastTimestamp === timestamp) {
         return 
       }
       
       if (this.chartData.timestamps.length >= maxPoints) {
         this.chartData.timestamps.shift()
         this.chartData.rxRates.shift()
         this.chartData.txRates.shift()
       }
       
       this.chartData.timestamps.push(timestamp)
       this.chartData.rxRates.push(Math.max(0, rxRate)) 
       this.chartData.txRates.push(Math.max(0, txRate))
     },
     
       updateChart() {
         if (!this._chartInstance || !this.chartData.timestamps.length) return
         
         const categories = this.chartData.timestamps.map((timestamp, index) => {
           const date = new Date(timestamp * 1000)
           const minutes = date.getMinutes().toString().padStart(2, '0')
           const seconds = date.getSeconds().toString().padStart(2, '0')
           return `${minutes}:${seconds}`
         })
         
         const allRates = [...this.chartData.rxRates, ...this.chartData.txRates]
         const maxRate = Math.max(...allRates)
         const minRate = Math.min(...allRates)
         const rateRange = maxRate - minRate
         
         let yAxisMax
         if (rateRange < 100) {
           yAxisMax = Math.max(maxRate + 100, 500)
         } else {
           yAxisMax = maxRate + (rateRange * 0.2) 
         }
         
         const yAxisMin = Math.max(0, minRate - (rateRange * 0.1))
         
         const option = {
           ...this.chartOption,
           animation: false, 
           animationDuration: 0,
           xAxis: {
             ...this.chartOption.xAxis,
             data: categories
           },
           yAxis: {
             ...this.chartOption.yAxis,
             min: yAxisMin,
             max: yAxisMax
           },
           series: [
             {
               ...this.chartOption.series[0],
               data: this.chartData.rxRates,
               animation: false 
             },
             {
               ...this.chartOption.series[1],
               data: this.chartData.txRates,
               animation: false 
             }
           ]
         }
         
         this._chartInstance.setOption(option, false)
         
           }
  },
           watch: {
        currentTab(val) {
          this.loadPageData()
          if (val === 0) {
            if (!this.loadTimer) {
              this.startLoadRefresh()
            }
            this.$nextTick(() => {
              if (!this._loadChartInstance && this.$refs.loadChartRef) {
                this.initLoadChart()
              }
            })
          } else if (val === 1) {
            if (this.selectedDevice && !this.timer) {
              this.startAutoRefresh()
            }
            this.$nextTick(() => {
              if (!this._chartInstance && this.$refs.chartRef) {
                this.initChart()
              }
            })
          } else {
            this.stopAutoRefresh()
            this.stopLoadRefresh()
          }
        }
      }
              }
</script>

<style scoped lang="scss">


@import '@/styles/common.scss';

.selector-label {
  font-size: 28rpx;
  color: $oa-text;
  font-weight: bold;
  margin-bottom: 20rpx;
}

 .bandwidth-stats {
   display: flex;
   gap: 30rpx;
   margin-bottom: 30rpx;
 }

   .load-stats {
    display: flex;
    gap: 20rpx;
    margin-bottom: 30rpx;
  }

 .stat-section {
   flex: 1;
   background: $oa-surface-sunken;
   border-radius: $oa-radius-md;
   padding: 15rpx;
   min-width: 0;
 }

 .stat-title {
   font-size: 24rpx;
   font-weight: bold;
   color: $oa-text;
   margin-bottom: 15rpx;
   text-align: center;
 }

 .stat-row {
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: 8rpx;
 }

 .stat-label {
   font-size: 22rpx;
   color: $oa-text-muted;
 }

 .stat-value {
   font-size: 22rpx;
   color: $oa-text;
   font-weight: bold;
 }

 .current-value {
   color: $oa-brand;
 }

 .chart-container {
   background: $oa-surface-sunken;
   border-radius: $oa-radius-md;
   padding: 5rpx;
 }

               .chart-wrapper {
      height: 600rpx;
      background: $oa-surface;
      border-radius: 10rpx;
      overflow: hidden;
      position: relative;
    }
    
    .charts-box {
      width: 100%;
      height: 100%;
    }
</style>
