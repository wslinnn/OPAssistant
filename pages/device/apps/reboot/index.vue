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
import DeviceManager from '@/utils/deviceManager.js'

export default {
	data() {
		return {
			deviceInfo: {},
			session: '',
			url: '/ubus'
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({
			title: this.$t('reboot.title')
		})

		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
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
			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 3,
					method: 'call',
					params: [this.session, 'system', 'reboot', {}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 3000,
				success: (res) => {
					console.log('reboot:', res)
				},
				fail: (err) => {
					console.log('reboot:', err)
				},
				complete: () => {
					this.$refs.countdownAction.startCountdown()
				}
			})
		},

		onCountdownEnd() {
			uni.reLaunch({
				url: '/pages/device_list'
			})
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
</style>
