// 环境变量检查脚本
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

console.log('🔍 环境变量配置检查\n');

let hasErrors = false;

// 检查必需的环境变量
console.log('必需的环境变量：');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log('✗', varName, '- 未设置');
    hasErrors = true;
  } else if (value.includes('your-') || value.includes('here')) {
    console.log('⚠', varName, '- 需要更新（使用占位符）');
    hasErrors = true;
  } else {
    console.log('✓', varName);
  }
});

// 验证 Supabase URL 格式
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValid = url.startsWith('https://') && url.endsWith('.supabase.co');
  if (!isValid) {
    console.log('\n✗ Supabase URL 格式不正确');
    console.log('  正确格式: https://your-project.supabase.co');
    hasErrors = true;
  } else {
    console.log('\n✓ Supabase URL 格式正确');
  }
}

// 验证 ANON_KEY 格式
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isValid = key.startsWith('eyJ') && key.length > 100;
  if (!isValid) {
    console.log('✗ Supabase ANON KEY 格式可能不正确');
    hasErrors = true;
  } else {
    console.log('✓ Supabase ANON KEY 格式正确');
  }
}

// 输出总结
console.log('\n' + '='.repeat(50) + '\n');

if (hasErrors) {
  console.log('❌ 配置检查失败！\n');
  console.log('请确保所有必需的环境变量都已正确配置。');
  console.log('参考文档: ENV_SETUP.md\n');
  process.exit(1);
} else {
  console.log('✅ 所有必需的环境变量配置正确！\n');
  console.log('你现在可以运行: npm run dev\n');
  process.exit(0);
}

