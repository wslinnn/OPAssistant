
/**
 * AES-256-CBC 加密（替代原 XOR 方案，提升安全性）
 * 原 v1.0.6/v1.0.12 使用 XOR + 硬编码 KEY（安全审查 HIGH），
 * 现升级为 AES-256-CBC + 随机 IV + SHA256 派生 KEY。
 * 密文格式：AES: + base64(IV[16] + ciphertext)
 */
import CryptoJS from 'crypto-js'

const SECRET = 'b9f419548a1a26381522a520f0cf15e8'   // 沿用 v1.0.12 KEY 字面量，经 SHA256 派生为 32 字节 AES KEY
const ENCRYPTED_PREFIX = 'AES:'

function deriveKey() {
	return CryptoJS.SHA256(SECRET)   // WordArray，32 字节
}

class Crypto {

	static encrypt(text) {
		if (!text) return ''
		try {
			const iv = CryptoJS.lib.WordArray.random(16)
			const encrypted = CryptoJS.AES.encrypt(text, deriveKey(), {
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.Pkcs7
			})
			// 拼接 IV + 密文，整体 base64
			const combined = iv.clone().concat(encrypted.ciphertext)
			return ENCRYPTED_PREFIX + CryptoJS.enc.Base64.stringify(combined)
		} catch (e) {
			console.error('加密失败:', e)
			return ''
		}
	}

	static decrypt(cipher) {
		// 非 AES: 前缀（含旧版本 ENC: XOR 密文）原样返回 —— 旧密码将失效，需重新输入
		if (!cipher || !cipher.startsWith(ENCRYPTED_PREFIX)) {
			return cipher
		}
		try {
			const combined = CryptoJS.enc.Base64.parse(cipher.substring(ENCRYPTED_PREFIX.length))
			const words = combined.words
			const iv = CryptoJS.lib.WordArray.create(words.slice(0, 4), 16)
			const ciphertext = CryptoJS.lib.WordArray.create(words.slice(4), combined.sigBytes - 16)
			const decrypted = CryptoJS.AES.decrypt(
				CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }),
				deriveKey(),
				{ iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
			)
			return decrypted.toString(CryptoJS.enc.Utf8)
		} catch (e) {
			console.error('解密失败:', e)
			return cipher
		}
	}

	static isEncrypted(text) {
		return text && text.startsWith(ENCRYPTED_PREFIX)
	}
}

export default Crypto
