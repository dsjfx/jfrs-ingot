const crypto = require('crypto');

// 生成一个安全的随机密钥
function genSecret(len, code) {
	const secret = crypto.randomBytes(len).toString(code);
	console.log(secret); 
}

// 128个十六进制字符
genSecret(32, 'hex');

// 使用 base64 格式
genSecret(48, 'base64');

