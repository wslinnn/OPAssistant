<template>
  <view class="container">
    <oa-card padding="lg">
      <view class="info-content">
        <!-- 无线客户端详情 -->
        <template v-if="type === 'wireless'">
          <view class="info-row" v-if="device.hostname">
            <text class="info-label">{{ $t('client.hostname') }}</text>
            <text class="info-value">{{ device.hostname }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.mac') }}</text>
            <text class="info-value">{{ device.mac }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.signal') }}</text>
            <text class="info-value">{{ device.signal }}dBm</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.connection_time') }}</text>
            <text class="info-value">{{ formatTime(device.connected_time) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.receive_rate') }}</text>
            <text class="info-value">{{ formatSingleRate(device, 'rx') }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.transmit_rate') }}</text>
            <text class="info-value">{{ formatSingleRate(device, 'tx') }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.interface') }}</text>
            <text class="info-value">{{ device.ifname }}</text>
          </view>
        </template>

        <!-- DHCPv4 分配详情 -->
        <template v-else-if="type === 'dhcpv4'">
          <view class="info-row">
            <text class="info-label">{{ $t('client.hostname') }}</text>
            <text class="info-value">{{ device.hostname || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.mac') }}</text>
            <text class="info-value">{{ device.macaddr }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.ip_address') }}</text>
            <text class="info-value">{{ device.ipaddr }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.lease_time') }}</text>
            <text class="info-value">{{ formatLeaseTime(device.expires) }}</text>
          </view>
        </template>

        <!-- DHCPv6 分配详情 -->
        <template v-else-if="type === 'dhcpv6'">
          <view class="info-row" v-if="device.macaddr">
            <text class="info-label">{{ $t('client.mac') }}</text>
            <text class="info-value">{{ device.macaddr }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.hostname') }}</text>
            <text class="info-value">{{ device.hostname || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.ipv6_address') }}</text>
            <text class="info-value">{{ device.ip6addr }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.duid') }}</text>
            <text class="info-value">{{ device.duid }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ $t('client.lease_time') }}</text>
            <text class="info-value">{{ formatLeaseTime(device.expires) }}</text>
          </view>
        </template>
      </view>
    </oa-card>
  </view>
</template>

<script>
export default {
  data() {
    return {
      device: {},
      type: ''
    }
  },
  onLoad(options) {
    uni.setNavigationBarTitle({
      title: this.$t('client_detail.title')
    })
    if (options.data) {
      try {
        const payload = JSON.parse(decodeURIComponent(options.data))
        this.device = payload.device || {}
        this.type = payload.type || ''
      } catch (e) {
        console.log('client_detail parse data failed:', e)
      }
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
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
    formatLeaseTime(val) {
      if (!val && val !== 0) return '-';
      const s = parseInt(val);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
      if (h > 0) return `${h}h ${m}m ${sec}s`;
      if (m > 0) return `${m}m ${sec}s`;
      return `${sec}s`;
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: $oa-text-muted;
  font-weight: 500;
  min-width: 120rpx;
}

.info-value {
  font-size: 28rpx;
  color: $oa-text;
  font-weight: 600;
  text-align: right;
  flex: 1;
  word-break: break-all;
}
</style>
