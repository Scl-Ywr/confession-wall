'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 创建密码重置表单的Zod schema
const resetPasswordSchema = z.object({
  password: z.string()
    .nonempty('请输入新密码')
    .min(6, '密码长度不能少于6个字符'),
  confirmPassword: z.string()
    .nonempty('请确认新密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<string>('pending'); // pending, verifying, verified, expired
  const [resetEmail, setResetEmail] = useState<string | null>(null); // 存储要重置密码的邮箱
  
  // 使用ref存储定时器ID，避免不必要的状态更新
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 使用useCallback包装checkTokenStatus函数，避免不必要的重复创建
  const checkTokenStatus = React.useCallback(async () => {
    if (!token) return;
    
    try {
      // 调用RPC函数检查令牌状态
      const { data, error } = await supabase.rpc(
        'check_password_reset_token_status',
        { p_token: token }
      );
      
      if (error) {
        console.error('检查令牌状态失败:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const tokenInfo = data[0];
        console.log('令牌状态:', tokenInfo);
        
        // 更新要重置密码的邮箱
        setResetEmail(tokenInfo.email);
        
        if (tokenInfo.verified) {
          // 令牌已验证，更新状态
          setVerificationStatus('verified');
          setTokenVerified(true);
          setError(null);
          
          // 清除检查间隔
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          // 令牌未验证，尝试验证它
          try {
            await supabase.rpc('verify_password_reset_token', { p_token: token });
            // 验证后立即再次检查状态
            const { data: updatedData, error: updatedError } = await supabase.rpc(
              'check_password_reset_token_status',
              { p_token: token }
            );
            
            if (updatedError) {
              console.error('再次检查令牌状态失败:', updatedError);
            } else if (updatedData && updatedData.length > 0 && updatedData[0].verified) {
              // 验证成功
              setVerificationStatus('verified');
              setTokenVerified(true);
              setError(null);
              
              // 清除检查间隔
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } else {
              // 仍然未验证，继续检查
              setVerificationStatus('verifying');
            }
          } catch (verifyError) {
            console.error('验证令牌失败:', verifyError);
            // 验证失败，继续检查
            setVerificationStatus('verifying');
          }
        }
      } else {
        // 令牌不存在或已过期
        setVerificationStatus('expired');
        setTokenVerified(false);
        setError('重置链接已过期或无效。请重新请求密码重置。');
        
        // 清除检查间隔
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('检查令牌状态时出错:', err);
      setError('检查重置链接状态时出错。请稍后重试或重新请求密码重置。');
    }
  }, [token]);

  // 从URL中获取所有参数，并检查用户登录状态
  useEffect(() => {
    // 只在客户端执行，避免服务器端渲染错误
    if (typeof window !== 'undefined') {
      const checkSessionAndParams = async () => {
        try {
          const href = window.location.href;
          setCurrentUrl(href);
          
          // 解析URL的search部分和fragment部分
          const url = new URL(href);
          const searchParams = url.searchParams;
          
          // 获取fragment部分的参数
          let fragmentParams = new URLSearchParams();
          if (url.hash) {
            fragmentParams = new URLSearchParams(url.hash.slice(1));
          }
          
          // 获取所有可能的token参数，同时检查search和fragment部分
          const token_hash = searchParams.get('token_hash') || fragmentParams.get('token_hash');
          const access_token = searchParams.get('access_token') || fragmentParams.get('access_token');
          const refresh_token = searchParams.get('refresh_token') || fragmentParams.get('refresh_token');
          const customToken = searchParams.get('token') || fragmentParams.get('token'); // 我们自定义的token
          const type = searchParams.get('type') || fragmentParams.get('type');
          
          console.log('解析到的URL参数:', {
            token_hash,
            access_token,
            refresh_token,
            customToken,
            type
          });
          
          // 优先使用我们自定义的token
          const finalToken = customToken || token_hash || access_token || refresh_token;
          
          // 检查用户当前的会话状态
          const { data: session } = await supabase.auth.getSession();
          
          console.log('当前会话状态:', session.session ? '已登录' : '未登录');
          
          // 设置token和验证状态
          if (finalToken || session.session) {
            // 保存token，用于后续的密码重置
            setToken(finalToken);
            
            if (session.session) {
              // 用户已登录，直接设置为已验证
              setTokenVerified(true);
              setVerificationStatus('verified');
              setError(null);
              
              // 设置当前登录用户的邮箱
              if (session.session.user.email) {
                setResetEmail(session.session.user.email);
              }
            } else {
              // 用户未登录，设置为待验证
              setTokenVerified(false);
              setVerificationStatus('pending');
              setError(null);
              
              // 如果有token，开始定期检查其状态
              if (finalToken) {
                // 首先尝试验证令牌（如果是第一次访问）
                try {
                  await supabase.rpc('verify_password_reset_token', { p_token: finalToken });
                } catch (verifyError) {
                  console.error('验证令牌失败:', verifyError);
                }
                
                // 立即检查一次
                await checkTokenStatus();
                
                // 设置定期检查，每3秒检查一次
                const interval = setInterval(() => {
                  checkTokenStatus();
                }, 3000);
                
                // 存储定时器ID到ref中
                intervalRef.current = interval;
              }
            }
          } else {
            setToken(null);
            setTokenVerified(false);
            setVerificationStatus('expired');
            setError('未检测到有效的重置链接或会话。请确保您直接点击了邮件中的重置链接。');
          }
        } catch (err) {
          console.error('Error parsing URL or checking session:', err);
          setError('解析重置链接或检查会话时出错。请尝试重新请求密码重置。');
          setTokenVerified(false);
          setVerificationStatus('expired');
          setToken(null);
        }
      };
      
      // 执行检查
      checkSessionAndParams();
    }
    
    // 清理函数
    return () => {
      // 清除定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkTokenStatus]);

  // 使用react-hook-form
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    reset,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    setError(null);

    try {
      // 检查用户当前的会话状态
      const { data: session } = await supabase.auth.getSession();
      
      console.log('开始密码重置，当前会话状态:', session.session ? '已登录' : '未登录');
      
      if (session.session) {
        // 情况1：用户已登录，直接更新密码
        console.log('用户已登录，直接更新密码');
        
        const { error } = await supabase.auth.updateUser({
          password: data.password
        });

        if (error) {
          throw error;
        }
      } else if (token && verificationStatus === 'verified') {
        // 情况2：URL中包含token，且已验证
        console.log('使用已验证的token进行密码重置');
        
        // 尝试使用Supabase的resetPasswordForEmail或其他方法进行密码重置
        // 由于我们的自定义token已经验证，我们可以直接调用updateUser
        // 但首先需要让用户登录
        
        // 尝试获取邮箱地址
        const { data: tokenData, error: tokenError } = await supabase.rpc(
          'check_password_reset_token_status',
          { p_token: token }
        );
        
        if (tokenError) {
          throw tokenError;
        }
        
        if (tokenData && tokenData.length > 0) {
          const { email } = tokenData[0];
          
          // 使用邮箱和新密码进行登录或密码重置
          // 这里我们使用Supabase的updateUser方法，但首先需要用户登录
          // 由于我们的自定义token已经验证，我们可以直接调用updateUser
          // 但需要先让用户登录
          
          // 尝试使用密码重置链接中的token登录用户
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (verifyError) {
            // 如果verifyOtp失败，尝试使用邮箱和密码直接登录
            console.log('verifyOtp失败，尝试直接登录:', verifyError.message);
            
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: email,
              password: data.password
            });

            if (signInError) {
              // 如果直接登录失败，可能是密码还未更新，尝试使用updateUser
              console.log('直接登录失败，尝试更新密码:', signInError.message);
              
              // 这里可能需要使用其他方法，比如调用RPC函数直接更新密码
              const { error: updateError } = await supabase.rpc(
                'update_user_password',
                { p_email: email, p_new_password: data.password }
              );

              if (updateError) {
                throw updateError;
              }
            }
          }
          
          // 登录成功后，立即更新密码（可选，确保密码正确）
          const { error: updateError } = await supabase.auth.updateUser({
            password: data.password
          });

          if (updateError) {
            console.log('更新密码失败，但可能已经成功:', updateError.message);
          }
        }
      } else {
        // 情况3：没有token，或token未验证
        throw new Error('无法重置密码：未检测到有效的重置链接或登录状态。请确保您已经在手机端完成验证，或直接点击了邮件中的重置链接。');
      }

      // 密码重置成功
      setSuccess(true);
      reset();
      
      // 显示成功消息后，延迟一段时间再跳转到登录页面
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
      
    } catch (error) {
        const errorObj = error as Error;
        console.error('密码重置失败:', errorObj);
        
        // 将常见的英文错误信息转换为中文
        let errorMessage = errorObj.message || '修改密码失败，请重试';
        
        // 替换常见的英文错误信息
        if (errorMessage.includes('Cannot read properties of null') || 
            errorMessage.includes('Cannot read properties of undefined')) {
          errorMessage = '密码重置失败：无效的请求参数。请重新尝试。';
        } else if (errorMessage.includes('trim')) {
          errorMessage = '密码重置失败：密码格式不正确。请输入有效的密码。';
        } else if (errorMessage.includes('network') || 
                   errorMessage.includes('Network')) {
          errorMessage = '网络连接失败，请检查您的网络设置后重试。';
        } else if (errorMessage.includes('expired') || 
                   errorMessage.includes('Expired')) {
          errorMessage = '重置链接已过期，请重新请求密码重置。';
        }
        
        setError(errorMessage);
      } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      {/* 简化背景，移除可能导致问题的装饰元素 */}

      <div className="max-w-md w-full space-y-8 relative z-10 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400">
          设置新密码
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          为账号 {resetEmail ? resetEmail : '******@*****.***'} 设置一个新密码
        </p>
        
        {/* 优化的令牌验证状态 */}
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm">
          {/* 验证状态显示 */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {verificationStatus === 'pending' && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <span>⏳</span>
                <span className="font-medium">等待验证...</span>
              </div>
            )}
            {verificationStatus === 'verifying' && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">正在验证...</span>
              </div>
            )}
            {verificationStatus === 'verified' && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <span>✅</span>
                <span className="font-medium">验证成功！</span>
              </div>
            )}
            {verificationStatus === 'expired' && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span>❌</span>
                <span className="font-medium">链接已过期！</span>
              </div>
            )}
          </div>
          
          {/* 状态描述 */}
          <p className="text-center text-sm mb-3">
            {verificationStatus === 'pending' && '请检查您的邮箱，点击重置链接完成验证。'}
            {verificationStatus === 'verifying' && '正在等待您在手机端完成验证...'}
            {verificationStatus === 'verified' && '链接验证成功！您可以设置新密码了。'}
            {verificationStatus === 'expired' && '重置链接已过期或无效。请重新请求密码重置。'}
          </p>
          
          {/* 优化的调试信息 */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 p-2 rounded-lg">
            <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">调试信息：</p>
            <p className="break-all mb-1">当前URL: {currentUrl}</p>
            <p className="break-all">检测到的token: {token || '未找到'}</p>
            <p className="mt-1">token验证状态: {tokenVerified ? '已验证' : '未验证'}</p>
            <p className="mt-1">验证状态: {verificationStatus}</p>
          </div>
        </div>
        
        {/* 优化的操作指引 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 操作提示：
          </p>
          <ul className="mt-2 text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-4 list-disc">
            {verificationStatus === 'pending' && (
              <>
                <li>请检查您的邮箱，找到重置密码的邮件</li>
                <li>在手机或电脑上点击邮件中的重置链接</li>
                <li>点击链接后，本页面会自动刷新，显示验证成功</li>
              </>
            )}
            {verificationStatus === 'verifying' && (
              <>
                <li>您已经在手机上点击了重置链接</li>
                <li>本页面正在等待验证结果...</li>
                <li>请稍候，系统会自动检测验证状态</li>
              </>
            )}
            {verificationStatus === 'verified' && (
              <>
                <li>验证成功！您可以输入新密码了</li>
                <li>请设置一个安全的新密码（至少6个字符）</li>
                <li>输入密码后，点击重置密码按钮完成重置</li>
              </>
            )}
            {verificationStatus === 'expired' && (
              <>
                <li>重置链接已过期或无效</li>
                <li>请返回登录页面，点击忘记密码重新请求</li>
                <li>重新请求后，您将收到一封新的重置邮件</li>
              </>
            )}
            <li>如果遇到问题，请返回重新请求密码重置</li>
          </ul>
        </div>
      </div>

        {success ? (
          <div className="bg-green-50/80 border border-green-200 rounded-2xl p-8 text-center shadow-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="text-green-600 text-7xl mb-6">🎉</div>
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-3">密码重置成功！</h3>
            <p className="text-green-700 dark:text-green-300 mb-8 text-lg">
              您的密码已成功重置，可以使用新密码登录了
            </p>
            <div className="space-y-4">
              <Link 
                href="/auth/login" 
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                立即登录
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* 确保表单始终可见，添加醒目的视觉设计 */}
            <div className="bg-white/80 dark:bg-gray-800/80 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
              {/* 添加清晰的表单标题 */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">密码输入区域</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">请输入您想要设置的新密码</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <p>无论链接验证状态如何，您都可以尝试输入密码</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="relative group">
                  {/* 添加醒目的标签 */}
                  <label htmlFor="password" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                    新密码 *
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className={`block w-full px-5 py-4 bg-white/90 dark:bg-gray-700/90 border-2 border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.password ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-400 dark:group-hover:border-primary-500'}`}
                    placeholder="请输入新密码（至少6个字符）"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.password.message}</p>
                  )}
                </div>

                <div className="relative group">
                  {/* 添加醒目的标签 */}
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                    确认新密码 *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className={`block w-full px-5 py-4 bg-white/90 dark:bg-gray-700/90 border-2 border-gray-300 dark:border-gray-600 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 backdrop-blur-sm dark:text-white ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'group-hover:border-primary-400 dark:group-hover:border-primary-500'}`}
                    placeholder="请再次输入新密码"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500 pl-1 animate-slide-up">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-sm animate-fade-in dark:bg-red-900/30 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-gray-800 dark:text-gray-300 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all duration-200 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>重置中...</span>
                </div>
              ) : '重置密码'}
            </button>

            <div className="text-center">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-primary-400"
              >
                返回密码重置请求
              </Link>
              <br />
              <Link 
                href="/auth/login" 
                className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors dark:text-gray-400 dark:hover:text-primary-400 mt-1 block"
              >
                返回登录
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
