# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

OpenWrt 路由器移动管理 App,uni-app + Vue2,一套代码发行 Android(app-plus)与 H5。通过路由器已有的 **rpcd ubus JSON-RPC**(`/ubus` 端点)与路由器通信,**不依赖任何额外 luci 插件或自定义 ACL**。基于 destan19/OPAssistant v1.0.6 fork,功能对齐 v1.0.12。代码注释、commit、文档均为中文,沿用此惯例。

## 构建与运行

**无 CLI 构建 / 无测试**。这是纯 HBuilderX(uni-app 官方 IDE)项目:
- 构建 / 运行只能用 HBuilderX 打开本目录,「运行/发行」→ 选 Android(App)或 H5。`package.json` 只有依赖、无 scripts;没有 test/lint 框架,不要臆造命令。
- 依赖安装:`npm install`(仅 `crypto-js` / `echarts` / `@vue/composition-api` 三个)。
- **H5 本地开发代理**:请求经 `vue.config.js` + `manifest.json` 的 `devServer.proxy` 转发 `/ubus`、`/cgi-bin/luci` 到路由器。默认 target `http://192.168.1.1` —— 改成你自己的路由器地址。
- 新增页面必须在 `pages.json` 注册(path + `navigationBarTitleText`,标题用 `%<i18n_ns>.<key>%` 形式)。

## 架构核心

### 1. 通信层:`utils/uci-rpc.js`(`UciRpc` 类)—— 所有路由器 IO 的唯一入口

所有插件/工具页只调 `UciRpc`,**不直接拼 `uni.request`**(历史上有 42 处裸请求,已收敛到 4 处:设备登录 3 + 通道本身 1)。建在 `utils/device-manager.js`(`DeviceManager`)之上,后者管设备列表、当前设备、登录、sysauth 会话。

ubus 响应约定:`res.data.result[0] === 0` 成功,`result[1]` 为数据载荷。`callUbus(object, method, params, timeout)` 是通用通道;`_uci(method, params)` 走 `uci` namespace。

rpcd ubus 有几处与直觉相悖的坑(都已踩过并写进注释,改动前先读相关注释):
- **`commit` 不存在**:luci-base rpcd ACL 刻意不授予 `uci.commit`(强制走 apply)。`UciRpc.commit()` = `uci.apply{rollback:true,timeout:120}` + `uci.confirm`,与 luci web 保存同路径,纯 ubus 无需 CSRF。
- **`reorder` 实为 `order`**:rpcd 方法名是 `uci.order`,params 为该 config 全部 section 名的数组(按目标顺序全量重排)。luci web 排序走后端 Lua cursor,从不经 rpcd。
- **`add` 不传 name/values**:rpcd `uci.add` 只创建匿名空壳,带 values 会触发 `INVALID_ARGS`。字段值由后续 `set` 填入(对齐 luci)。
- **`uci.set` 不接受空 list `[]`**:空列表会 `INVALID_ARGUMENT`,故 `oa-uci-list` 对空 list 跳过不写(副作用:无法清空已选 list,因 rpcd 无 option-delete 接口)。
- **`get` 解包 `.values`**:rpcd `uci.get` 返回 `{values:{sections...}}`,需解包。section map 的每个值带元数据键 `['.type','.anonymous','.name']`。
- **硬超时兜底**:`callUbus` 自带 `setTimeout`(app-plus 下 `uni.request` 的 timeout 对「连接已建立但 rpcd 不响应」可能不触发 fail,例如 `file.exec` 执行 hang 命令),防页面永久 loading。

便捷组合:`setCommit` / `addCommit` / `deleteCommit`(都是 set/add/delete + commit);`apply(initScript, action)` 调 `/etc/init.d/<script> <action>`(`file exec` 通道,**initScript/action 走白名单正则防注入**)。候选下拉数据也在这里:`getHostHintCandidates` / `getDeviceCandidates` / `getInterfaceCandidates` / `getZoneCandidates` / `getConntrackHelpers` / `getUsbPrinters`。

### 2. 远程安全不变量(改写路径时必须守住)

App 常跨网使用,**失联是头号风险**。写路径有以下硬约束,任何 UCI 写都不得绕过:
- **所有 UCI 写经 `UciRpc.commit`**(rollback 兜底)。路由器侧 timeout 内无 `confirm` 自动回滚,失联自愈。
- **保存前 session 预检**:`commit` 先 `system.board` 探针验证 sysauth 服务端有效,失效自动重登(`_ensureSession` → `_relogin`)。防止 apply 成功但 confirm 因 session 过期失败 → 被 120s 回滚。
- **分级确认**:只读无确认 / 低危二次确认 / 高危(`firewall` / `wireless` / `passwall2`)二次确认 + 行内风险提示。`oa-uci-list` 的 `onSave` 内置 `HIGH_RISK` 列表。
- **不引入不可逆操作**:`factory_reset` 入口已移除,不要加回。

### 3. `components/oa-uci-list` —— schema 驱动的通用 UCI 编辑器(驱动全部 10 个插件)

插件页不写表单,只声明一个 `schema`(computed,字段定义数组),把 `<oa-uci-list ref="editor" :schema=... config=... section-type=... :candidates=... init-script=... @saved @deleted />` 放模板里,列表自行渲染,通过 `this.$refs.editor.openCreate()` / `openEdit(section)` 调起弹窗。新增插件 = 写 schema + 写 load,不碰表单逻辑。

字段类型:`text` / `password` / `switch` / `select` / `deviceSelect` / `dynamicList` / `multiSelect` / `textarea`。每字段常用键:`key`(UCI option 名)/ `label` / `type` / `default` / `required` / `placeholder` / `candidates`(枚举:`hosthints-ip|hosthints-mac|devices|interfaces|zones|helpers|printers`)/ `options`(静态)/ `validate:{pattern,message}` / `group`+`groupLabel` / `depends`(联动显隐,见下)。
- **switch 反逻辑**:`invert:true`(如 arpbind `enabled='0'` 为启用)或 `onValue/offValue`(如 samba4 `yes/no`)。
- **depends 联动**:单对象或数组(AND);`value` 支持数组(多值任一)。依赖字段为 multiSelect 时按集合交集判定。未满足的字段 UI 隐藏、校验跳过、提交跳过(对齐 luci 不写隐藏字段)。
- **单例 section**:`@global[0]` / `@global_rules` 等命名单例用 `:allow-delete="false"`,编辑时不传 section-type。多例 CRUD + 排序见 passwall2 `@shunt_rules`(用 `UciRpc.reorder` 全量重排)。

### 4. 设计系统:Aurora(`oa-*`)

- **设计 token 定义在 `uni.scss`**(uni-app 自动全局注入 `$oa-*` SCSS 变量:`$oa-brand` / `$oa-surface` / `$oa-sp-*` / `$oa-fs-*` / `$oa-radius-*` / `$oa-shadow-*` / `$oa-text*` 等)。组件和页面直接用这些变量,**不要硬编码颜色/尺寸**。`styles/common.scss` 提供共享布局类(`.container` / `.plugin-container` / `.input` / `.popup` / `.chart-box`)。
- 组件库 `components/oa-*`(`oa-card` / `oa-button` / `oa-loading` / `oa-empty` / `oa-status-badge` / `oa-switch` / `oa-segmented` / `oa-list-row` / `oa-copy-text` / `oa-nav-header` / `oa-countdown-action`)+ `PageTab.vue`(替代旧 tabBar 的页内分页)。新增 UI 优先复用这些。
- 图表用 `uni_modules/lime-echart`,主题在 `utils/echart-theme.js`。

### 5. i18n(vue-i18n,中英 32 namespace 完全对齐)

- 文案在 `locale/en.json` + `locale/zh-Hans.json`,**两个文件必须同步增删**(namespace 一一对应)。页面用 `$t('ns.key')`;非组件上下文用 `utils/i18n.js`(`I18nUtils.t`)。
- 页面标题两道:`pages.json` 的 `%ns.key%`(注册时) + `onLoad` 里 `uni.setNavigationBarTitle`(运行时,因 i18n 切换动态生效)。
- 图表文案也要 i18n(statistics 已做)。

## 关键约定

- **HTTPS 自签证书**:`App.vue` 注册全局 `request` 拦截器,带 `x-uniauth: true` header 的请求自动关 SSL 校验。`UciRpc` 与 `DeviceManager` 的请求都带此 header。
- **设备上下文统一来源**:`UciRpc._ctx()` 从 `DeviceManager.getCurrentDevice()` 取 url + sysauth,不要在调用方自行拼接。
- **密码加密**:`DeviceManager` 存储时用 `utils/crypto.js`(crypto-js)加密,读出解密;登录走 `session.login`(临时 session `000...`)取 `ubus_rpc_session`。
- **应用中心动态发现**:`pages/device/apps.vue` 的 `PLUGINS` 列表里 `fixed:true` 始终显示,其余由 `DeviceManager.getInstalledPlugins()`(并行 `uci.get config` 探测,会话级缓存,切设备清空)决定显隐。新增 luci 插件页要在此注册 + 加 i18n。
- **commit 风格**:Conventional Commits(中文描述),scope 用模块名,如 `feat(passwall2): ...` / `fix(uci-rpc): ...`。`CHANGELOG.md` 手动维护,按新增/改进/移除/修复分组。

## 目录速查

```
utils/                 uci-rpc(通信核心) / deviceManager(设备会话) / firewall(luci 颜色算法移植)
                       / wireless / diag / syslog / conntrack / format / echart-theme / i18n / crypto
components/oa-*        Aurora 组件库 + PageTab
components/oa-uci-list schema 驱动 UCI 编辑器(覆盖全部插件)
pages/device/         设备主界面(home/network/client/statistics + device_list)
pages/device/plugins/ 10 个原生插件页(各一个 index.vue)
pages/device/apps/    运维工具(route/diag/syslog/conntrack/process/startup/reboot,只读)
locale/               en.json / zh-Hans.json(必须对齐)
uni.scss              oa-* 设计 token(全局注入)
```

## Design Context

战略设计上下文见 [PRODUCT.md](./PRODUCT.md)(由 `/impeccable init` 维护)。做 UI / 交互改动前先读它。关键锚点:

- **Register**: product(工具型 App,设计服务于功能,非营销)
- **Platform**: web(uni-app webview 混合包装 + H5)
- **定位**:像原生系统 App 一样管路由器——不是把 luci 网页搬进手机
- **气质**:精准 · 冷静 · 可信赖
- **反参考**:花哨 / 过度装饰 · luci 网页端的拥挤表格感 · 通用 SaaS 仪表盘模板
- **五条设计原则**:① 像系统 App 不是网页包装 ② 远程敢下手(安全是前提) ③ 克制即专业 ④ 一套语言管十种插件 ⑤ 尊重专家但不堆砌

视觉 token 与组件契约(颜色 / 字号 / 间距 / 圆角 / 阴影 / 组件)见 [DESIGN.md](./DESIGN.md)(已由 `/impeccable document` 扫描 `uni.scss` 的 `oa-*` token 与 `components/oa-*` 组件库生成);机器可读 sidecar 在 `.impeccable/design.json`。token 的最终事实来源仍是 `uni.scss`,DESIGN.md 描述如何应用它们。
