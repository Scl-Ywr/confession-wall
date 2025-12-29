// 配置检查脚本
// 在浏览器控制台中运行这个脚本来检查当前配置

console.log('=== Supabase OAuth 配置检查 ===');

// 检查当前环境
console.log('1. 当前环境:');
console.log('   - Hostname:', window.location.hostname);
console.log('   - Protocol:', window.location.protocol);
console.log('   - Full URL:', window.location.href);

// 检查 Supabase 配置
console.log('\n2. Supabase 配置:');
console.log('   - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// 检查 GitHub OAuth App 配置（通过 URL 参数推断）
const urlParams = new URLSearchParams(window.location.search);
console.log('\n3. 当前 URL 参数:');
for (const [key, value] of urlParams) {
  console.log(`   - ${key}: ${value}`);
}

// 如果是回调页面，检查错误信息
if (window.location.pathname.includes('/auth/callback')) {
  console.log('\n4. OAuth 回调状态:');
  if (urlParams.get('error')) {
    console.log('   ❌ 发现 OAuth 错误:', urlParams.get('error'));
    console.log('   错误描述:', urlParams.get('error_description'));
  } else if (urlParams.get('code')) {
    console.log('   ✅ 收到授权码，正在处理...');
  } else {
    console.log('   ℹ️  回调页面正常加载');
  }
}

// 检查预期的重定向路径
console.log('\n5. 预期的重定向路径:');
console.log('   1. 本地登录页面: http://localhost:3000/auth/login');
console.log('   2. GitHub 授权页面: GitHub.com');
console.log('   3. Supabase 回调: https://ltbacrfoksjzfszpsmow.supabase.co/auth/v1/callback');
console.log('   4. 应用回调页面: ' + window.location.origin + '/auth/callback');
console.log('   5. 最终重定向: ' + window.location.origin + '/');

console.log('\n6. 如果问题仍然存在，请检查:');
console.log('   - Supabase Dashboard > Authentication > Settings > Site URL');
console.log('   - Supabase Dashboard > Authentication > Providers > GitHub');
console.log('   - GitHub OAuth App 的配置');