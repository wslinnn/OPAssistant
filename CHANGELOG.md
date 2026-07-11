# 更新日志

相对上游 [destan19/OPAssistant](https://github.com/destan19/OPAssistant) v1.0.6 的演进:对齐 v1.0.12 功能集 + 全面重构。

**规模**:76 个提交 · 134 个文件 · +17176 / −11071 行(基线 `5377da0`)

## 新增
- **10 个插件原生编辑页**:arpbind / wolplus / autoreboot / cifs-mount / samba4 / upnp / WiFi(MTK mtwifi-cfg + 标准 mac80211 双分支)/ 防火墙 / USB 打印机 / PassWall2
- **运维工具**:诊断(ping / traceroute / nslookup)、系统日志(logread + dmesg)、conntrack(top N + 搜索)
- **PassWall2 控制面板**:基本设置(@global)+ 规则管理(@global_rules + @shunt_rules,`uci.order` 排序)
- **防火墙原生页**:总览 + zone / forwarding / redirect / rule / nat + 自定义规则编辑
- **Aurora 设计系统**:`oa-*` 组件库(card / button / loading / empty / status-badge / switch / segmented / list-row / copy-text / nav-header / countdown-action)+ PageTab + `oa-uci-list`(schema 驱动通用 UCI 编辑器,支持 switch / text / password / select / dynamicList / multiSelect / textarea + depends 联动 + 分级确认)
- **工具层**:`uci-rpc`(统一 ubus 通道 + rollback)/ `diag` / `syslog` / `conntrack` / `wireless` / `firewall` / `format` / `passwall2` / `echart-theme`
- **uni_modules**:lime-echart / uni-popup / uni-scss / uni-transition
- **路由表 IPv6**:`ip -4` / `ip -6` 并发,family 标识
- **i18n**:32 个 namespace 中英完全对齐(含 statistics 图表 i18n 化)

## 改进
- **远程安全 S1-S4**:rollback 兜底(`uci.apply{rollback:true,timeout:120}` + `uci.confirm` + 保存前 session 预检)/ 砍不可逆(factory_reset 入口移除)/ 分级确认(高危 firewall / wifi / passwall2 二次 + 风险提示)/ 写路径统一(经 `UciRpc.commit`;`apply()` 为白名单 initScript/action 的受控 reload)
- **统一 RPC 通道**:`UciRpc.callUbus` 替换原裸 `uni.request` 样板(**42 处 → 4 处**,仅剩设备登录 3 处 + 统一通道 1 处),恢复硬超时兜底(防 rpcd hang 致页面永久 loading)
- **UI 统一**:PageTab 分页、header 策略(首页自定义 / 其余原生导航)、静态字段长按复制、长文本截断换行、列表行 / 分段控件 / 状态圆点全站统一
- **WiFi**:修 ACL(commit 走 apply{rollback} + `/sbin/wifi up`)/ 没真正开启(device + iface disabled 取并集)/ 状态显示 / MTK 默认值对齐 luci
- **statistics 重写**:图表 i18n + 自定义主题 + 带宽差分去重

## 移除
- **parental_control 全套**(家长控制,~2917 行:index / app_filter_rules / basic_settings / advanced_settings / about)
- **factory_reset**(恢复出厂,apps 入口 + 页面 + 路由)
- about / help 页、旧 `tabBar`(被 PageTab 替代)
- `utils/deviceApi.js`、`utils/session.js`(旧 luci HTTP `/cgi-bin/luci` 抽象层)

## 修复
- **uci-rpc**:`get` 解包 rpcd `.values` 包装、`add` 不传 name/values(对齐 luci)、`commit` 改 `apply{rollback}`+`confirm`(纯 ubus)、`reorder`→`order`(rpcd ubus 方法名修正,params 为 sections 全量数组)
- **oa-uci-list**:弹窗滚动、输入框高度(80rpx)、空 list 跳过(rpcd `uci.set` 不接受空 `[]` → INVALID_ARGUMENT)、`depends` 数组(AND,向后兼容单对象)
- **WiFi MTK**:字段输入校验
- **oa-copy-text**:类型拓宽(String | Number)
