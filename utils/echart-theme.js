/**
 * ECharts 统一色板
 * 消除 home/statistics 同语义不同色（如出站带宽 home=#00c4cc / statistics=#00f2fe）
 * 与 $oa-brand（#0E84B5）协调。home.vue / statistics.vue 共用。
 */
export const OA_ECHART = {
	// 品牌
	brand: '#0E84B5',
	brandHover: '#0A6E97',

	// 带宽（入站沿用原 #4facfe，出站统一为 #00C4CC）
	inband: '#4facfe',
	outband: '#00C4CC',

	// 负载 1/5/15min（三色区分）
	load1: '#ff6b6b',
	load5: '#4ecdc4',
	load15: '#45b7d1',

	// 坐标轴 / 网格（对齐 token：text-subtle / hairline）
	axisLabel: '#9CA3AF',
	axisLine: '#E5E7EB',
	splitLine: '#F0F0F0',

	// 环形图（主色 = brand，底色 = surface-sunken）
	ringMain: '#0E84B5',
	ringBg: '#F1F2F5',

	// tooltip
	tooltipBorder: '#4facfe'
}
