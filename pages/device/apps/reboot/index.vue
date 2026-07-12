<template>
	<view class="container">
		<oa-countdown-action
			ref="countdownAction"
			icon="/static/reboot.png"
			:title="$t('reboot.device_restart')"
			:desc="$t('reboot.restart_desc')"
			:btn-text="$t('reboot.restart_device')"
			:counting-btn-text="$t('reboot.restarting')"
			btn-type="negative"
			:seconds="60"
			:progress-title="$t('reboot.device_restarting')"
			:progress-desc="$t('reboot.please_wait')"
			:countdown-suffix="$t('reboot.seconds')"
			@action="confirmReboot"
			@countdown-end="onCountdownEnd"
		/>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			url: '/ubus'
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('reboot.title')
		})

	},
	methods: {
		confirmReboot() {
			uni.showModal({
				title: this.$t('reboot.confirm_restart'),
				content: this.$t('reboot.confirm_restart_content'),
				confirmText: this.$t('reboot.confirm_restart_text'),
				confirmColor: '#ff3b30',
				success: (res) => {
					if (res.confirm) {
						this.executeReboot()
					}
				}
			})
		},

		executeReboot() {
			UciRpc.callUbus('system', 'reboot', {}, 15000)
				.catch(() => {})
				.finally(() => { this.$refs.countdownAction.startCountdown() })
		},

		onCountdownEnd() {
			uni.reLaunch({
				url: '/pages/device/device_list'
			})
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
</style>
