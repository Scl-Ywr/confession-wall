'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const RegisterRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    // 重定向到正确的注册页面
    router.replace('/auth/register');
  }, [router]);

  return null;
};

export default RegisterRedirectPage;
