import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: '验证码不能为空' },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 检查是否使用测试密钥
    const isTestToken = token.startsWith('test_token_') || 
                        token === '1x00000000000000000000AA' ||
                        token === 'XXXX.DUMMY.TOKEN.XXXX';

    if (!secretKey) {
      console.warn('TURNSTILE_SECRET_KEY not configured');

      // 开发模式或测试 token 时跳过验证
      if (isDevelopment || isTestToken) {
        console.log('开发模式或测试Token：跳过 Turnstile 后端验证');
        return NextResponse.json({
          success: true,
          warning: 'Validation skipped - no secret key configured'
        });
      }

      return NextResponse.json(
        { success: false, error: '验证服务配置错误，请联系管理员' },
        { status: 500 }
      );
    }

    // 调用Cloudflare API验证token
    const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    // 可选：添加用户IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('cf-connecting-ip') ||
                     'unknown';
    formData.append('remoteip', clientIp);

    const verifyResponse = await fetch(verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!verifyResponse.ok) {
      console.error('Turnstile API error:', verifyResponse.status, verifyResponse.statusText);
      return NextResponse.json(
        { success: false, error: '验证服务暂时不可用，请稍后重试' },
        { status: 503 }
      );
    }

    const result = await verifyResponse.json();

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      const errorCodes = result['error-codes'] || [];
      console.error('Turnstile verification failed:', errorCodes);
      
      // 根据错误码提供更友好的错误信息
      let errorMessage = '验证失败，请重试';
      if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = '验证已过期或重复使用，请刷新页面重新验证';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = '验证码无效，请重新验证';
      } else if (errorCodes.includes('invalid-input-secret')) {
        errorMessage = '验证服务配置错误，请联系管理员';
      } else if (errorCodes.includes('bad-request')) {
        errorMessage = '验证请求格式错误，请刷新页面重试';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: isDevelopment ? errorCodes : undefined
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { success: false, error: '验证服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}