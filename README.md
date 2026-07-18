# WrtCtrl

![version](https://img.shields.io/badge/version-2.0.0-blue)
![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-Android%20%7C%20H5-lightgrey)
![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN-orange)

> OpenWrt 路由器移动管理 App · Android(原生)+ H5

OpenWrt 路由器的移动端管理客户端(原 OPAssistant)。一套代码发行 Android 与 H5,远程或本地统一管理路由器:实时状态、网络与无线、防火墙、代理、应用,外加一整套**远程零风险**的运维诊断工具。

<!-- TODO: 建议在此放一张 hero 截图(首页仪表盘),单张图就能大幅提升第一印象 -->

## 截图

<!-- TODO: 补充 3-4 帧 —— 首页仪表盘 / 插件编辑(WiFi 或防火墙)/ 运维工具中心 -->

## 特性

**设备总览**
- 首页仪表盘:CPU / 内存 / 负载 / 实时带宽(横轴真实时间)/ 连接数 / 存储
- 网络(接口 / 设备)、无线客户端(MAC / 主机名 / IP 即时搜索)、系统进程、启动项、路由表(IPv4 + IPv6)、流量统计图表
- 多设备管理:启动自动重连上次设备、设备历史记录、顶部下拉一键切换
- 中英双语,运行时即时切换

**插件原生编辑(10 个)** — 统一 `oa-uci-list` schema 编辑器驱动
arpbind · wolultra · autoreboot · cifs-mount · samba4 · upnp · WiFi(自动识别 MTK mtwifi-cfg / 标准 mac80211 双分支)· 防火墙(zone / forwarding / redirect / rule / nat + 自定义规则)· USB 打印机 · PassWall2 控制面板(基本设置 + 分流规则管理)

**运维工具**
- 诊断:ping / traceroute / nslookup
- 系统日志:logread + dmesg,级别筛选
- conntrack:活动连接 top N + 搜索过滤
- 路由表(IPv4 + IPv6 并发)、进程、启动项、重启

**远程安全设计**(app 常跨网使用,失联是头号风险)
- **rollback 兜底**:所有 UCI 写走 `uci.apply{rollback:true}` + `uci.confirm`,路由器侧 timeout 内无 confirm 自动回滚,失联自愈
- **保存前 session 预检**:commit 前 `system.board` 探针验证会话有效,失效自动静默重登,避免 apply 成功但 confirm 失败被回滚
- **分级确认**:只读无确认 / 低危二次 / 高危(firewall defaults、wifi 射频、passwall2 全局)二次 + 行内风险提示
- **域名登录优化**:启动时对域名设备 DNS 预解析,改善跨网域名首次连接体验
- **不依赖额外 luci 插件 / 自定义 ACL**,适配绝大多数 OpenWrt 系统

> 设计取舍与历史变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 环境要求

**路由器侧**
- OpenWrt(推荐 21.02+,需带 rpcd ubus JSON-RPC,即标准 luci web 的 `/ubus` 端点)
- 路由器可达(app 所在网络能访问路由器地址 + 端口;跨网用 ZeroTier / Tailscale 等组网)

**构建侧**
- HBuilderX(uni-app 官方 IDE)
- Node.js(依赖安装)
- 已内置 uni_modules:lime-echart / uni-popup / uni-scss / uni-transition

## 快速开始

**方式 A · 下载 APK**
- 到 [Releases](../../releases) 下载最新 APK,安装到 Android 设备
- 打开 App → 登录页填写路由器信息

**方式 B · 从源码构建**
1. HBuilderX 打开本项目目录
2. 「运行」或「发行」→ 选 Android(App)或 H5
3. App 端首次打开在登录页添加路由器(地址 / 端口 / 账号密码)

## 首次使用
打开 App 即进入登录页:填写地址(支持 IP / 域名)、端口(默认 80 / 443)、账号、密码。登录成功的设备自动记入历史,下次启动自动重连上次设备。App 通过 rpcd ubus 与路由器通信,**无需路由器额外安装插件**。

## 技术栈
- uni-app + Vue2 + HBuilderX
- 平台:app-plus(Android)+ H5
- 图表:lime-echart(ECharts)+ 自定义主题
- 国际化:vue-i18n(中文 / English,32 个 namespace 完全对齐)
- 路由器通信:rpcd ubus JSON-RPC(uci / file / luci / system / network)
- 设计系统:Aurora(`oa-*` token + 组件库),Font Awesome 本地化图标

## 目录结构
```
components/oa-*        Aurora 组件库(card/button/loading/empty/switch/nav-header/...)+ oa-page-tab
components/oa-uci-list schema 驱动的通用 UCI 编辑器(覆盖全部插件)
pages/device/          设备主界面(home/network/client/statistics + device_list 登录 / device_list_history 历史)
pages/device/plugins/  10 个原生插件页
pages/device/apps/     运维工具(diag/syslog/conntrack/route/process/startup/reboot)
utils/                 uci-rpc / device-manager(设备会话)/ diag / syslog / conntrack / wireless / firewall / format ...
locale/                中英文 i18n(32 namespace,完全对齐)
```

## 说明 / FAQ
- **需要装 luci 插件吗?** 不需要。app 通过路由器已有的 rpcd ubus 通道工作,不依赖任何额外 luci-app 或自定义 ACL。少数依赖后端 root exec 的功能(代理运行检测、应用日志、geo 手动更新、进程 kill、服务启停)app 端不做,引导到路由器网页端。
- **远程改配置会不会断网?** 所有 UCI 写都有 rollback 兜底。建议首次部署真机验证一次回滚触发机制(SSH 触发 `uci.apply{rollback:true}` 后不 confirm,观察是否自动回滚)。
- **支持域名登录吗?** 支持。启动时会对域名设备做 DNS 预解析,避免跨网首次解析慢导致登录超时。

## 贡献
欢迎提 [Issue](../../issues) 反馈 bug 或功能建议。

## 致谢
基于 [destan19/OPAssistant](https://github.com/destan19/OPAssistant) v1.0.6 fork 演进(功能对齐 v1.0.12 后持续重构,现版本 WrtCtrl 2.0.0)。感谢上游项目与 OpenWrt / luci 社区。

## 许可证
[GPL-3.0](./LICENSE)
