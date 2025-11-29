import { Suspense } from 'react';

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">正在加载...</div>}>
      {children}
    </Suspense>
  );
}