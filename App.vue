<script>
	import DeviceManager from '@/utils/device-manager.js'

	export default {
		onLaunch: function() {
			this.initI18n()
			this.initRequestInterceptor()
			DeviceManager.prefetchDns()
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
@font-face {
  font-family: 'FA';
  src: url('/static/fonts/fa-solid-900.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
}
.fa {
  font-family: 'FA';
  font-weight: 900;
  -webkit-font-smoothing: antialiased;
  display: inline-block;
}
.fa-route::before { content: '\f6d7'; }
.fa-microchip::before { content: '\f2db'; }
.fa-power-off::before { content: '\f011'; }
.fa-wave-square::before { content: '\f83e'; }
.fa-file-lines::before { content: '\f15c'; }
.fa-link::before { content: '\f0c1'; }
.fa-rotate-right::before { content: '\f2f9'; }
.fa-thumbtack::before { content: '\f08d'; }
.fa-shield-halved::before { content: '\f3ed'; }
.fa-share-nodes::before { content: '\f1e0'; }
.fa-hard-drive::before { content: '\f0a0'; }
.fa-print::before { content: '\f02f'; }
.fa-clock::before { content: '\f017'; }
</style>
