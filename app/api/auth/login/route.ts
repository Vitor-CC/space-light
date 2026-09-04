import { NextResponse } from 'next/server';

import { getAuthEnvironment } from '@/db';
import {
  bootstrapAdmin,
  findUserByEmail,
  recordLogin,
} from '@/db/company-repository';
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/password-auth';
import { portalPathForRole } from '@/lib/app-auth';

function destination(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const requestedPath = String(form.get('loginPath') ?? '');
  const loginPath = requestedPath === '/instrutor/login' || requestedPath === '/empresa/login'
    ? requestedPath
    : '/cliente/login';
  const back = (status: string) => `${loginPath}?status=${status}`;
  if (!email || !password) return destination(request, back('invalid'));

  let user = await findUserByEmail(email);
  const initial = getAuthEnvironment();
  if (!user && email === initial.initialAdminEmail) {
    const matches = await verifyPassword(
      password,
      initial.initialAdminPasswordHash,
      initial.initialAdminPasswordSalt,
    );
    if (matches) {
      try {
        user = await bootstrapAdmin({
          email,
          passwordHash: initial.initialAdminPasswordHash,
          passwordSalt: initial.initialAdminPasswordSalt,
        });
      } catch {
        user = await findUserByEmail(email);
      }
    }
  }

  if (!user) return destination(request, back('invalid'));
  if (!user.active) return destination(request, back('pending'));
  if (!(await verifyPassword(password, user.password_hash, user.password_salt))) {
    return destination(request, back('invalid'));
  }

  await recordLogin(user.id);
  const path = user.must_reset
    ? '/definir-senha'
    : portalPathForRole(user.role);
  const response = destination(request, path);
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(user.id),
    sessionCookieOptions,
  );
  return response;
}
