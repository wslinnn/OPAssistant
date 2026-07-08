<template>
	<view class="container">
		<view class="header">
			<view class="menu-btn" @click="showMenu">
				<image class="menu-icon" src="/static/menu.png" mode="widthFix" style="width: 50rpx; height: 50rpx;" />
			</view>
			<view class="header-actions">
				<view class="add-btn" @click="addDevice">
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
			<oa-empty v-if="deviceList.length === 0" :text="$t('device_list.empty_message')" />
			<view v-else :key="index" v-for="(item, index) in deviceList">
				<view class="device-card" @click="onCardClickHandle(item)">
					<view class="card-content">
						<image class="device-icon" src="/static/openwrt.png" mode="widthFix" />
						<view class="device-info">
							<oa-copy-text class="device-name" :text="item.name">{{item.name}}</oa-copy-text>
							<oa-copy-text class="device-address" :text="item.ip">{{formatDeviceAddress(item)}}</oa-copy-text>
						</view>
						<view class="more-btn" @click.stop="showDeviceMenu(item)">
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
						<oa-segmented :options="protocolOptions" v-model="deviceForm.useHttps" equal />
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
				const deviceList = DeviceManager.getDeviceList()
				if (deviceList.length === 0) {

					DeviceManager.initTestData()
					this.deviceList = DeviceManager.getDeviceList()
				} else {
					this.deviceList = deviceList
				}
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
				// 长度限制：不超过64个字符
				if (!host || host.length === 0 || host.length > 64) {
					return false
				}

				// 允许的字符：字母、数字、点号、冒号、连字符
				// 这些字符涵盖了IPv4、IPv6和域名的所有有效字符
				const allowedCharsRegex = /^[a-zA-Z0-9.:-]+$/
				return allowedCharsRegex.test(host)
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


			formatTime(timeString) {
				if (!timeString) return ''
				const date = new Date(timeString)
				// 根据当前语言设置时间格式
				const locale = this.$i18n.locale
				return date.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')
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
				const protocol = device.useHttps ? 'https' : 'http'
				const formattedHost = DeviceManager.formatHostForUrl(device.ip)
				const url = `${protocol}://${formattedHost}:${device.port}/ubus`
				console.log("checkSessionValidity url:", url)
				uni.request({
					method: "POST",
					url: url,
					data: {
						jsonrpc: "2.0",
						id: 1,
						method: "call",
						params: [device.sysauth, "system", "board", {}]
					},
					header: {
						'Content-Type': 'application/json',
						'x-uniauth': 'true'
					},
					timeout: 3000,
					success: (res) => {
						console.log("checkSessionValidity session检查响应:", JSON.stringify(res))


						if (res.statusCode === 200 && res.data && res.data.result && res.data.result[0] === 0) {

							uni.hideLoading()
							uni.showToast({
								title: this.$t('device_list.connection_success'),
								icon: 'success',
								duration: 1000
							})


							setTimeout(() => {
								uni.reLaunch({
									url: '/pages/device/home'
								})
							}, 500)
							console.log("session valid, jump to home page")

						} else {
							this.reLoginDevice(device)
						}
					},
					fail: (err) => {
						console.log("checkSessionValidity fail:", err)
						// 安卓出现该接口概率性失败，但是reLogin ok，所以去掉提示
						// 直接调用reLoginDevice，让reLoginDevice方法处理loading的隐藏
						this.reLoginDevice(device)
					}
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
	padding: 10rpx;
}

.menu-icon {
	font-size: 40rpx;
}

.add-btn {
	background-color: transparent;
	border: none;
	padding: 10rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60rpx;
	height: 60rpx;
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
	border: 1rpx solid $oa-hairline;
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
	font-size: 34rpx;
	font-weight: bold;
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
	padding: 10rpx;
	margin-left: 10rpx;
	flex-shrink: 0;
}

.more-icon {
	width: 40rpx;
	height: 40rpx;
}

.popup-content {
	width: 600rpx;
}

.popup-header {
	text-align: center;
	margin-bottom: 10rpx;
}

.popup-title {
	font-size: 30rpx;
	font-weight: bold;
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

.menu-item-icon {
	font-size: 36rpx;
	margin-right: 15rpx;
	color: $oa-brand;
}

.menu-item-text {
	flex: 1;
	font-size: 28rpx;
	color: $oa-text;
}

.menu-item-arrow {
	font-size: 30rpx;
	color: $oa-text-subtle;
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
	color: $oa-danger;
}
</style>
