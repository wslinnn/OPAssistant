<template>
	<view class="container">
		<view class="header">
			<view class="menu-btn" :aria-label="$t('device_list.settings')" @click="showMenu">
				<image class="menu-icon" src="/static/menu.png" mode="widthFix" style="width: 50rpx; height: 50rpx;" />
			</view>
			<view class="header-actions">
				<view class="add-btn" :aria-label="$t('device_list.add_device')" @click="addDevice">
					<image class="add-icon" src="/static/add.png" mode="widthFix" />
				</view>
			</view>
		</view>

		<uni-popup ref="menuPopup" type="top" :mask-click="true">
			<view class="menu-content">
				<view class="menu-item" @click="navigateToSettings">
					<text class="menu-item-text">{{ $t('device_list.language_settings') }}</text>
					<image class="menu-item-arrow" src="/static/right.png" mode="widthFix" style="width: 32rpx; height: 32rpx;" />
				</view>
			</view>
		</uni-popup>

		<view class="device-list-container">
			<oa-empty
				v-if="deviceList.length === 0"
				icon="/static/openwrt.png"
			>
				<text class="empty-title">{{ $t('device_list.empty_title') }}</text>
				<text class="empty-value">{{ $t('device_list.empty_value') }}</text>
				<oa-button type="primary" class="empty-cta" @click="addDevice">{{ $t('device_list.empty_cta') }}</oa-button>
				<text class="empty-hint">{{ $t('device_list.empty_hint') }}</text>
			</oa-empty>
			<view v-else :key="item.id" v-for="item in deviceList">
				<view class="device-card" @click="onCardClickHandle(item)">
					<view class="card-content">
						<image class="device-icon" src="/static/openwrt.png" mode="widthFix" />
						<view class="device-info">
							<oa-copy-text class="device-name" :text="item.name">{{item.name}}</oa-copy-text>
							<oa-copy-text class="device-address" :text="item.ip">{{formatDeviceAddress(item)}}</oa-copy-text>
						</view>
						<view class="more-btn" :aria-label="$t('device_list.more_aria')" @click.stop="showDeviceMenu(item)">
							<image class="more-icon" src="/static/more.png" mode="widthFix" />
						</view>
					</view>
				</view>
			</view>
		</view>

		<uni-popup ref="devicePopup" type="center" :mask-click="false">
			<view class="popup-content popup">
				<view class="popup-header">
					<text class="popup-title">{{isEdit ? $t('device_list.edit_device_popup') : $t('device_list.add_device_popup')}}</text>
				</view>
				<view class="form-content">
					<view class="form-item">
						<text class="label">{{ $t('device_list.host_address') }}:</text>
						<input class="input" v-model="deviceForm.ip" :placeholder="$t('device_list.host_placeholder')" />
					</view>
					<view class="form-item">
						<text class="label">{{ $t('device_list.protocol') }}:</text>
						<oa-segmented :options="protocolOptions" v-model="deviceForm.useHttps" equal @change="onProtocolChange" />
					</view>
					<view class="form-item">
						<text class="label">{{ $t('device_list.username_default') }}:</text>
						<input class="input" v-model="deviceForm.username" :placeholder="$t('device_list.username_placeholder')" />
					</view>
					<view class="form-item">
						<text class="label">{{ $t('device_list.password') }}:</text>
						<input class="input" v-model="deviceForm.password" :placeholder="$t('device_list.password_placeholder')" type="password" />
					</view>
					<view class="form-item">
						<text class="label">{{ $t('device_list.port_default') }}:</text>
						<input class="input" v-model="deviceForm.port" :placeholder="$t('device_list.port_placeholder')" />
					</view>
					<view class="form-item">
						<text class="label">{{ $t('device_list.remark') }}:</text>
						<input class="input" v-model="deviceForm.name" :placeholder="$t('device_list.name_placeholder')" />
					</view>
				</view>
				<view class="popup-actions">
					<oa-button type="neutral" block @click="closePopup">{{ $t('device_list.cancel') }}</oa-button>
					<oa-button type="primary" block @click="saveDevice">{{ $t('device_list.confirm') }}</oa-button>
				</view>
			</view>
		</uni-popup>

		<!-- 设备操作菜单弹窗 -->
		<uni-popup ref="deviceMenuPopup" type="bottom" :mask-click="true">
			<view class="device-menu-content">
				<view class="menu-item" @click="editDeviceFromMenu">
					<image class="menu-item-icon" src="/static/edit2.png" mode="widthFix" />
					<text class="menu-item-text">{{ $t('device_list.edit') }}</text>
				</view>
				<view class="menu-item delete-item" @click="deleteDeviceFromMenu">
					<image class="menu-item-icon" src="/static/delete2.png" mode="widthFix" />
					<text class="menu-item-text">{{ $t('device_list.delete') }}</text>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import DeviceManager from '@/utils/deviceManager.js'
	import UciRpc from '@/utils/uci-rpc.js'

	export default {
		data() {
			return {
				deviceList: [],
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
				currentDevice: null // 当前选中的设备
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
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.$t('device_list.title')
			})

			this.loadDeviceList()
		},
		onShow() {
			this.loadDeviceList()
		},
		methods: {
			// 根据错误码获取错误消息
			getErrorMessage(errorCode) {
				switch (errorCode) {
					case 4000: // 网络错误
						return this.$t('device_list.error_network')
					case 4001: // 用户名密码错误
						return this.$t('device_list.error_auth')
					case 4002: // 其他错误
						return this.$t('device_list.error_other')
					case 4003: // 证书错误（HTTPS 自签证书等）
						return this.$t('device_list.error_certificate')
					default:
						return this.$t('device_list.connection_failed_content')
				}
			},

			loadDeviceList() {
				this.deviceList = DeviceManager.getDeviceList()
			},



			addDevice() {
				this.isEdit = false
				this.editDeviceId = null
				this.resetDeviceForm()
				this.$refs.devicePopup.open()
			},


			editDevice(device) {
				this.isEdit = true
				this.editDeviceId = device.id
				// 获取解密后的设备信息
				const decryptedDevice = DeviceManager.getDeviceById(device.id)
				this.deviceForm = { ...decryptedDevice }
				this.$refs.devicePopup.open()
			},


			deleteDevice(deviceId) {
				uni.showModal({
					title: this.$t('device_list.delete_confirm_title'),
					content: this.$t('device_list.delete_confirm_content'),
					success: (res) => {
						if (res.confirm) {
							if (DeviceManager.deleteDevice(deviceId)) {
								this.loadDeviceList()
								uni.showToast({
									title: this.$t('device_list.delete_success'),
									icon: 'success',
									duration: 1000
								})
							} else {
								uni.showToast({
									title: this.$t('device_list.delete_failed'),
									icon: 'error',
									duration: 1000
								})
							}
						}
					}
				})
			},


			resetDeviceForm() {
				this.deviceForm = {
					name: 'OpenWrt',
					ip: '',
					port: '80',
					username: 'root',
					password: '',
					useHttps: false
				}
			},


			validateIP(host) {
				// 长度 ≤64，字符集限定（字母/数字/点/冒号/连字符），覆盖 IPv4/IPv6/域名
				const s = String(host || '').trim()
				if (!s || s.length > 64) return false
				if (!/^[a-zA-Z0-9.:\-]+$/.test(s)) return false
				if (!/[a-zA-Z0-9]/.test(s)) return false          // 必须含字母或数字（拒 "---"、"..."）
				if (/[.]{2,}|[\-]{2,}/.test(s)) return false       // 连续点/连字符非法（IPv6 "::" 放行）
				if (/^[.\-]|[.\-]$/.test(s)) return false          // 点/连字符不能首尾（IPv6 ':' 首尾可）
				// 形似 IPv4 时校验每段 ≤255（拒 "999.999.999.999"）
				const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s)
				if (ipv4) return ipv4.slice(1).every(seg => Number(seg) <= 255)
				return true
			},

			// 协议↔端口联动：切 HTTPS 默认 443、HTTP 默认 80（仅在常见默认值上自动切换，不覆盖自定义端口）
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
				const usernameRegex = /^[a-zA-Z0-9.\-_@]+$/
				return usernameRegex.test(username)
			},

			validatePassword(password) {

				if (password === '') {
					return { valid: true, message: '' }
				}

				if (password.length > 64) {
					return { valid: false, message: this.$t('device_list.password_length_error') }
				}
				if (password.includes(' ') || password.includes('\n') || password.includes('\r')) {
					return { valid: false, message: this.$t('device_list.password_format_error') }
				}

				const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/
				if (!passwordRegex.test(password)) {
					return { valid: false, message: this.$t('device_list.password_char_error') }
				}

				return { valid: true, message: '' }
			},

			// 验证备注长度
			validateName(name) {
				return name.length <= 64
			},


			saveDevice() {

				if (!this.deviceForm.ip) {
					uni.showToast({
						title: this.$t('device_list.host_required'),
						icon: 'none'
					})
					return
				}
				if (!this.validateIP(this.deviceForm.ip)) {
					uni.showToast({
						title: this.$t('device_list.host_format_error'),
						icon: 'none'
					})
					return
				}


				if (!this.deviceForm.port) {
					uni.showToast({
						title: this.$t('device_list.port_required'),
						icon: 'none'
					})
					return
				}
				if (!this.validatePort(this.deviceForm.port)) {
					uni.showToast({
						title: this.$t('device_list.port_range_error'),
						icon: 'none'
					})
					return
				}


				if (!this.deviceForm.username) {
					uni.showToast({
						title: this.$t('device_list.username_required'),
						icon: 'none'
					})
					return
				}
				if (!this.validateUsername(this.deviceForm.username)) {
					uni.showToast({
						title: this.$t('device_list.username_format_error'),
						icon: 'none'
					})
					return
				}


				const passwordValidation = this.validatePassword(this.deviceForm.password)
				if (!passwordValidation.valid) {
					uni.showToast({
						title: passwordValidation.message,
						icon: 'none'
					})
					return
				}

				if (!this.deviceForm.name) {
					uni.showToast({
						title: this.$t('device_list.remark_required'),
						icon: 'none'
					})
					return
				}
				if (!this.validateName(this.deviceForm.name)) {
					uni.showToast({
						title: this.$t('device_list.remark_length_error'),
						icon: 'none'
					})
					return
				}

				let success = false
				if (this.isEdit) {

					this.deviceForm.sysauth = null
					this.deviceForm.online = false
					success = DeviceManager.updateDevice(this.editDeviceId, this.deviceForm)
				} else {

					success = DeviceManager.addDevice(this.deviceForm)
				}

				if (success) {
					this.loadDeviceList()
					this.closePopup()
					uni.showToast({
						title: this.isEdit ? this.$t('device_list.edit_success') : this.$t('device_list.add_success'),
						icon: 'success',
						duration: 1000
					})
				} else {
					uni.showToast({
						title: this.$t('device_list.operation_failed'),
						icon: 'error',
						duration: 1000
					})
				}
			},


			closePopup() {
				this.$refs.devicePopup.close()
				this.resetDeviceForm()
			},






			onCardClickHandle(device) {

				uni.showLoading({
							title: this.$t('device_list.connecting')
						})

				DeviceManager.checkAndLoginDevice(device, (loginResult) => {
					console.log("check and login device")

					if (loginResult.success) {
						console.log("loginResult.success = " + loginResult.success)
						console.log("loginResult.sysauth = " + loginResult.sysauth)

						const updatedDevice = { ...device, sysauth: loginResult.sysauth, online: true }
						DeviceManager.setCurrentDevice(updatedDevice)


						// 跳转前校验 session 有效性
						this.checkSessionValidity(updatedDevice)
					} else {
						// 登录失败
						uni.hideLoading()
						const errorMessage = this.getErrorMessage(loginResult.errorCode)
						uni.showModal({
							title: this.$t('device_list.connection_failed'),
							content: errorMessage,
							showCancel: false
						})
					}
				})
			},

			// 检查session是否有效
			checkSessionValidity(device) {
				// callUbus 按 current_device 取上下文(进入设备前 onCardClickHandle 已 setCurrentDevice(device));硬超时兜底覆盖安卓概率性失败
				UciRpc.callUbus('system', 'board', {}, 3000)
				.then(() => {
					uni.hideLoading()
					uni.showToast({ title: this.$t('device_list.connection_success'), icon: 'success', duration: 1000 })
					setTimeout(() => { uni.reLaunch({ url: '/pages/device/home' }) }, 500)
				})
				.catch(() => {
					// 会话失效/超时/网络失败(等价原 success.else + fail)一律走 reLogin
					this.reLoginDevice(device)
				})
			},

		reLoginDevice(device) {
				const deviceWithoutSession = { ...device, sysauth: null }
				DeviceManager.loginDevice(deviceWithoutSession, (loginResult) => {
					if (loginResult.success) {

						const updatedDevice = { ...device, sysauth: loginResult.sysauth, online: true }
						DeviceManager.setCurrentDevice(updatedDevice)

						uni.hideLoading()
						uni.showToast({
							title: this.$t('device_list.login_success'),
							icon: 'success',
							duration: 1000
						})


						setTimeout(() => {
							uni.reLaunch({
								url: '/pages/device/home'
							})
						}, 500)
					} else {
						uni.hideLoading()
						const errorMessage = this.getErrorMessage(loginResult.errorCode)
						uni.showModal({
							title: this.$t('device_list.login_failed'),
							content: errorMessage,
							showCancel: false
						})
					}
				})
			},

			// 显示菜单
			showMenu() {
				this.$refs.menuPopup.open()
			},


			navigateToSettings() {
				uni.navigateTo({
					url: '/pages/language/index'
				})
				this.$refs.menuPopup.close()
			},

			// 显示设备操作菜单
			showDeviceMenu(device) {
				this.currentDevice = device
				this.$refs.deviceMenuPopup.open()
			},

			// 从菜单编辑设备
			editDeviceFromMenu() {
				this.$refs.deviceMenuPopup.close()
				this.editDevice(this.currentDevice)
			},

			// 从菜单删除设备
			deleteDeviceFromMenu() {
				this.$refs.deviceMenuPopup.close()
				this.deleteDevice(this.currentDevice.id)
			},

			// 格式化设备地址：仅显示 IP，超过 36 字符按 首19...尾14 截断
			formatDeviceAddress(device) {
				const ip = device && device.ip ? String(device.ip).trim() : ''
				if (!ip) return '-'
				if (ip.length <= 36) return ip
				return ip.substring(0, 19) + '...' + ip.substring(ip.length - 14)
			}
		}
	}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10rpx;
}

.header-actions {
	display: flex;
	gap: 20rpx;
}

.menu-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	height: 88rpx;
}

.add-btn {
	background-color: transparent;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	height: 88rpx;
}

.add-icon {
	width: 55rpx;
	height: 55rpx;
}

/* 设备卡片样式（页面特有）*/
.device-card {
	background: $oa-surface;
	border-radius: $oa-radius-lg;
	margin-bottom: 20rpx;
	padding: 30rpx 20rpx;
	box-shadow: $oa-shadow-md;
	min-height: 120rpx;
	position: relative;
}

.card-content {
	display: flex;
	align-items: center;
}

.device-icon {
	width: 100rpx;
	height: 100rpx;
	margin-right: 25rpx;
	flex-shrink: 0;
}

.device-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.device-name {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
	margin-bottom: 15rpx;
	line-height: 1.3;
}

.device-address {
	font-size: 28rpx;
	color: $oa-text-muted;
	line-height: 1.3;
}

.more-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	height: 88rpx;
	margin-left: 10rpx;
	flex-shrink: 0;
}

.more-icon {
	width: 40rpx;
	height: 40rpx;
}

/* 首跑空态：引导式欢迎（onboard）—— 图标 + 标题 + 价值 + CTA + 提示 */
.empty-title {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
	margin-top: $oa-sp-2;
}
.empty-value {
	font-size: $oa-fs-body;
	color: $oa-text-muted;
	line-height: 1.5;
	text-align: center;
	margin-top: $oa-sp-2;
	max-width: 560rpx;
}
.empty-cta {
	margin-top: $oa-sp-3;
}
.empty-hint {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
	margin-top: $oa-sp-2;
}

.popup-content {
	width: 600rpx;
}

.popup-header {
	text-align: center;
	margin-bottom: 10rpx;
}

.popup-title {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
}

.form-content {
	margin-bottom: 25rpx;
}

.form-item {
	margin-bottom: 20rpx;
}

.label {
	display: block;
	font-size: 26rpx;
	color: $oa-text;
	margin-bottom: 8rpx;
}

/* 菜单弹窗样式 */
.menu-content {
	background-color: $oa-surface;
	border-radius: $oa-radius-lg;
	padding: 20rpx;
	margin-top: calc(var(--status-bar-height) + 88rpx);
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 15rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-item-text {
	flex: 1;
	font-size: 28rpx;
	color: $oa-text;
}

/* 设备操作菜单样式 */
.device-menu-content {
	background-color: $oa-surface;
	border-radius: $oa-radius-lg $oa-radius-lg 0 0;
	padding: 5rpx;
}

.device-menu-content .menu-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}

.device-menu-content .menu-item:last-child {
	border-bottom: none;
}

.device-menu-content .menu-item-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 20rpx;
}

.device-menu-content .menu-item-text {
	flex: 1;
	font-size: 32rpx;
	color: $oa-text;
}

.device-menu-content .delete-item .menu-item-text {
	color: $oa-text;
	font-weight: 600;
}
</style>
