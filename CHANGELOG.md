# 更新日志

相对上游 [destan19/OPAssistant](https://github.com/destan19/OPAssistant) v1.0.6 的演进:对齐 v1.0.12 功能集 + 全面重构,演进至 WrtCtrl 2.0.0。

**规模**:127 个提交 · 151 个文件 · +20351 / −11148 行(基线 `5377da0`)

## 2.0.0

应用更名 **WrtCtrl**、版本升至 2.0.0;导航与设备体验重构;新增快捷工具箱与终端搜索。

### 新增
- **快捷工具箱**:WiFi 分频段 / IPv6 / 防火墙 / FullCone(IPv4·IPv6)/ UPnP 五个一键开关,按设备能力探测可用性,高危项二次确认 + rollback 兜底
- **终端即时搜索**:无线客户端 / DHCPv4 / DHCPv6 列表按 MAC / 主机名 / IP 过滤,搜索框带一键清空
- **设备历史页**:登录过的设备分组留存,tap 直连 + ping 延迟徽标(延迟为 HTTP 响应时间,仅供参考)+ 下拉刷新
- **启动门控**:自动重连上次设备(`reconnectDevice` 探活 + 静默重登),失败回登录页;home 顶部下拉设备切换器
- **语言切换入口**:登录页底部 + home 右上,运行时即时切换(`reLaunch` 重载刷新 native chrome)
- **20 个数据 / 列表页**开启下拉刷新

### 改进
- **应用更名** OPAssistant → **WrtCtrl**,版本 1.0.12 → 2.0.0,新应用图标 + Font Awesome 图标本地化(woff2)
- **WOL 插件适配**:wolplus → wolultra(超级网络唤醒,后端 etherwake,新增定时唤醒 cron 字段)
- **应用中心图标统一** Font Awesome solid + 技术简称(WOL / PW 等),缩小简称与图标的视觉差距
- **首页仪表盘打磨**:5 卡换 `oa-card` + token 化、带宽图横轴显示真实时间(HH:mm:ss)、新增存储卡、温度字号统一、资源监控环补百分号
- **输入聚焦反馈**:仿 Material 光环全站铺开(`oa-input-focus` mixin 移入 `uni.scss` 全局注入,复用闲置 `$oa-focus-ring`)
- **登录页重构**:分组表单 + 密码显隐 + 凹陷输入 + 通栏主按钮 + 触摸热区 / 交互态 / 删除项 danger 语义色
- **结构优化**:`PageTab` → `oa-page-tab`(easycom 统一)、`deviceManager.js` → `device-manager.js`、`device_list` 系列移入 `pages/device/`、删死页 `user/info` 与冗余 `client_detail`
- **uci-rpc**:`apply` 白名单加 `enable|disable`(供 UPnP 等服务级开关)
- 建立设计上下文文档:`PRODUCT.md` / `DESIGN.md` / `.impeccable/design.json`

### 修复
- **view 层 vnode 错位**(切语言 / 首次进 home 报 `Not found -1,94`,且存储卡标题串显"网络状态"):根因是同页多 `v-if` 同类型组件(`oa-card` / `oa-empty`)无 `:key` 致实例复用错位;全站补 `:key` 治本
- **域名设备首次登录失败**:DNS 冷解析慢 + 超时不足;改启动时 DNS 预解析(`prefetchDns`)+ 适中超时(login / ping 各 5s),不延长等待
- **i18n 切换后 native chrome 不刷新**:切换语言后 `reLaunch` 重载,刷新 tabBar 与各页标题

---

## 1.x — 对齐 v1.0.12 + 全面重构

### 新增
- **10 个插件原生编辑页**:arpbind / wolplus / autoreboot / cifs-mount / samba4 / upnp / WiFi(MTK mtwifi-cfg + 标准 mac80211 双分支)/ 防火墙 / USB 打印机 / PassWall2
- **运维工具**:诊断(ping / traceroute / nslookup)、系统日志(logread + dmesg)、conntrack(top N + 搜索)
- **PassWall2 控制面板**:基本设置(@global)+ 规则管理(@global_rules + @shunt_rules,`uci.order` 排序)
- **防火墙原生页**:总览 + zone / forwarding / redirect / rule / nat + 自定义规则编辑
- **Aurora 设计系统**:`oa-*` 组件库(card / button / loading / empty / status-badge / switch / segmented / list-row / copy-text / nav-header / countdown-action)+ PageTab + `oa-uci-list`(schema 驱动通用 UCI 编辑器,支持 switch / text / password / select / dynamicList / multiSelect / textarea + depends 联动 + 分级确认)
- **工具层**:`uci-rpc`(统一 ubus 通道 + rollback)/ `diag` / `syslog` / `conntrack` / `wireless` / `firewall` / `format` / `passwall2` / `echart-theme`
- **uni_modules**:lime-echart / uni-popup / uni-scss / uni-transition
- **路由表 IPv6**:`ip -4` / `ip -6` 并发,family 标识
- **i18n**:32 个 namespace 中英完全对齐(含 statistics 图表 i18n 化)

### 改进
- **远程安全 S1-S4**:rollback 兜底(`uci.apply{rollback:true,timeout:120}` + `uci.confirm` + 保存前 session 预检)/ 砍不可逆(factory_reset 入口移除)/ 分级确认(高危 firewall / wifi / passwall2 二次 + 风险提示)/ 写路径统一(经 `UciRpc.commit`;`apply()` 为白名单 initScript/action 的受控 reload)
- **统一 RPC 通道**:`UciRpc.callUbus` 替换原裸 `uni.request` 样板(**42 处 → 4 处**,仅剩设备登录 3 处 + 统一通道 1 处),恢复硬超时兜底(防 rpcd hang 致页面永久 loading)
- **UI 统一**:PageTab 分页、header 策略(首页自定义 / 其余原生导航)、静态字段长按复制、长文本截断换行、列表行 / 分段控件 / 状态圆点全站统一
- **WiFi**:修 ACL(commit 走 apply{rollback} + `/sbin/wifi up`)/ 没真正开启(device + iface disabled 取并集)/ 状态显示 / MTK 默认值对齐 luci
- **statistics 重写**:图表 i18n + 自定义主题 + 带宽差分去重

### 移除
- **parental_control 全套**(家长控制,~2917 行:index / app_filter_rules / basic_settings / advanced_settings / about)
- **factory_reset**(恢复出厂,apps 入口 + 页面 + 路由)
- about / help 页、旧 `tabBar`(被 PageTab 替代)
- `utils/deviceApi.js`、`utils/session.js`(旧 luci HTTP `/cgi-bin/luci` 抽象层)

### 修复
- **uci-rpc**:`get` 解包 rpcd `.values` 包装、`add` 不传 name/values(对齐 luci)、`commit` 改 `apply{rollback}`+`confirm`(纯 ubus)、`reorder`→`order`(rpcd ubus 方法名修正,params 为 sections 全量数组)
- **oa-uci-list**:弹窗滚动、输入框高度(80rpx)、空 list 跳过(rpcd `uci.set` 不接受空 `[]` → INVALID_ARGUMENT)、`depends` 数组(AND,向后兼容单对象)
- **WiFi MTK**:字段输入校验
- **oa-copy-text**:类型拓宽(String | Number)
