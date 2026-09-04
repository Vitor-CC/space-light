import { NextResponse } from 'next/server';

import { consumePasswordResetToken } from '@/db/company-repository';
import { hashPassword, hashResetToken } from '@/lib/password-auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');

  if (!token) {
    return NextResponse.redirect(new URL('/esqueci-senha?status=expired', request.url), 303);
  }
  const back = (status: string) =>
    NextResponse.redirect(
      new URL(`/redefinir-senha?token=${encodeURIComponent(token)}&status=${status}`, request.url),
      303,
    );
  if (password.length < 10 || password !== confirmation) return back('invalid');

  try {
    const credentials = await hashPassword(password);
    await consumePasswordResetToken({
      tokenHash: await hashResetToken(token),
      ...credentials,
    });
    return NextResponse.redirect(new URL('/entrar?status=password-updated', request.url), 303);
  } catch {
    return NextResponse.redirect(new URL('/esqueci-senha?status=expired', request.url), 303);
  }
}
