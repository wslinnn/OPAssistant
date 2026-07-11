
import UciRpc from './uci-rpc.js'

// passwall2 控制面板封装:节点候选、全局 socks 端口、运行检测(pgrep + curl socks5 三态)
// 纯 UCI 读取 + file.exec 检测,不经 luci HTTP 层
class Passwall2 {
	// 节点候选(@nodes remarks → ListValue 选项;value=section name,label=remarks)
	static async listNodes() {
		const w = await UciRpc.get('passwall2').catch(() => ({}))
		const nodes = []
		Object.keys(w).forEach(name => {
			const s = w[name]
			if (s && s['.type'] === 'nodes') {
				nodes.push({ value: name, label: s.remarks || name })
			}
		})
		return nodes
	}

	// 全局 socks5 端口(@global[0].node_socks_port,默认 1070)— 运行检测用
	static async getGlobalSocksPort() {
		const w = await UciRpc.get('passwall2').catch(() => ({}))
		const g = Object.keys(w).map(n => w[n]).find(s => s && s['.type'] === 'global')
		return (g && g.node_socks_port) || '1070'
	}

	// @global[0] section 对象(基本设置编辑用;含 .name 供 setCommit)
	static async getGlobalSection() {
		const w = await UciRpc.get('passwall2').catch(() => ({}))
		const name = Object.keys(w).find(n => w[n] && w[n]['.type'] === 'global')
		return name ? { ...w[name], '.name': name } : null
	}

}

export default Passwall2
