import { NextResponse } from 'next/server';

import { baseDoPedido } from '@/lib/safe-redirect';

import { getCurrentUser } from '@/lib/app-auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/password-auth';

const loginPathForRole: Record<string, string> = {
  admin: '/empresa/login',
  instructor: '/instrutor/login',
  client: '/cliente/login',
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const loginPath = loginPathForRole[user?.role ?? ''] ?? '/cliente/login';
  const response = NextResponse.redirect(
    new URL(`${loginPath}?status=logout`, baseDoPedido(request)),
    303,
  );
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
