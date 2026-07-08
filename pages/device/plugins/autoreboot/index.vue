<template>
	<view class="container">
		<oa-loading v-if="loading" overlay />

		<view v-else>
			<view class="page-actions">
				<text class="page-hint">{{ $t('autoreboot.desc') }}</text>
				<oa-button type="positive" size="small" @click="add">{{ $t('autoreboot.add_schedule') }}</oa-button>
			</view>

			<oa-empty v-if="sections.length === 0" :text="$t('autoreboot.empty')" />

			<oa-card v-for="s in sections" :key="s['.name']" padding="lg">
				<view class="sched">
					<view class="sched__main" @click="edit(s)">
						<view class="sched__row">
							<text class="sched__time">{{ scheduleText(s) }}</text>
							<oa-status-badge v-if="s.enabled === '1'" type="up" :text="$t('common.enabled')" />
							<oa-status-badge v-else type="neutral" :text="$t('common.disabled')" />
						</view>
						<text class="sched__sub">{{ scheduleSub(s) }}</text>
					</view>
					<view class="sched__switch" @click.stop="">
						<oa-switch :value="s.enabled === '1'" @input="onToggle(s, $event)" />
					</view>
				</view>
			</oa-card>
		</view>

		<oa-uci-list
			ref="editor"
			config="autoreboot"
			section-type="schedule"
			:schema="schema"
			init-script="autoreboot"
			:create-title="$t('autoreboot.add_schedule')"
			:edit-title="$t('autoreboot.edit_schedule')"
			@saved="load"
			@deleted="load"
		/>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

export default {
	data() {
		return {
			loading: false,
			sections: []
		}
	},
	computed: {
		weekOptions() {
			return [
				{ value: '*', label: this.$t('autoreboot.every_day') },
				{ value: '1', label: this.$t('autoreboot.mon') },
				{ value: '2', label: this.$t('autoreboot.tue') },
				{ value: '3', label: this.$t('autoreboot.wed') },
				{ value: '4', label: this.$t('autoreboot.thu') },
				{ value: '5', label: this.$t('autoreboot.fri') },
				{ value: '6', label: this.$t('autoreboot.sat') },
				{ value: '0', label: this.$t('autoreboot.sun') }
			]
		},
		monthOptions() {
			const arr = [{ value: '*', label: this.$t('autoreboot.every_month') }]
			for (let i = 1; i <= 12; i++) arr.push({ value: String(i), label: String(i) })
			return arr
		},
		schema() {
			return [
				{ key: 'enabled', label: this.$t('autoreboot.enable'), type: 'switch', default: '0' },
				{ key: 'week', label: this.$t('autoreboot.week'), type: 'text', options: this.weekOptions, default: '*', required: true, placeholder: '* 或 1-6' },
				{ key: 'hour', label: this.$t('autoreboot.hour'), type: 'text', default: '2', required: true, placeholder: '0-23' },
				{ key: 'minute', label: this.$t('autoreboot.minute'), type: 'text', default: '0', required: true, placeholder: '0-59' },
				{ key: 'month', label: this.$t('autoreboot.month'), type: 'text', options: this.monthOptions, default: '*', required: true, placeholder: '* 或 1-12' },
				{ key: 'day', label: this.$t('autoreboot.day'), type: 'text', default: '*', required: true, placeholder: '* 或 1-31' }
			]
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('autoreboot.title') })
		this.load()
	},
	methods: {
		async load() {
			this.loading = this.sections.length === 0
			try {
				const data = await UciRpc.get('autoreboot')
				const list = []
				Object.keys(data || {}).forEach(name => {
					const s = data[name]
					if (s && s['.type'] === 'schedule') list.push({ ...s, '.name': name })
				})
				this.sections = list
			} catch (e) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		weekLabel(v) {
			const o = this.weekOptions.find(o => o.value === v)
			return o ? o.label : v
		},
		scheduleText(s) {
			const h = String(s.hour || '0').padStart(2, '0')
			const m = String(s.minute || '0').padStart(2, '0')
			return `${h}:${m}`
		},
		scheduleSub(s) {
			const parts = []
			parts.push(this.weekLabel(s.week))
			if (s.month && s.month !== '*') parts.push(this.$t('autoreboot.month_label') + s.month)
			if (s.day && s.day !== '*') parts.push(this.$t('autoreboot.day_label') + s.day)
			return parts.join(' · ')
		},
		async onToggle(s, on) {
			const v = on ? '1' : '0'
			try {
				await UciRpc.setCommit('autoreboot', s['.name'], { enabled: v })
				try { await UciRpc.apply('autoreboot') } catch (e) {}
				this.$set(s, 'enabled', v)
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			}
		},
		add() { this.$refs.editor.openCreate() },
		edit(s) { this.$refs.editor.openEdit(s) }
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.page-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $oa-sp-2;
	margin-bottom: $oa-sp-2;
}
.page-hint {
	flex: 1;
	min-width: 0;
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
	line-height: 1.4;
}
.sched {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.sched__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}
.sched__row {
	display: flex;
	align-items: center;
	gap: $oa-sp-2;
}
.sched__time {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
}
.sched__sub {
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
}
.sched__switch {
	flex-shrink: 0;
}
</style>
