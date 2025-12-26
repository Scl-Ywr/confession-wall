import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setCSRFCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/'
  });
}

export async function getCSRFCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

export function validateCSRFToken(token: string, cookieToken?: string): boolean {
  if (!token || !cookieToken) {
    return false;
  }

  if (token !== cookieToken) {
    return false;
  }

  return true;
}

export function getCSRFTokenFromRequest(request: Request): string | undefined {
  return request.headers.get(CSRF_HEADER_NAME) || undefined;
}

export async function verifyCSRF(request: Request): Promise<boolean> {
  const token = getCSRFTokenFromRequest(request);
  const cookieToken = await getCSRFCookie();

  return validateCSRFToken(token || '', cookieToken || '');
}

export async function requireCSRF(request: Request): Promise<void> {
  const token = getCSRFTokenFromRequest(request);
  const cookieToken = await getCSRFCookie();

  if (!validateCSRFToken(token || '', cookieToken || '')) {
    throw new Error('Invalid CSRF token');
  }
}
