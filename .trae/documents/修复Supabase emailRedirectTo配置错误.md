## 修复Supabase emailRedirectTo配置错误

### 问题分析
当前在 `src/lib/supabase/client.ts` 中直接使用 `window.location.origin` 配置 `emailRedirectTo`，这会在服务器端渲染时导致错误，因为服务器端没有 `window` 对象。

### 解决方案
1. **移除客户端配置中的emailRedirectTo**
   - 修改 `src/lib/supabase/client.ts`，移除直接在客户端配置中使用 `window` 对象的 `emailRedirectTo` 设置
   - 保留 `persistSession: true` 和 `autoSignIn: true` 设置

2. **在register方法中动态设置emailRedirectTo**
   - 确保在 `src/context/AuthContext.tsx` 的 `register` 方法中正确设置 `emailRedirectTo`
   - 使用 `typeof window !== 'undefined'` 检查确保只在客户端执行
   - 动态获取当前域名作为redirect URL

3. **确保验证页面配置正确**
   - 确保 `src/app/auth/verify-email/page.tsx` 能够正确处理验证逻辑
   - 确保验证成功后能够正确引导用户登录

### 实现步骤
1. 修改 `src/lib/supabase/client.ts`，移除错误的 `emailRedirectTo` 配置
2. 更新 `src/context/AuthContext.tsx`，确保 `register` 方法中正确设置 `emailRedirectTo`
3. 测试修复后的代码，确保服务器端渲染不再出错
4. 测试注册流程，确保验证邮件能够正确发送
5. 测试验证链接，确保用户能够正确完成验证

### 预期效果
- 服务器端渲染不再出现 `window is not defined` 错误
- 用户注册后能够收到验证邮件
- 验证链接能够正确引导用户完成验证
- 只有验证过邮箱的用户才能成功登录

### 实现要点
- 避免在服务器端代码中使用浏览器特定的API
- 确保 `emailRedirectTo` 只在客户端执行
- 动态获取当前域名，确保在不同环境下都能正常工作
- 保持现有的验证流程不变