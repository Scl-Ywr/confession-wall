/**
 * Turnstile 配置检查脚本
 * 运行: node scripts/check-turnstile-config.js
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 检查 Turnstile 配置...\n');

// 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ 错误: .env.local 文件不存在');
  console.log('   请复制 .env.local.example 为 .env.local 并配置相关变量');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let siteKey = '';
let secretKey = '';

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  
  if (key === 'NEXT_PUBLIC_TURNSTILE_SITE_KEY') {
    siteKey = value;
  } else if (key === 'TURNSTILE_SECRET_KEY') {
    secretKey = value;
  }
}

console.log('📋 配置状态:');
console.log('─'.repeat(50));

// 检查 Site Key
if (siteKey) {
  console.log(`✅ NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${siteKey.substring(0, 10)}...`);
  
  // 检查是否是测试密钥
  if (siteKey.startsWith('1x00000000')) {
    console.log('   ⚠️  这是测试密钥（始终通过）');
  } else if (siteKey.startsWith('2x00000000')) {
    console.log('   ⚠️  这是测试密钥（始终失败）');
  } else if (siteKey.startsWith('3x00000000')) {
    console.log('   ⚠️  这是测试密钥（强制交互）');
  }
} else {
  console.log('❌ NEXT_PUBLIC_TURNSTILE_SITE_KEY: 未配置');
}

// 检查 Secret Key
if (secretKey) {
  console.log(`✅ TURNSTILE_SECRET_KEY: ${secretKey.substring(0, 10)}...`);
  
  // 检查是否是测试密钥
  if (secretKey.startsWith('1x00000000')) {
    console.log('   ⚠️  这是测试密钥（始终通过）');
  } else if (secretKey.startsWith('2x00000000')) {
    console.log('   ⚠️  这是测试密钥（始终失败）');
  } else if (secretKey.startsWith('3x00000000')) {
    console.log('   ⚠️  这是测试密钥（强制交互）');
  }
} else {
  console.log('❌ TURNSTILE_SECRET_KEY: 未配置');
  console.log('   ⚠️  后端验证将无法工作！');
}

console.log('─'.repeat(50));

// 总结
if (siteKey && secretKey) {
  console.log('\n✅ Turnstile 配置完整');
} else if (siteKey && !secretKey) {
  console.log('\n⚠️  警告: Secret Key 未配置');
  console.log('   - 开发模式下会跳过后端验证');
  console.log('   - 生产环境将无法正常工作');
  console.log('\n💡 解决方案:');
  console.log('   1. 访问 https://dash.cloudflare.com/?to=/:account/turnstile');
  console.log('   2. 找到对应的 Site，复制 Secret Key');
  console.log('   3. 在 .env.local 中设置 TURNSTILE_SECRET_KEY=你的密钥');
  console.log('\n   或者使用测试密钥（仅用于开发）:');
  console.log('   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA');
  console.log('   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA');
} else {
  console.log('\n❌ Turnstile 配置不完整');
  console.log('   请参考 .env.local.example 配置相关变量');
}

console.log('');
