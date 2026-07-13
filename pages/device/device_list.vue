<template>
	<view class="container login-page">
		<oa-loading v-if="submitting" overlay :text="$t('device_list.connecting')" />

		<view class="login-brand">
			<image class="login-logo" src="/static/openwrt.png" mode="aspectFit" />
			<text class="login-brand__name">{{ $t('device_list.login_prompt') }}</text>
		</view>

		<view class="login-form">
			<!-- 连接 -->
			<text class="login-group">{{ $t('device_list.group_connection') }}</text>
			<view class="login-field" :class="{ 'is-focused': activeField === 'ip' }">
				<input class="login-input" v-model="deviceForm.ip" :placeholder="$t('device_list.host_placeholder')" @focus="activeField = 'ip'" @blur="activeField = ''" />
				<view class="login-field__icon" :aria-label="$t('device_list.history_title')" @click="goHistory">
					<image class="login-field__img" src="/static/list.png" mode="aspectFit" />
				</view>
			</view>
			<oa-segmented class="login-seg" :options="protocolOptions" v-model="deviceForm.useHttps" equal @change="onProtocolChange" />
			<view class="login-field" :class="{ 'is-focused': activeField === 'port' }">
				<input class="login-input" v-model="deviceForm.port" :placeholder="$t('device_list.port_placeholder')" @focus="activeField = 'port'" @blur="activeField = ''" />
			</view>

			<!-- 凭据 -->
			<text class="login-group">{{ $t('device_list.group_credentials') }}</text>
			<view class="login-field" :class="{ 'is-focused': activeField === 'username' }">
				<input class="login-input" v-model="deviceForm.username" :placeholder="$t('device_list.username_placeholder')" @focus="activeField = 'username'" @blur="activeField = ''" />
			</view>
			<view class="login-field" :class="{ 'is-focused': activeField === 'password' }">
				<input class="login-input" v-model="deviceForm.password" :password="!showPassword" :placeholder="$t('device_list.password_placeholder')" @focus="activeField = 'password'" @blur="activeField = ''" />
				<view class="login-field__icon" :aria-label="showPassword ? $t('device_list.password_hide') : $t('device_list.password_show')" @click="showPassword = !showPassword">
					<image class="login-field__img" src="/static/eye.png" mode="aspectFit" />
				</view>
			</view>

			<!-- 命名 -->
			<text class="login-group">{{ $t('device_list.group_naming') }}</text>
			<view class="login-field" :class="{ 'is-focused': activeField === 'name' }">
				<input class="login-input" v-model="deviceForm.name" :placeholder="$t('device_list.name_placeholder')" @focus="activeField = 'name'" @blur="activeField = ''" />
			</view>

			<oa-button type="primary" block class="login-submit" @click="connect">{{ $t('device_list.connect') }}</oa-button>

			<view class="login-lang" :aria-label="$t('device_list.language_settings')" @click="goLanguage">
				<image class="login-lang__icon" src="/static/lang.png" mode="aspectFit" />
				<text class="login-lang__text">{{ $t('device_list.language_settings') }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import DeviceManager from '@/utils/device-manager.js'

	// 登录页(由原设备列表改造):品牌头 + 分组凹陷表单 + 历史入口 + 密码显隐 + 通栏连接。
	// 首跑 / 自动重连失败 / 切换器"添加/编辑"时进入。onLoad 读 editId 进入编辑预填模式。
	export default {
		data() {
			return {
				deviceForm: {
					name: 'OpenWrt',
					ip: '192.168.1.1',
					port: '80',
					username: 'root',
					password: '',
					useHttps: false
				},
				isEdit: false,
				editDeviceId: null,
				showPassword: false,
				submitting: false,
				activeField: ''
			}
		},
		computed: {
			protocolOptions() {
				return [
					{ value: false, label: this.$t('device_list.protocol_http') },
					{ value: true, label: this.$t('device_list.protocol_https') }
				]
			}
		},
		onLoad(options) {
			uni.setNavigationBarTitle({ title: this.$t('device_list.login_title') })
			if (options && options.editId) {
				const d = DeviceManager.getDeviceById(options.editId)
				if (d) {
					this.isEdit = true
					this.editDeviceId = d.id
					this.deviceForm = {
						name: d.name || 'OpenWrt',
						ip: d.ip || '',
						port: d.port || '80',
						username: d.username || 'root',
						password: d.password || '',
						useHttps: !!d.useHttps
					}
				}
			}
		},
		onShow() {
			uni.setNavigationBarTitle({ title: this.$t('device_list.login_title') })
		},
		methods: {
			getErrorMessage(errorCode) {
				switch (errorCode) {
					case 4000: return this.$t('device_list.error_network')
					case 4001: return this.$t('device_list.error_auth')
					case 4002: return this.$t('device_list.error_other')
					case 4003: return this.$t('device_list.error_certificate')
					default: return this.$t('device_list.connection_failed_content')
				}
			},
			goHistory() {
				uni.navigateTo({ url: '/pages/device/device_list_history' })
			},
			goLanguage() {
				uni.navigateTo({ url: '/pages/language/index' })
			},
			validateIP(host) {
				const s = String(host || '').trim()
				if (!s || s.length > 64) return false
				if (!/^[a-zA-Z0-9.:\-]+$/.test(s)) return false
				if (!/[a-zA-Z0-9]/.test(s)) return false
				if (/[.]{2,}|[\-]{2,}/.test(s)) return false
				if (/^[.\-]|[.\-]$/.test(s)) return false
				const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s)
				if (ipv4) return ipv4.slice(1).every(seg => Number(seg) <= 255)
				return true
			},
			onProtocolChange(useHttps) {
				const p = this.deviceForm.port
				if (useHttps && p === '80') this.deviceForm.port = '443'
				else if (!useHttps && p === '443') this.deviceForm.port = '80'
			},
			validatePort(port) {
				const portNum = parseInt(port)
				return portNum >= 1 && portNum <= 65535
			},
			validateUsername(username) {
				return /^[a-zA-Z0-9.\-_@]+$/.test(username)
			},
			validatePassword(password) {
				if (password === '') return { valid: true, message: '' }
				if (password.length > 64) return { valid: false, message: this.$t('device_list.password_length_error') }
				if (password.includes(' ') || password.includes('\n') || password.includes('\r')) return { valid: false, message: this.$t('device_list.password_format_error') }
				if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/.test(password)) return { valid: false, message: this.$t('device_list.password_char_error') }
				return { valid: true, message: '' }
			},
			validateName(name) {
				return name.length <= 64
			},
			connect() {
				if (!this.deviceForm.ip) { uni.showToast({ title: this.$t('device_list.host_required'), icon: 'none' }); return }
				if (!this.validateIP(this.deviceForm.ip)) { uni.showToast({ title: this.$t('device_list.host_format_error'), icon: 'none' }); return }
				if (!this.deviceForm.port) { uni.showToast({ title: this.$t('device_list.port_required'), icon: 'none' }); return }
				if (!this.validatePort(this.deviceForm.port)) { uni.showToast({ title: this.$t('device_list.port_range_error'), icon: 'none' }); return }
				if (!this.deviceForm.username) { uni.showToast({ title: this.$t('device_list.username_required'), icon: 'none' }); return }
				if (!this.validateUsername(this.deviceForm.username)) { uni.showToast({ title: this.$t('device_list.username_format_error'), icon: 'none' }); return }
				const pv = this.validatePassword(this.deviceForm.password)
				if (!pv.valid) { uni.showToast({ title: pv.message, icon: 'none' }); return }
				if (!this.deviceForm.name) { uni.showToast({ title: this.$t('device_list.remark_required'), icon: 'none' }); return }
				if (!this.validateName(this.deviceForm.name)) { uni.showToast({ title: this.$t('device_list.remark_length_error'), icon: 'none' }); return }

				this.submitting = true
				DeviceManager.loginDevice({ ...this.deviceForm, sysauth: null }, (r) => {
					this.submitting = false
					if (!r.success) {
						uni.showModal({ title: this.$t('device_list.connection_failed'), content: this.getErrorMessage(r.errorCode), showCancel: false })
						return
					}
					// 登录成功:持久化设备 + 设为当前 + 进首页
					const base = { ...this.deviceForm, sysauth: r.sysauth, online: true }
					if (this.isEdit && this.editDeviceId) {
						base.id = this.editDeviceId
						DeviceManager.updateDevice(this.editDeviceId, base)
					} else {
						DeviceManager.addDevice(this.deviceForm)
						const list = DeviceManager.getDeviceList()
						const saved = list.find(d => d.ip === this.deviceForm.ip && d.username === this.deviceForm.username) || list[list.length - 1]
						base.id = saved ? saved.id : undefined
					}
					DeviceManager.setCurrentDevice(base)
					uni.showToast({ title: this.$t('device_list.connection_success'), icon: 'success', duration: 800 })
					setTimeout(() => uni.reLaunch({ url: '/pages/device/home' }), 600)
				})
			}
		}
	}
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.login-page {
		min-height: 100vh;
		background: $oa-surface;
		padding: $oa-sp-5 $oa-sp-4;
	}
	.login-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: $oa-sp-5;
	}
	.login-logo {
		width: 140rpx;
		height: 140rpx;
		border-radius: $oa-radius-xl;
		margin-bottom: $oa-sp-2;
	}
	.login-brand__name {
		font-size: $oa-fs-h1;
		font-weight: 600;
		color: $oa-text;
	}
	.login-form {
		display: flex;
		flex-direction: column;
	}
	.login-group {
		font-size: $oa-fs-caption;
		font-weight: 600;
		color: $oa-text-muted;
		margin: $oa-sp-3 0 $oa-sp-2;
	}
	.login-group:first-child {
		margin-top: 0;
	}
	.login-field {
		display: flex;
		align-items: center;
		background: $oa-surface-sunken;
		border-radius: $oa-radius-md;
		height: 80rpx;
		padding: 0 $oa-sp-2;
		margin-bottom: $oa-sp-2;
		@include oa-input-focus();
	}
	.login-input {
		flex: 1;
		min-width: 0;
		font-size: $oa-fs-body;
		color: $oa-text;
	}
	.login-field__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80rpx;
		height: 80rpx;
		transition: opacity 0.15s ease;
	}
	.login-field__icon:active {
		opacity: 0.5;
	}
	.login-field__img {
		width: 36rpx;
		height: 36rpx;
	}
	.login-seg {
		margin-bottom: $oa-sp-2;
	}
	.login-submit {
		margin-top: $oa-sp-4;
	}
	.login-lang {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $oa-sp-1;
		margin-top: $oa-sp-4;
		padding: $oa-sp-2;
		transition: opacity 0.15s ease;
	}
	.login-lang:active {
		opacity: 0.5;
	}
	.login-lang__icon {
		width: 32rpx;
		height: 32rpx;
	}
	.login-lang__text {
		font-size: $oa-fs-caption;
		color: $oa-text-muted;
	}
</style>
