<template>
	<view class="container">
		<oa-countdown-action
			ref="countdownAction"
			icon="/static/reset.png"
			:title="$t('factory_reset.factory_reset_title')"
			:desc="$t('factory_reset.factory_reset_desc')"
			:btn-text="$t('factory_reset.factory_reset_btn')"
			:counting-btn-text="$t('factory_reset.resetting')"
			btn-type="negative"
			:seconds="60"
			:progress-title="$t('factory_reset.factory_reset_in_progress')"
			:progress-desc="$t('factory_reset.please_wait_reset')"
			:countdown-suffix="$t('factory_reset.seconds')"
			@action="confirmReset"
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
			title: this.$t('factory_reset.title')
		})

		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
	},
	methods: {
		confirmReset() {
			uni.showModal({
				title: this.$t('factory_reset.confirm_factory_reset'),
				content: this.$t('factory_reset.confirm_factory_reset_content'),
				confirmText: this.$t('factory_reset.confirm_factory_reset_text'),
				confirmColor: '#ff3b30',
				success: (res) => {
					if (res.confirm) {
						this.executeReset()
					}
				}
			})
		},

		executeReset() {
			uni.request({
				method: 'POST',
				url: this.url,
				data: {
					jsonrpc: '2.0',
					id: 8,
					method: 'call',
					params: [this.session, 'file', 'exec', {
						command: '/sbin/firstboot',
						params: ['-r', '-y'],
						env: null
					}]
				},
				header: {
					'Content-Type': 'application/json',
					'x-uniauth': 'true'
				},
				timeout: 3000,
				success: (res) => {
					console.log('reset:', res)
				},
				fail: (err) => {
					console.log('reset:', err)
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
