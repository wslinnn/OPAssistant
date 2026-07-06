<script>
	export default {
		onLaunch: function() {
			this.initI18n()
			this.initRequestInterceptor()
		},
		onShow: function() {

		},
		onPageNotFound: function() {

		},
		onHide: function() {

		},

		methods: {


			initI18n() {

				const savedLocale = uni.getStorageSync('locale')
				if (savedLocale) {

					uni.setStorageSync('locale', savedLocale)
				}
			},

			// 注册全局请求拦截器：x-uniauth 标记的请求自动关闭 SSL 校验（支持 HTTPS 自签证书）
			initRequestInterceptor() {
				uni.addInterceptor('request', {
					invoke(args) {
						if (args.header && args.header['x-uniauth'] === 'true') {
							args.sslVerify = false
						}
						return args
					}
				})
			}

		}
	}
</script>

<style>
</style>
