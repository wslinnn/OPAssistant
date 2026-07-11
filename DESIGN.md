---
name: OPAssistant
description: OpenWrt 路由器移动管理 App · Aurora 设计系统(沉稳驾驶舱)
colors:
  brand: "#0E84B5"
  brand-hover: "#0A6E97"
  brand-subtle: "#E4ECF3"
  on-brand: "#FFFFFF"
  canvas: "#F3F4F6"
  surface: "#FFFFFF"
  surface-sunken: "#F1F2F5"
  surface-overlay: "#F8F9FB"
  ink: "#1F2937"
  ink-muted: "#6B7280"
  ink-subtle: "#9CA3AF"
  info: "#1F5596"
  info-surface: "#E1E8F5"
  success: "#15803D"
  success-surface: "#DFEDE4"
  warning: "#B45309"
  warning-surface: "#F3EBDA"
  danger: "#DC2626"
  danger-surface: "#FDECEC"
typography:
  h1:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  "2xl": "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
    typography: "{typography.body}"
  button-positive:
    backgroundColor: "{colors.brand-subtle}"
    textColor: "{colors.brand}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  button-negative:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  button-neutral:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input-field:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
  badge-info:
    backgroundColor: "{colors.brand-subtle}"
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
  switch-on:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.full}"
    height: "26px"
    width: "44px"
---

# Design System: OPAssistant

## 1. Overview

**Creative North Star: "The Steady Cockpit / 稳重驾驶舱"**

这套系统的气质是一架仪表清晰的驾驶舱:信息密度可以高,但永远有序;每个状态、每个读数都摆在它该在的位置;操作可信赖,绝不靠花哨争抢注意力。用户是技术型玩家,常常跨网远程操作路由器——他们要的是"一眼读懂、敢放手下手",所以界面必须沉得住气,把事实和风险说清楚,然后退到一边。

它是 **product** register:设计服务于任务,不自我表达。颜色策略是 **Restrained**——一个 Aurora 青蓝主色贯穿全站,占比任何单屏 ≤10%,靠 `surface` / `surface-sunken` / `surface-overlay` 三层中性面的色调差表达层级,而不是靠阴影堆砌或色块切分。字体只用一支系统无衬线(uni-app 默认栈),靠 5 档紧凑字号(11/13/14/16/20px,比例 ~1.1–1.25)建立层级,不引入展示字体。圆角阶梯从 4px 到 16px,控件统一 12px、卡片 8px、弹窗 16px,胶囊用于开关与徽标。

它明确拒绝三件事(引自 PRODUCT.md 反参考):**花哨 / 过度装饰**(渐变文字、滥用毛玻璃、大色块 hero、emoji 堆砌)、**luci 网页端的拥挤表格感**(密集表单、小字、低对比、字段堆叠)、**通用 SaaS 仪表盘模板**(hero-metric 大数字、千篇一律的等高卡片网格、营销味)。luci 能做的事很多,但本系统绝不能看起来像 luci 那面"墙"。

**Key Characteristics:**
- 单一主色、克制占比;语义状态用"软底配方"(`X-surface` 底 + `X` 字),不用饱和实心色块。
- 三层中性面(canvas → surface → sunken/overlay)承担绝大部分层级表达;阴影只在状态切换时出现。
- 一支系统无衬线、五档紧凑字号;正文 14px,行高 1.5,长行可读优先。
- 控件大圆角(12px)、按下微缩(`scale(0.95)`)反馈,触控热区充裕(返回/按钮 ≥44px 等效)。
- 一套组件词汇(`oa-*`)贯穿十个插件页:同一种按钮、同一种开关、同一种徽标、同一种 schema 编辑器。

## 2. Colors

调色是"冷静仪表盘"式:一个青蓝主色定调,中性面偏冷灰,语义色低饱和、一律走软底配方。所有色值定义在 `uni.scss` 的 `$oa-*` 变量里(单一事实来源);此处 hex 为规范值。

### Primary
- **Aurora Teal-Blue** (`#0E84B5`):系统唯一主色。用于主要操作(`button-primary`)、开关开启态、当前选中(分段控件/页签 active 字色)、链接与焦点环。靠向 luci-theme-aurora。**占比任何单屏 ≤10%**——它的克制就是它的分量。
- **Aurora Deep** (`#0A6E97`):主色的按下/加深态(`brand-hover`)。**也是小字号主色文本的推荐色**——`#0E84B5` 在白底上仅 ~4.3:1,用作 ≤14px 非加粗正文文本偏紧;需要小字主色文本时改用本色(~5.4:1)。
- **Aurora Tint** (`#E4ECF3`):主色软底(`brand-subtle`)。选中态背景、`button-positive`、info 徽标底。
- **On-Brand** (`#FFFFFF`):主色底上的前景(按钮字、开关开启态不用,因 thumb 是白)。

### Neutral
- **Canvas** (`#F3F4F6`):页面底色。冷调浅灰,不是暖米/奶白——工具型 App 的清醒底。
- **Surface** (`#FFFFFF`):卡片/控件面,层级高于 canvas。
- **Surface Sunken** (`#F1F2F5`):凹陷面——输入框底、分段控件容器、表头/卡片头、`button-neutral`。比 surface 略沉一档,表达"可填入/可容纳"。
- **Surface Overlay** (`#F8F9FB`):弹层面,介于 surface 与 canvas 之间。
- **Ink** (`#1F2937`):主文本,在白底 ~16:1,绝对可读。
- **Ink Muted** (`#6B7280`):次文本/行标签,白底 ~5.0:1——**这是任何文本颜色的对比度下限**。
- **Ink Subtle** (`#9CA3AF`):**仅用于非文本装饰**——列表行箭头、开关关闭态轨道、禁用态辅助。白底仅 ~2.8:1,**严禁用作正文或占位符文本**(见 Named Rules)。

### Semantic(均成对:实色 + 软底)
- **Info** `#1F5596` / `#E1E8F5`、**Success** `#15803D` / `#DFEDE4`、**Warning** `#B45309` / `#F3EBDA`、**Danger** `#DC2626` / `#FDECEC`。实色用于徽标字色/危险操作按钮字色;软底用于徽标底/`button-negative`。成对使用保证对比度。

### Named Rules
- **The One-Accent Rule.** Aurora 青蓝是全站唯一主色,单屏占比 ≤10%。它只出现在:主要操作、当前选中、开关开启、焦点环、链接。**绝不用作装饰色块、背景填充或大面积 hero。** 它的稀有就是它的权威。
- **The Soft-Fill Rule.** 状态徽标与次级操作一律用"软底配方":语义色软底(`X-surface`)+ 同语义色字(`X`),胶囊圆角。**禁止用饱和实心色块做状态标签**——那是 SaaS 模板的味。危险/破坏性操作才用 `danger` 字色 + `danger-surface` 底。
- **The Ink-Floor Rule.** 任何**文本**(含占位符)对比度下限是 `ink-muted #6B7280`(白底 ~5:1)。`ink-subtle #9CA3AF`(~2.8:1)只许用于非文本装饰(箭头、轨道、分隔感)。需要"弱化文本"时,下限就是 ink-muted,不要再往下沉。

## 3. Typography

**Body Font:** 系统无衬线栈(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)——uni-app 默认,app-plus 与 H5 一致。
**Label/Mono Font:** 无独立字体;数据与标签共用同一系统栈。

**Character:** 一支字族打天下,靠五档紧凑字号与字重(400/500/600)建立层级。不引入展示字体、不引入第二支无衬线——product register 下,工具该消失在任务里,字体的"个性"是负分。字号在 `uni.scss` 以 `rpx` 定义(`22/26/28/32/40rpx`),按 750rpx 设计宽换算即 `11/13/14/16/20px`(2rpx = 1px @375pt)。

### Hierarchy
- **H1** (600, 20px / 40rpx, 1.25):页级标题,极少使用——本系统不喊话。
- **Title** (600, 16px / 32rpx, 1.3):卡片标题、自绘导航栏标题、弹窗标题。层级的主力。
- **Body** (400, 14px / 28rpx, 1.5):正文与控件内文字。长行遵循 65–75ch;列表/数据可更密。
- **Label** (400, 13px / 26rpx, 1.4):`oa-list-row` 的行标签,右对齐值的左侧标题。
- **Caption** (400, 11px / 22rpx, 1.4):弱文本、表头、徽标字、副标题。**caption 不意味着可以降到 ink-subtle——caption 文本仍须 ≥ ink-muted 对比度。**

### Named Rules
- **The One-Family Rule.** 全站一支系统无衬线。**禁止引入第二支无衬线、展示字体或图标字体**——图标用 SVG/图片(见 `static/`)。
- **The Weight-Not-Size Rule.** 强调用字重(500/600)或字色(brand),不用斜体、不用下划线装饰、不用渐变文字。`background-clip: text` + 渐变在本系统是绝对禁止。

## 4. Elevation

**克制分层 · 状态驱动。** 本系统不是扁平派,也不是浮起派——**阴影服务于状态与层级,而非装饰**。常态下,卡片用一档中性 `shadow-md` 轻浮于 canvas,靠 `surface` 与 `canvas` 的色调差就能读出层级;阴影的"加码"只发生在状态变化时:选中/凸起的分段项升到 `shadow-sm`,弹层与 loading 罩升到 `shadow-lg`。绝不堆叠多重阴影、不加彩色发光、不用阴影做装饰光晕。

### Shadow Vocabulary(`uni.scss`,rpx → px)
- **Shadow sm** (`0 1px 4px rgba(0,0,0,0.05)` / `0 2rpx 8rpx`):低位浮起——凸起的分段选中项、页签、开关圆点、列表图标。最克制的"脱离纸面"。
- **Shadow md** (`0 4px 16px rgba(0,0,0,0.10)` / `0 8rpx 32rpx`):**卡片默认**。主力量级,承载绝大部分内容容器。
- **Shadow lg** (`0 8px 24px rgba(0,0,0,0.12)` / `0 16rpx 48rpx`):弹层——loading 罩内盒、弹窗。最高量级,仅用于真正"浮在最上层"的临时面。

### Named Rules
- **The State-Driven Shadow Rule.** 阴影回答"这是什么状态/在哪一层",不回答"怎么更好看"。**禁止为装饰加阴影**:卡片不必 hover 放大浮起、按钮不必悬浮发光、图标不必投影。一个面要换层级,先换 surface 色调,不够再升一档 shadow。
- **The Z-Scale Gap(待补).** 当前**没有语义化 z-index 阶梯**——loading 罩用了孤立的 `z-index: 999`。新增分层界面(下拉、吸顶、modal-backdrop、modal、toast)时,**不要继续写裸 `999`/`9999`**,先建立语义阶梯(如 `--z-dropdown 100 / --z-sticky 200 / --z-overlay 900 / --z-modal 1000`)。现状记录在案,不在此处臆造已存在的阶梯。

## 5. Components

> 组件全部位于 `components/oa-*`,统一用 `$oa-*` token,不硬编码颜色/尺寸。新增界面第一选择是复用下列组件,而不是另造。

### Buttons(`oa-button`)—— 沉稳、明确、低噪
- **Shape:** 控件大圆角(`radius-xl` 12px),`normal` 内边距 `8px 12px`(sp-2 sp-3),`small` 内边距 `4px 8px` + caption 字号。
- **四档 type:** `primary`(brand 实心 + on-brand 字,唯一主操作)、`positive`(brand-subtle 软底 + brand 字,确认类)、`negative`(danger-surface 软底 + danger 字,破坏性)、`neutral`(surface-sunken + ink,取消/次要)。
- **反馈:** 按下 `transform: scale(0.95)`(0.15s ease);`disabled`/`loading` 态 `opacity: 0.4` 并阻断点击;`loading` 显示 currentColor 描边 spinner(0.8s linear)。`block` 撑满、`round` 切胶囊。
- **Hover/Focus:** 移动端无 hover;focus 由全局焦点环(`focus-ring`)承担。**一屏最多一个 primary**——primary 的稀缺即其指向。

### Cards(`oa-card`)—— 层级主力,但别滥用
- **Corner:** `radius-lg` 8px。**Background:** `surface` #FFFFFF。**Shadow:** `shadow-md`(默认浮起)。**Padding:** `lg` 12px(默认)/ `md` 8px / `sm` 4px / `none`。
- **头部:** 可选 `title`(title 字号 600)+ `subtitle`(caption / muted)+ `actions` 右槽;`divider` 在头下加 1rpx hairline。
- **纪律:** 嵌套卡片永远错。卡片是"懒办法"——只有当它真是最佳容器时才用;列表行优先用 `oa-list-row`,不要把每行都包成卡片。

### Inputs / Fields(`oa-uci-list` 字段)—— 凹陷可填
- **Style:** `surface-sunken` 底 + ink 字 + `radius-md` 6px + 固定高 80rpx(40px)。**凹陷而非描边**——用底色差表达"可填入",不用 1px 边框抢视线。
- **Focus:** 全局焦点环 `focus-ring`(brand 60% alpha)。**Error:** toast 提示(schema `validate.pattern` 不符),字段本身不变红边——保持低噪。
- 支持类型:text / password / select / deviceSelect / dynamicList / multiSelect / textarea / switch。**禁止新造表单控件**——新增字段类型扩展 schema,不另写 UI。

### Switch(`oa-switch`)—— 自建以保证双端一致
- 88×52rpx(44×26px)胶囊;**关** = `ink-subtle` 底,**开** = `brand` 底;thumb 44rpx 纯白 + `shadow-sm`,开启时 `translateX(36rpx)`(0.2s ease)。`disabled` opacity 0.4。自建是因为 app-plus/H5 原生 `<switch>` 不可控。

### Status Badge(`oa-status-badge`)—— 软底胶囊
- 胶囊(`radius-full`)+ caption 11px / 600;五态 `up`(success)/`down`(danger)/`info`(brand)/`warn`(warning)/`neutral`(sunken + muted)。严格软底配方(见 The Soft-Fill Rule)。

### Navigation(`oa-segmented` / `PageTab` / `oa-nav-header`)
- **Segmented:** `surface-sunken` 凹陷容器(`radius-lg`),内含分段项;active 项 = `surface` 凸起 + brand 字 + 600 + `shadow-sm`。`equal` 时等宽。
- **PageTab:** `surface` 容器 + `radius-md` + `shadow-sm`;active = brand 字 + 600 + `brand-subtle` 底。子页签主力。
- **oa-nav-header:** 自绘导航头(配 `navigationStyle: custom`),状态栏占位 + 返回(64rpx 触控热区)+ 居中 title(ellipsis)+ 右槽。

### States(`oa-empty` / `oa-loading`)
- **Empty:** 居中、`sp-5 sp-3` 留白、可选 120rpx 图标 + body/muted 文案 + 操作槽。**空态要教人怎么开始,不是冷冰冰"暂无数据"。**
- **Loading:** brand 描边 spinner(0.8s linear);`overlay` = 全屏 `scrim` 55% + `surface` 内盒(`radius-2xl` + `shadow-lg`)。**优先 skeleton/内联 loading,避免在内容中央放裸 spinner。**

### List Row(`oa-list-row`)—— 信息行的标准件
- `label`(label 字号 / muted,宽 140rpx)+ 右对齐 `value`(body / ink / 500)+ 可选 hairline 底 + 可选箭头(`ink-subtle` 45° chevron)。`copyable` 套 `oa-copy-text`。

### Signature:长按复制(`oa-copy-text`)
- view 承载 `@longpress`(双端可靠)→ `uni.setClipboardData` + "已复制" toast;无自有样式,继承父级。这是全站静态值(IP/MAC/接口名)的统一复制入口——**新增长可复制的只读值,用它,不要各自实现。**

### Signature:Schema 编辑器(`oa-uci-list`)
- 弹窗(`radius-2xl` + `surface`)+ 分组字段 + 底部三按钮(delete/cancel/save)。驱动全部 10 个插件页:**新增插件 = 写 schema + 写 load,不碰表单**。高危 config(`firewall`/`wireless`/`passwall2`)save 时二次确认 + 风险提示。

## 6. Do's and Don'ts

### Do:
- **Do** 用 `uni.scss` 的 `$oa-*` token(颜色 / 圆角 / 间距 / 字号 / 阴影)——不硬编码。这是单一事实来源。
- **Do** 把主色 Aurora 青蓝控制在单屏 ≤10%,只用于主要操作 / 当前选中 / 开关开启 / 焦点环 / 链接(The One-Accent Rule)。
- **Do** 用软底配方做状态徽标与次级操作(`X-surface` 底 + `X` 字),胶囊圆角(The Soft-Fill Rule)。
- **Do** 靠三层中性面(canvas / surface / sunken)的色调差表达层级,阴影只随状态升降(The State-Driven Shadow Rule)。
- **Do** 控件统一 `radius-xl` 12px、按下 `scale(0.95)` 反馈、触控热区 ≥44px 等效。
- **Do** 文本颜色下限用 `ink-muted #6B7280`(白底 ~5:1);小字号主色文本用 `brand-hover #0A6E97` 而非 `brand`。
- **Do** 复用 `oa-*` 组件;新增插件走 `oa-uci-list` schema,不另写表单。
- **Do** 给空态配引导文案与操作槽,loading 优先 skeleton/内联。

### Don't:
- **Don't** 花哨 / 过度装饰:**渐变文字**(`background-clip:text`+渐变)、**滥用毛玻璃**、大色块 hero、emoji 堆砌——工具类 App 的忌讳,出现即破坏信任(PRODUCT.md 反参考,逐字执行)。
- **Don't** 做成 **luci 网页端的拥挤表格感**:密集表单、小字、低对比、字段堆叠。能做的事很多,但绝不能看起来像 luci 那面"墙"。
- **Don't** 套 **通用 SaaS 仪表盘模板**:hero-metric 大数字 + 小标签 + 配套统计 + 渐变点缀、千篇一律的等高 icon 卡片网格。
- **Don't** 用 `ink-subtle #9CA3AF`(白底 ~2.8:1)作正文或占位符文本——它只用于箭头/轨道等非文本装饰(The Ink-Floor Rule)。
- **Don't** 用 `border-left` / `border-right` 大于 1px 的彩色侧条做强调——改用完整边框、软底色块或前导图标。
- **Don't** 写裸 `z-index: 999/9999`——建立语义阶梯后再分层(The Z-Scale Gap)。
- **Don't** 嵌套卡片。**Don't** 为每个列表行都包卡片——用 `oa-list-row`。
- **Don't** 引入第二支无衬线、展示字体或图标字体;**Don't** 新造已有标准件(`oa-button`/`oa-switch`/`oa-card`/...)能覆盖的控件。
