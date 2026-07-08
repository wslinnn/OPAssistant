<template>
  <view class="container">
    <oa-card padding="lg">
      <!-- 无线客户端详情 -->
      <template v-if="type === 'wireless'">
        <oa-list-row v-if="device.hostname" :label="$t('client.hostname')" :value="device.hostname" />
        <oa-list-row :label="$t('client.mac')" :value="device.mac" />
        <oa-list-row :label="$t('client.signal')" :value="device.signal + 'dBm'" />
        <oa-list-row :label="$t('client.connection_time')" :value="formatTime(device.connected_time)" />
        <oa-list-row :label="$t('client.receive_rate')" :value="formatSingleRate(device, 'rx')" />
        <oa-list-row :label="$t('client.transmit_rate')" :value="formatSingleRate(device, 'tx')" />
        <oa-list-row :label="$t('client.interface')" :value="device.ifname" :border="false" />
      </template>

      <!-- DHCPv4 分配详情 -->
      <template v-else-if="type === 'dhcpv4'">
        <oa-list-row :label="$t('client.hostname')" :value="device.hostname || '-'" />
        <oa-list-row :label="$t('client.mac')" :value="device.macaddr" />
        <oa-list-row :label="$t('client.ip_address')" :value="device.ipaddr" />
        <oa-list-row :label="$t('client.lease_time')" :value="formatLeaseTime(device.expires)" :border="false" />
      </template>

      <!-- DHCPv6 分配详情 -->
      <template v-else-if="type === 'dhcpv6'">
        <oa-list-row v-if="device.macaddr" :label="$t('client.mac')" :value="device.macaddr" />
        <oa-list-row :label="$t('client.hostname')" :value="device.hostname || '-'" />
        <oa-list-row :label="$t('client.ipv6_address')" :value="device.ip6addr" />
        <oa-list-row :label="$t('client.duid')" :value="device.duid" />
        <oa-list-row :label="$t('client.lease_time')" :value="formatLeaseTime(device.expires)" :border="false" />
      </template>
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
</style>
