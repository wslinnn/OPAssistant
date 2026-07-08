<template>
  <view class="container">
     <view class="tab-bar">
      <view :class="['tab', currentTab === 1 ? 'active' : '']" @click="currentTab = 1">{{ $t('client.wireless_clients') }}</view>
      <view :class="['tab', currentTab === 2 ? 'active' : '']" @click="currentTab = 2">{{ $t('client.dhcpv4_allocation') }}</view>
      <view :class="['tab', currentTab === 3 ? 'active' : '']" @click="currentTab = 3">{{ $t('client.dhcpv6_allocation') }}</view>
     </view>
    <view v-if="currentTab === 1">
      <oa-empty v-if="loading" :text="$t('client.wireless_clients_loading')" />
      <oa-empty v-else-if="wirelessClients.length === 0" :text="$t('client.no_wireless_clients')" />
      <view v-else>
        <oa-card v-for="(client, index) in wirelessClients" :key="index" padding="lg" @click.native="goToDeviceDetail(client, 'wireless')">
          <view class="client-row">
            <text class="label">{{ $t('client.mac') }}：</text>
            <view class="value" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <view style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                {{ client.mac }}
              </view>
              <image class="kick-btn" src="/static/remove1.png" mode="widthFix" style="width: 40rpx; height: 40rpx;" @click.stop="kickClient(client)" />
            </view>
          </view>
          <view v-if="client.hostname" class="client-row">
            <text class="label">{{ $t('client.hostname') }}：</text>
            <text class="value">{{ client.hostname }}</text>
          </view>
          <view class="client-row"><text class="label">{{ $t('client.signal') }}：</text><text class="value">{{ client.signal }}dBm</text></view>
          <view class="client-row"><text class="label">{{ $t('client.connection_time') }}：</text><text class="value">{{ formatTime(client.connected_time) }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.receive_rate') }}：</text><text class="value">{{ formatSingleRate(client, 'rx') }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.transmit_rate') }}：</text><text class="value">{{ formatSingleRate(client, 'tx') }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.interface') }}：</text><view class="value">{{ client.ifname }}<text v-if="wirelessIfBandMap[client.ifname]" class="band-info">{{ $t('client.band_info', { band: wirelessIfBandMap[client.ifname] }) }}</text></view></view>
        </oa-card>
      </view>
    </view>

    <view v-else-if="currentTab === 2">
      <oa-empty v-if="dhcpv4List.length === 0" :text="$t('client.no_dhcpv4_allocation')" />
      <view v-else>
        <oa-card v-for="(item, index) in dhcpv4List" :key="index" padding="lg" @click.native="goToDeviceDetail(item, 'dhcpv4')">
          <view class="client-row"><text class="label">{{ $t('client.mac') }}：</text><text class="value">{{ item.macaddr }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.hostname') }}：</text><text class="value">{{ item.hostname || '-' }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.ip_address') }}：</text><text class="value">{{ item.ipaddr }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.lease_time') }}：</text><text class="value">{{ formatLeaseTime(item.expires) }}</text></view>
        </oa-card>
      </view>
    </view>

    <view v-else-if="currentTab === 3">
      <oa-empty v-if="dhcpv6List.length === 0" :text="$t('client.no_dhcpv6_allocation')" />
      <view v-else>
        <oa-card v-for="(item, index) in dhcpv6List" :key="index" padding="lg" @click.native="goToDeviceDetail(item, 'dhcpv6')">
          <view v-if="item.macaddr" class="client-row"><text class="label">{{ $t('client.mac') }}：</text><text class="value">{{ item.macaddr }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.hostname') }}：</text><text class="value">{{ item.hostname || '-' }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.ipv6_address') }}：</text><text class="value">{{ item.ip6addr }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.duid') }}：</text><text class="value">{{ item.duid }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.lease_time') }}：</text><text class="value">{{ formatLeaseTime(item.expires) }}</text></view>
        </oa-card>
      </view>
    </view>
  </view>
</template>

<script>
import DeviceManager from '@/utils/deviceManager.js'
export default {
  data() {
    return {
      currentTab: 1,
      session: '',
      url: '/ubus',
      deviceInfo: {},
      wirelessClients: [],
      loading: false,
      wirelessIfBandMap: {},
      dhcpv4List: [],
      dhcpv6List: []
    }
  },
  onLoad() {
    uni.setNavigationBarTitle({
      title: this.$t('client.title')
    })

    this.deviceInfo = DeviceManager.getCurrentDevice()
    this.session = this.deviceInfo.sysauth
    const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
    const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
    this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
    this.loadData()
  },
  onShow() {
    uni.setNavigationBarTitle({
      title: this.$t('client.title')
    })
    uni.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F8F8F8'
    })
  },
  methods: {
    goBack() {
      uni.reLaunch({ url: '/pages/device_list' })
    },
    // 跳转到设备详情页面（通用：无线/DHCP）
    goToDeviceDetail(device, type) {
      const data = encodeURIComponent(JSON.stringify({ device, type }))
      uni.navigateTo({
        url: `/pages/device/client_detail?data=${data}`
      })
    },
    loadData() {
      if (this.currentTab === 1) {
        this.fetchWirelessClients()
      } else if (this.currentTab === 2) {
        this.fetchDHCPv4List()
      } else if (this.currentTab === 3) {
        this.fetchDHCPv6List()
      }
    },
    async fetchWirelessClients() {
      this.loading = true
      this.wirelessClients = []
      this.wirelessIfBandMap = {}
      const [interfaces, dhcpv4, dhcpv6] = await Promise.all([
        this.getWirelessInterfaces(),
        this.getDHCPv4Leases(),
        this.getDHCPv6Leases()
      ])
      const macToHostname = {}
      dhcpv4.forEach(item => { if(item.macaddr) macToHostname[item.macaddr.toUpperCase()] = item.hostname })
      dhcpv6.forEach(item => { if(item.macaddr) macToHostname[item.macaddr.toUpperCase()] = item.hostname })
      let allClients = []
      for (let iface of interfaces) {
        let clients = await this.getClientsByInterface(iface.ifname)
        allClients.push(...clients.map(c => ({
          ...c,
          ifname: iface.ifname,
          hostname: macToHostname[(c.mac || '').toUpperCase()] || ''
        })))
      }
      this.wirelessClients = allClients
      this.loading = false
    },
    getWirelessInterfaces() {
      return new Promise((resolve) => {
        uni.request({
          method: 'POST',
          url: this.url,
          data: {
            jsonrpc: '2.0',
            id: 101,
            method: 'call',
            params: [this.session, 'luci-rpc', 'getWirelessDevices', {}]
          },
          header: { 'Content-Type': 'application/json' },
		  timeout: 3000,
          success: (res) => {
            let interfaces = []
            if (res.data && res.data.result && res.data.result[1]) {
              const radios = res.data.result[1]
              Object.values(radios).forEach(radio => {
                let band = radio.config && radio.config.band ? radio.config.band.toUpperCase() : '-'
                if (radio.interfaces && Array.isArray(radio.interfaces)) {
                  radio.interfaces.forEach(iface => {
                    if (iface.ifname) {
                      interfaces.push({ifname: iface.ifname, band})
                      this.wirelessIfBandMap[iface.ifname] = band
                    }
                  })
                }
              })
            }
            resolve(interfaces)
          },
          fail: () => resolve([])
        })
      })
    },

    getClientsByInterface(ifname) {
      return new Promise((resolve) => {
        uni.request({
          method: 'POST',
          url: this.url,
          data: {
            jsonrpc: '2.0',
            id: 102,
            method: 'call',
            params: [this.session, 'iwinfo', 'assoclist', { device: ifname }]
          },
          header: { 'Content-Type': 'application/json' },
		  timeout: 3000,
          success: (res) => {
            let clients = []
            if (res.data && res.data.result && res.data.result[1] && res.data.result[1].results) {
              clients = res.data.result[1].results
            }
            resolve(clients)
          },
          fail: () => resolve([])
        })
      })
    },
    formatTime(val) {
      if (!val && val !== 0) return '-';
      const s = parseInt(val);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      let str = '';
      if (d > 0) str += `${d}d `;
      if (h > 0 || d > 0) str += `${h}h `;
      if (m > 0 || h > 0 || d > 0) str += `${m}m `;
      str += `${sec}s`;
      return str.trim();
    },
    formatSingleRate(client, dir) {
      const info = (client[dir] || {});
      const rate = info.rate ? (info.rate / 1000).toFixed(1) : '-';
      const mhz = info.mhz ? `${info.mhz}MHz` : '';
      let mcsType = '';
      if (info.ht === true) mcsType = 'ht';
      else if (info.vht === true) mcsType = 'vht';
      else if (info.he === true) mcsType = 'he';
      else if (info.eht === true) mcsType = 'eht';
      let mcsStr = '';
      if (typeof info.mcs === 'number' && mcsType) mcsStr = `${mcsType}-mcs${info.mcs}`;
      let str = `${rate} Mbit/s`;
      if (mhz) str += ` ${mhz}`;
      if (mcsStr) str += ` ${mcsStr}`;
      return str;
    },
    fetchDHCPv4List() {
      this.dhcpv4List = []
      uni.request({
        method: 'POST',
        url: this.url,
        data: {
          jsonrpc: '2.0',
          id: 201,
          method: 'call',
          params: [this.session, 'luci-rpc', 'getDHCPLeases', {}]
        },
        header: { 'Content-Type': 'application/json' },
		timeout: 3000,
        success: (res) => {
          if (res.data && res.data.result && res.data.result[1] && res.data.result[1].dhcp_leases) {
            this.dhcpv4List = res.data.result[1].dhcp_leases
          }
        }
      })
    },
    fetchDHCPv6List() {
      this.dhcpv6List = []
      uni.request({
        method: 'POST',
        url: this.url,
        data: {
          jsonrpc: '2.0',
          id: 202,
          method: 'call',
          params: [this.session, 'luci-rpc', 'getDHCPLeases', {}]
        },
        header: { 'Content-Type': 'application/json' },
		timeout: 3000,
        success: (res) => {
          if (res.data && res.data.result && res.data.result[1] && res.data.result[1].dhcp6_leases) {
            this.dhcpv6List = res.data.result[1].dhcp6_leases
          }
        }
      })
    },
    formatLeaseTime(val) {
      if (!val && val !== 0) return '-';
      const s = parseInt(val);
      const d = Math.floor(s / 86400); // 86400 = 24 * 60 * 60
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
      if (h > 0) return `${h}h ${m}m ${sec}s`;
      if (m > 0) return `${m}m ${sec}s`;
      return `${sec}s`;
    },
    getDHCPv4Leases() {
      return new Promise((resolve) => {
        uni.request({
          method: 'POST',
          url: this.url,
          data: {
            jsonrpc: '2.0',
            id: 201,
            method: 'call',
            params: [this.session, 'luci-rpc', 'getDHCPLeases', {}]
          },
          header: { 'Content-Type': 'application/json' },
          timeout: 3000,
          success: (res) => {
            if (res.data && res.data.result && res.data.result[1] && res.data.result[1].dhcp_leases) {
              resolve(res.data.result[1].dhcp_leases)
            } else {
              resolve([])
            }
          },
          fail: () => resolve([])
        })
      })
    },
    getDHCPv6Leases() {
      return new Promise((resolve) => {
        uni.request({
          method: 'POST',
          url: this.url,
          data: {
            jsonrpc: '2.0',
            id: 202,
            method: 'call',
            params: [this.session, 'luci-rpc', 'getDHCPLeases', {}]
          },
          header: { 'Content-Type': 'application/json' },
          timeout: 3000,
          success: (res) => {
            if (res.data && res.data.result && res.data.result[1] && res.data.result[1].dhcp6_leases) {
              resolve(res.data.result[1].dhcp6_leases)
            } else {
              resolve([])
            }
          },
          fail: () => resolve([])
        })
      })
    },
    kickClient(client) {
      uni.showModal({
        title: this.$t('client.tip'),
        content: this.$t('client.confirm_disconnect', {
          mac: client.mac,
          hostname: client.hostname ? '('+client.hostname+')' : ''
        }),
        success: (res) => {
          if (res.confirm) {
            uni.request({
              method: 'POST',
              url: this.url,
              data: {
                jsonrpc: '2.0',
                id: 93,
                method: 'call',
                params: [
                  this.session,
                  `hostapd.${client.ifname}`,
                  'del_client',
                  {
                    addr: client.mac,
                    deauth: true,
                    reason: 5,
                    ban_time: 60000
                  }
                ]
              },
              header: { 'Content-Type': 'application/json' },
              timeout: 3000,
              success: (res) => {
                uni.showToast({ title: this.$t('client.disconnect_success'), icon: 'success' })
                this.loadData()
              },
              fail: () => {
                uni.showToast({ title: this.$t('client.disconnect_failed'), icon: 'none' })
              }
            })
          }
        }
      })
    }
  },
  watch: {
    currentTab(val) {
      this.loadData()
    }
  }
}
</script>

<style scoped lang="scss">

@import '@/styles/common.scss';

.client-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
}
.client-row:last-child {
  border-bottom: none;
}
.label {
  font-size: 26rpx;
  color: $oa-text-muted;
  font-weight: 500;
  min-width: 120rpx;
  flex-shrink: 0;
}
.value {
  font-size: 26rpx;
  font-weight: bold;
  color: $oa-text;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
  flex: 1;
}

.band-info {
  color: $oa-text-muted;
  font-size: 24rpx;
  margin-left: 4rpx;
  font-weight: normal;
}
.kick-btn {
  margin-left: 20rpx;
  cursor: pointer;
  transition: transform 0.2s;
}
.kick-btn:active {
  transform: scale(0.9);
}
</style>
