<template>
	<uni-popup ref="popup" type="center" :mask-click="false">
		<view class="uci-dialog">
			<view class="uci-dialog__header">
				<text class="uci-dialog__title">{{ dialogTitle }}</text>
			</view>
			<scroll-view scroll-y class="uci-dialog__body">
				<view v-for="grp in groupedSchema" :key="grp.name" class="uci-group">
					<text v-if="grp.label" class="uci-group__label">{{ grp.label }}</text>
					<view v-for="f in grp.fields" :key="f.key" class="uci-field">
						<view v-if="f.type === 'switch'" class="uci-field__row">
							<text class="uci-field__label">{{ f.label }}</text>
							<oa-switch :value="fieldBool(f)" @input="onSwitch(f, $event)" />
						</view>
						<block v-else>
							<text class="uci-field__label">{{ f.label }}<text v-if="f.required" class="uci-field__req">*</text></text>
							<view v-if="f.type === 'text'" class="uci-field__combo">
								<input class="uci-field__input" v-model="formData[f.key]" :placeholder="f.placeholder || ''" />
								<picker v-if="(f.candidates || f.options) && fieldOptions(f).length" mode="selector" :range="fieldOptions(f)" range-key="label" :value="fieldOptionIndex(f)" @change="onPick(f, $event)">
									<text class="uci-field__combo-btn">▾</text>
								</picker>
							</view>
							<input v-else-if="f.type === 'password'" class="uci-field__input" v-model="formData[f.key]" password :placeholder="f.placeholder || ''" />
							<picker v-else-if="f.type === 'select' || f.type === 'deviceSelect'" mode="selector" :range="fieldOptions(f)" range-key="label" :value="fieldOptionIndex(f)" @change="onPick(f, $event)">
								<view class="uci-field__select">
									<text :class="['uci-field__select-text', { 'is-placeholder': !formData[f.key] }]">{{ fieldOptionLabel(f) || (f.placeholder || $t('common.please_select')) }}</text>
									<text class="uci-field__select-arrow">›</text>
								</view>
							</picker>
							<view v-else-if="f.type === 'dynamicList'" class="uci-field__dyn">
								<view v-if="dynList(f).length" class="dyn-tags">
									<view v-for="(tag, i) in dynList(f)" :key="i" class="dyn-tag">
										<text class="dyn-tag__text">{{ tag }}</text>
										<text class="dyn-tag__del" @click="removeDyn(f, i)">×</text>
									</view>
								</view>
								<input class="uci-field__input" v-model="dynInput[f.key]" :placeholder="f.placeholder || $t('common.add')" @confirm="addDyn(f)" />
							</view>
							<view v-else-if="f.type === 'multiSelect'" class="uci-field__multi">
								<view class="multi-tags">
									<view v-for="opt in fieldOptions(f)" :key="opt.value" :class="['multi-tag', { 'multi-tag--on': multiSelected(f, opt.value) }]" @click="toggleMulti(f, opt.value)">
										<text>{{ opt.label }}</text>
									</view>
								</view>
							</view>
						</block>
					</view>
				</view>
			</scroll-view>
			<view class="uci-dialog__actions">
				<oa-button v-if="isEdit && allowDelete" type="negative" block :loading="deleting" :disabled="saving" @click="onRemove">{{ $t('common.delete') }}</oa-button>
				<oa-button type="neutral" block :disabled="saving || deleting" @click="close">{{ $t('common.cancel') }}</oa-button>
				<oa-button type="primary" block :loading="saving" :disabled="deleting" @click="onSave">{{ $t('common.save') }}</oa-button>
			</view>
		</view>
	</uni-popup>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'

// UCI section 编辑弹窗：schema 驱动表单（text/password/switch[反逻辑]/select/deviceSelect/dynamicList）
// + save/delete（uci set/add/delete + commit + apply）。列表由调用方渲染，ref 调 openCreate/openEdit。
export default {
	name: 'oa-uci-list',
	props: {
		config: { type: String, required: true },
		sectionType: { type: String, default: '' },
		schema: { type: Array, default: () => [] },
		initScript: { type: String, default: '' },
		candidates: { type: Object, default: () => ({}) },
		createTitle: { type: String, default: '' },
		editTitle: { type: String, default: '' },
		allowDelete: { type: Boolean, default: true }
	},
	data() {
		return {
			isEdit: false,
			editingName: '',
			formData: {},
			dynInput: {},
			saving: false,
			deleting: false
		}
	},
	computed: {
		dialogTitle() {
			return this.isEdit ? (this.editTitle || this.$t('common.edit')) : (this.createTitle || this.$t('common.add'))
		},
		// 按 group 聚合字段（保持声明顺序）；depends 联动：依赖字段值不匹配时隐藏
		groupedSchema() {
			const groups = []
			const idx = {}
			this.schema.forEach(f => {
				if (!this.fieldDependsMet(f)) return
				const g = f.group || ''
				if (idx[g] === undefined) {
					idx[g] = groups.length
					groups.push({ name: g, label: f.groupLabel || g, fields: [] })
				}
				groups[idx[g]].fields.push(f)
			})
			return groups
		}
	},
	methods: {
		openCreate() {
			this.isEdit = false
			this.editingName = ''
			this.formData = this._defaults()
			this._preselectOptions()
			this.dynInput = this._dynDefaults()
			this.$refs.popup.open()
		},
		// select/deviceSelect 无值时预设首候选（避免 picker 选中首项不触发 change 的死锁）
		_preselectOptions() {
			this.schema.forEach(f => {
				if ((f.type === 'select' || f.type === 'deviceSelect') && !this.formData[f.key]) {
					const opts = this.fieldOptions(f)
					if (opts.length) this.$set(this.formData, f.key, opts[0].value)
				}
			})
		},
		openEdit(section) {
			this.isEdit = true
			this.editingName = section['.name']
			const data = this._defaults()
			this.schema.forEach(f => {
				const raw = section[f.key]
				if (f.type === 'dynamicList') {
					data[f.key] = Array.isArray(raw) ? [...raw] : (raw ? [raw] : [])
				} else if (f.type === 'multiSelect') {
					data[f.key] = Array.isArray(raw) ? raw.map(String).filter(Boolean).join(' ') : (raw !== undefined && raw !== null && raw !== '' ? String(raw) : data[f.key])
				} else if (raw !== undefined && raw !== null && raw !== '') {
					data[f.key] = String(raw)
				}
			})
			this.formData = data
			this.dynInput = this._dynDefaults()
			this.$refs.popup.open()
		},
		_defaults() {
			const data = {}
			this.schema.forEach(f => {
				if (f.type === 'dynamicList') data[f.key] = []
				else if (f.type === 'multiSelect') data[f.key] = Array.isArray(f.default) ? f.default.map(String).filter(Boolean).join(' ') : (f.default !== undefined ? String(f.default) : '')
				else if (f.type === 'switch') data[f.key] = f.default !== undefined ? String(f.default) : this._switchVals(f).off
				else data[f.key] = f.default !== undefined ? String(f.default) : ''
			})
			return data
		},
		_dynDefaults() {
			const dyn = {}
			this.schema.forEach(f => { if (f.type === 'dynamicList') dyn[f.key] = '' })
			return dyn
		},
		close() {
			if (this.saving || this.deleting) return
			this.$refs.popup.close()
		},
		// depends 联动判定：依赖字段值匹配才满足（UI 显隐 + 校验/提交跳过共用）；value 支持数组(多值任一)
		// 依赖字段若为 multiSelect（空格分隔串），按集合交集判定（如 proto='tcp udp' depends [tcp,udp]）
		fieldDependsMet(f) {
			if (!f.depends) return true
			const cur = String(this.formData[f.depends.key] || '')
			const val = f.depends.value
			const arr = Array.isArray(val) ? val.map(String) : [String(val)]
			const depF = this.schema.find(x => x.key === f.depends.key)
			if (depF && depF.type === 'multiSelect') {
				const curSet = cur.split(/\s+/).filter(Boolean)
				return arr.some(v => curSet.includes(v))
			}
			return arr.includes(cur)
		},
		// switch 取值映射：onValue/offValue 优先（samba4 yes/no），invert 兼容（arpbind 反逻辑）
		_switchVals(f) {
			if (f.onValue !== undefined) return { on: String(f.onValue), off: String(f.offValue !== undefined ? f.offValue : '0') }
			if (f.invert) return { on: '0', off: '1' }
			return { on: '1', off: '0' }
		},
		fieldBool(f) {
			return String(this.formData[f.key]) === this._switchVals(f).on
		},
		onSwitch(f, on) {
			const v = this._switchVals(f)
			this.$set(this.formData, f.key, on ? v.on : v.off)
		},
		fieldOptions(f) {
			if (f.options) return f.options
			if (f.candidates === 'hosthints-ip') return this.candidates.hosthintsIp || []
			if (f.candidates === 'hosthints-mac') return this.candidates.hosthintsMac || []
			if (f.candidates === 'devices' || f.type === 'deviceSelect') return this.candidates.devices || []
			if (f.candidates === 'interfaces') return this.candidates.interfaces || []
			if (f.candidates === 'zones') return this.candidates.zones || []
			if (f.candidates === 'helpers') return this.candidates.helpers || []
			if (f.candidates === 'printers') return this.candidates.printers || []
			return []
		},
		fieldOptionIndex(f) {
			const i = this.fieldOptions(f).findIndex(o => o.value === this.formData[f.key])
			return i >= 0 ? i : -1
		},
		fieldOptionLabel(f) {
			const o = this.fieldOptions(f).find(o => o.value === this.formData[f.key])
			return o ? o.label : ''
		},
		onPick(f, e) {
			const v = this.fieldOptions(f)[e.detail.value]
			if (v) this.$set(this.formData, f.key, v.value)
		},
		dynList(f) {
			return Array.isArray(this.formData[f.key]) ? this.formData[f.key] : []
		},
		addDyn(f) {
			const v = (this.dynInput[f.key] || '').trim()
			if (!v) return
			if (!Array.isArray(this.formData[f.key])) this.$set(this.formData, f.key, [])
			this.formData[f.key].push(v)
			this.dynInput[f.key] = ''
		},
		removeDyn(f, i) {
			if (Array.isArray(this.formData[f.key])) this.formData[f.key].splice(i, 1)
		},
		// multiSelect（空格分隔字符串存储，如 samba4 interface）
		multiSelected(f, val) {
			return String(this.formData[f.key] || '').split(/\s+/).filter(Boolean).includes(String(val))
		},
		toggleMulti(f, val) {
			const arr = String(this.formData[f.key] || '').split(/\s+/).filter(Boolean)
			const i = arr.indexOf(String(val))
			if (i >= 0) arr.splice(i, 1)
			else arr.push(String(val))
			this.$set(this.formData, f.key, arr.join(' '))
		},
		async onSave() {
			for (const f of this.schema) {
				if (!this.fieldDependsMet(f)) continue  // depends 未满足的字段跳过校验（UI 隐藏，用户无法修正）
				if (f.required) {
					const v = this.formData[f.key]
					const empty = f.type === 'dynamicList' ? !v || !v.length : (v === '' || v === undefined || v === null)
					if (empty) {
						uni.showToast({ title: `${f.label} ${this.$t('common.required')}`, icon: 'none' })
						return
					}
				}
				// 字段格式校验（schema.validate.pattern；dynamicList 逐元素校验）
				if (f.validate && f.validate.pattern) {
					const re = new RegExp(f.validate.pattern)
					const val = this.formData[f.key]
					const arr = f.type === 'dynamicList' ? (Array.isArray(val) ? val : []) : [val]
					for (const item of arr) {
						if (item !== '' && item !== undefined && item !== null && !re.test(String(item))) {
							uni.showToast({ title: f.validate.message || `${f.label} ${this.$t('common.invalid')}`, icon: 'none' })
							return
						}
					}
				}
			}
			this.saving = true
			try {
				const values = {}
				this.schema.forEach(f => {
					if (!this.fieldDependsMet(f)) return  // depends 未满足不提交（保留 uci 原值，匹配 luci 不写隐藏字段；副作用：如 WiFi key 在 encryption=none 时旧值残留，驱动层忽略，无功能影响）
					const v = this.formData[f.key]
					if (f.type === 'dynamicList') values[f.key] = Array.isArray(v) ? v : []
					else if (f.type === 'multiSelect' && f.uciList) values[f.key] = String(v || '').split(/\s+/).filter(Boolean)
					else values[f.key] = (v === undefined || v === null) ? '' : String(v)
				})
				let name
				if (this.isEdit) {
					await UciRpc.setCommit(this.config, this.editingName, values)
					name = this.editingName
				} else {
					name = await UciRpc.addCommit(this.config, this.sectionType, values)
				}
				if (this.initScript) {
					try { await UciRpc.apply(this.initScript) } catch (e) { /* apply 失败不阻断，调用方按需二次探测 */ }
				}
				this.$refs.popup.close()
				uni.showToast({ title: this.$t('common.save_success'), icon: 'success' })
				this.$emit('saved', { name, values, isCreate: !this.isEdit })
			} catch (e) {
				uni.showToast({ title: this.$t('common.save_failed'), icon: 'none' })
			} finally {
				this.saving = false
			}
		},
		async onRemove() {
			this.deleting = true
			try {
				await UciRpc.deleteCommit(this.config, this.editingName)
				if (this.initScript) {
					try { await UciRpc.apply(this.initScript) } catch (e) { /* 同上 */ }
				}
				this.$refs.popup.close()
				uni.showToast({ title: this.$t('common.delete_success'), icon: 'success' })
				this.$emit('deleted', { name: this.editingName })
			} catch (e) {
				uni.showToast({ title: this.$t('common.delete_failed'), icon: 'none' })
			} finally {
				this.deleting = false
			}
		}
	}
}
</script>

<style scoped lang="scss">
.uci-dialog {
	width: 640rpx;
	max-height: 80vh;
	background: $oa-surface;
	border-radius: $oa-radius-2xl;
	padding: $oa-sp-3;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}
.uci-dialog__header {
	text-align: center;
	margin-bottom: $oa-sp-2;
}
.uci-dialog__title {
	font-size: $oa-fs-title;
	font-weight: 600;
	color: $oa-text;
}
.uci-dialog__body {
	max-height: 56vh;
}
.uci-group {
	margin-bottom: $oa-sp-1;
}
.uci-group__label {
	display: block;
	font-size: $oa-fs-caption;
	color: $oa-text-muted;
	margin: $oa-sp-2 0 $oa-sp-1;
	font-weight: 600;
}
.uci-field {
	margin-bottom: $oa-sp-2;
}
.uci-field__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.uci-field__label {
	font-size: $oa-fs-label;
	color: $oa-text;
	margin-bottom: 8rpx;
	display: block;
}
.uci-field__req {
	color: $oa-danger;
	margin-left: 4rpx;
}
.uci-field__combo {
	display: flex;
	align-items: center;
	gap: 8rpx;
}
.uci-field__combo-btn {
	flex-shrink: 0;
	color: $oa-text-subtle;
	font-size: $oa-fs-body;
	padding: $oa-sp-2;
}
.uci-field__input {
	flex: 1;
	width: 100%;
	box-sizing: border-box;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	padding: $oa-sp-2;
	font-size: $oa-fs-body;
	color: $oa-text;
}
.uci-field__select {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-md;
	padding: $oa-sp-2;
}
.uci-field__select-text {
	flex: 1;
	min-width: 0;
	font-size: $oa-fs-body;
	color: $oa-text;
}
.uci-field__select-text.is-placeholder {
	color: $oa-text-subtle;
}
.uci-field__select-arrow {
	margin-left: $oa-sp-1;
	color: $oa-text-subtle;
	font-size: $oa-fs-body;
}
.dyn-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-bottom: 8rpx;
}
.dyn-tag {
	background: $oa-brand-subtle;
	color: $oa-brand;
	border-radius: $oa-radius-full;
	padding: 4rpx $oa-sp-2;
	font-size: $oa-fs-caption;
	display: inline-flex;
	align-items: center;
}
.dyn-tag__del {
	margin-left: 8rpx;
	font-size: $oa-fs-body;
}
.multi-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}
.multi-tag {
	background: $oa-surface-sunken;
	color: $oa-text-muted;
	border-radius: $oa-radius-md;
	padding: $oa-sp-1 $oa-sp-2;
	font-size: $oa-fs-caption;
}
.multi-tag--on {
	background: $oa-brand-subtle;
	color: $oa-brand;
}
.uci-dialog__actions {
	display: flex;
	gap: $oa-sp-2;
	margin-top: $oa-sp-3;
}
</style>
