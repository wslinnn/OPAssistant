<template>
  <view class="container">
     <page-tab :tabs="tab_list" v-model="currentTab" />
    <view v-if="currentTab === 1">
      <oa-empty v-if="loading" :text="$t('client.wireless_clients_loading')" />
      <oa-empty v-else-if="wirelessClients.length === 0" :text="$t('client.no_wireless_clients')" />
      <view v-else>
        <oa-card v-for="(client, index) in wirelessClients" :key="index" padding="lg" @click.native="goToDeviceDetail(client, 'wireless')">
          <view class="client-row">
            <text class="label">{{ $t('client.mac') }}：</text>
            <view class="value" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <view style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <oa-copy-text :text="client.mac">{{ client.mac }}</oa-copy-text>
              </view>
              <image class="kick-btn" src="/static/remove1.png" mode="widthFix" style="width: 40rpx; height: 40rpx;" @click.stop="kickClient(client)" />
            </view>
          </view>
          <view v-if="client.hostname" class="client-row">
            <text class="label">{{ $t('client.hostname') }}：</text>
            <oa-copy-text class="value" :text="client.hostname">{{ client.hostname }}</oa-copy-text>
          </view>
          <view class="client-row"><text class="label">{{ $t('client.signal') }}：</text><text class="value">{{ client.signal }}dBm</text></view>
          <view class="client-row"><text class="label">{{ $t('client.connection_time') }}：</text><text class="value">{{ formatTime(client.connected_time) }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.receive_rate') }}：</text><text class="value">{{ formatSingleRate(client, 'rx') }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.transmit_rate') }}：</text><text class="value">{{ formatSingleRate(client, 'tx') }}</text></view>
          <view class="client-row"><text class="label">{{ $t('client.interface') }}：</text><oa-copy-text class="value" :text="client.ifname">{{ client.ifname }}<text v-if="wirelessIfBandMap[client.ifname]" class="band-info">{{ $t('client.band_info', { band: wirelessIfBandMap[client.ifname] }) }}</text></oa-copy-text></view>
        </oa-card>
      </view>
    </view>

    <view v-else-if="currentTab === 2">
      <oa-empty v-if="dhcpv4List.length === 0" :text="$t('client.no_dhcpv4_allocation')" />
      <view v-else>
        <oa-card v-for="(item, index) in dhcpv4List" :key="index" padding="lg" @click.native="goToDeviceDetail(item, 'dhcpv4')">
          <view class="client-row"><text class="label">{{ $t('client.mac') }}：</text><oa-copy-text class="value" :text="item.macaddr">{{ item.macaddr }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.hostname') }}：</text><oa-copy-text class="value" :text="item.hostname">{{ item.hostname || '-' }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.ip_address') }}：</text><oa-copy-text class="value" :text="item.ipaddr">{{ item.ipaddr }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.lease_time') }}：</text><text class="value">{{ formatLeaseTime(item.expires) }}</text></view>
        </oa-card>
      </view>
    </view>

    <view v-else-if="currentTab === 3">
      <oa-empty v-if="dhcpv6List.length === 0" :text="$t('client.no_dhcpv6_allocation')" />
      <view v-else>
        <oa-card v-for="(item, index) in dhcpv6List" :key="index" padding="lg" @click.native="goToDeviceDetail(item, 'dhcpv6')">
          <view v-if="item.macaddr" class="client-row"><text class="label">{{ $t('client.mac') }}：</text><oa-copy-text class="value" :text="item.macaddr">{{ item.macaddr }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.hostname') }}：</text><oa-copy-text class="value" :text="item.hostname">{{ item.hostname || '-' }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.ipv6_address') }}：</text><oa-copy-text class="value" :text="item.ip6addr">{{ item.ip6addr }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.duid') }}：</text><oa-copy-text class="value" :text="item.duid">{{ item.duid }}</oa-copy-text></view>
          <view class="client-row"><text class="label">{{ $t('client.lease_time') }}：</text><text class="value">{{ formatLeaseTime(item.expires) }}</text></view>
        </oa-card>
      </view>
    </view>
  </view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import Wireless from '@/utils/wireless.js'
import { formatDuration } from '@/utils/format.js'
import PageTab from '@/components/PageTab.vue'
export default {
  components: { PageTab },
  computed: {
    tab_list() {
      return [
        { value: 1, label: this.$t('client.wireless_clients') },
        { value: 2, label: this.$t('client.dhcpv4_allocation') },
        { value: 3, label: this.$t('client.dhcpv6_allocation') }
      ]
    }
  },
  data() {
    return {
      currentTab: 1,
      wirelessClients: [],
      loading: false,
      wirelessIfBandMap: {},
      dhcpCache: null,
      dhcpBusy: null,
      dhcpv4List: [],
      dhcpv6List: []
    }
  },
  onLoad() {
    uni.setNavigationBarTitle({
      title: this.$t('client.title')
    })

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
      this.dhcpCache = null
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
    async getWirelessInterfaces() {
      try {
        const radios = await UciRpc.callUbus('luci-rpc', 'getWirelessDevices', {})
        const interfaces = []
        if (radios) {
          Object.values(radios).forEach(radio => {
            const band = radio.config && radio.config.band ? radio.config.band.toUpperCase() : ''
            if (radio.interfaces && Array.isArray(radio.interfaces)) {
              radio.interfaces.forEach(iface => {
                if (iface.ifname) {
                  interfaces.push({ ifname: iface.ifname, band })
                  this.wirelessIfBandMap[iface.ifname] = band
                }
              })
            }
          })
        }
        return interfaces
      } catch (e) {
        return []
      }
                },

    async getClientsByInterface(ifname) {
      return Wireless.getAssocList(ifname)
    },
    formatTime(val) {
      return formatDuration(val)
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
    async ensureDhcpLeases() {
      if (this.dhcpCache) return this.dhcpCache
      if (this.dhcpBusy) return this.dhcpBusy
      this.dhcpBusy = (async () => {
        let cache = { v4: [], v6: [] }
        try {
          const leases = await UciRpc.callUbus('luci-rpc', 'getDHCPLeases', {})
          cache = { v4: (leases && leases.dhcp_leases) || [], v6: (leases && leases.dhcp6_leases) || [] }
        } catch (e) {}
        this.dhcpCache = cache
        this.dhcpBusy = null
        return cache
      })()
      return this.dhcpBusy
    },
    async fetchDHCPv4List() {
      const { v4 } = await this.ensureDhcpLeases()
      this.dhcpv4List = v4
    },
    async fetchDHCPv6List() {
      const { v6 } = await this.ensureDhcpLeases()
      this.dhcpv6List = v6
    },
    formatLeaseTime(val) {
      return formatDuration(val)
    },
    async getDHCPv4Leases() {
      const { v4 } = await this.ensureDhcpLeases()
      return v4
    },
    async getDHCPv6Leases() {
      const { v6 } = await this.ensureDhcpLeases()
      return v6
    },
    kickClient(client) {
      uni.showModal({
        title: this.$t('client.tip'),
        content: this.$t('client.confirm_disconnect', { mac: client.mac, hostname: client.hostname ? '('+client.hostname+')' : '' }),
        success: (res) => {
          if (res.confirm) {
            Wireless.kickClient(client.ifname, client.mac)
              .then(() => { uni.showToast({ title: this.$t('client.disconnect_success'), icon: 'success' }); this.loadData() })
              .catch(() => { uni.showToast({ title: this.$t('client.disconnect_failed'), icon: 'none' }) })
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
