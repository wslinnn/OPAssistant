<template>
	<view class="lime-echart" :id="cid">
		<view class="lime-echart__dom" :id="cid + '_dom'"></view>
	</view>
</template>

<script>
	// lime-echart 还原（H5 功能版）
	// 官方 lime-echart 是 DCloud 插件（app-plus 走 renderjs + canvas/webview，复杂）。
	// 本组件提供 H5 可用的 echarts 入口：mounted 时 emit('finished') 通知父组件，
	// 父组件调用 init(echarts) 拿到 echarts 实例后 setOption/dispose，覆盖 home/statistics 全部用法。
	// app-plus/小程序下返回兼容空实例（不渲染但不报错）；如需原生渲染，
	// 请通过 HBuilderX 插件市场安装官方 lime-echart 覆盖本文件（API 一致）。
	let _uid = 0
	export default {
		name: 'lime-echart',
		props: {
			customStyle: {
				type: Object,
				default: () => ({})
			},
			isDisableScroll: {
				type: Boolean,
				default: false
			},
			isClickable: {
				type: Boolean,
				default: true
			},
			enableHover: {
				type: Boolean,
				default: false
			},
			beforeDelay: {
				type: Number,
				default: 0
			},
			landscape: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				cid: 'lime_echart_' + (++_uid)
			}
		},
		mounted() {
			// DOM 就绪后通知父组件可以初始化图表（对应 @finished）
			const fire = () => this.$emit('finished')
			if (this.beforeDelay > 0) {
				setTimeout(fire, this.beforeDelay)
			} else {
				this.$nextTick(fire)
			}
		},
		beforeDestroy() {
			if (this._chart && this._chart.dispose) {
				this._chart.dispose()
			}
			this._chart = null
		},
		methods: {
			init(echarts, theme, opts) {
				return new Promise((resolve) => {
					const startup = () => {
						this.$nextTick(() => {
							let chart = null
							// #ifdef H5
							const dom = document.getElementById(this.cid + '_dom')
							if (dom && echarts && typeof echarts.init === 'function') {
								chart = echarts.init(dom, theme || null, opts || {})
							}
							// #endif
							// #ifndef H5
							// 非 H5：返回兼容实例，避免调用方报错（图表不渲染）
							chart = {
								setOption() {},
								resize() {},
								dispose() {},
								getOption() { return {} },
								on() {},
								off() {}
							}
							// #endif
							this._chart = chart
							resolve(chart)
						})
					}
					if (this.beforeDelay > 0) {
						setTimeout(startup, this.beforeDelay)
					} else {
						startup()
					}
				})
			},
			setChart(chart) {
				this._chart = chart
			},
			resize() {
				if (this._chart && this._chart.resize) {
					this._chart.resize()
				}
			}
		}
	}
</script>

<style scoped>
	.lime-echart {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.lime-echart__dom {
		width: 100%;
		height: 100%;
	}
</style>
