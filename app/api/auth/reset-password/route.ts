import { NextResponse } from 'next/server';

import { baseDoPedido } from '@/lib/safe-redirect';

import { consumePasswordResetToken } from '@/db/company-repository';
import { hashPassword, hashResetToken } from '@/lib/password-auth';
import { senhaValida } from '@/lib/regras-senha';

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');

  if (!token) {
    return NextResponse.redirect(new URL('/esqueci-senha?status=expired', baseDoPedido(request)), 303);
  }
  const back = (status: string) =>
    NextResponse.redirect(
      new URL(`/redefinir-senha?token=${encodeURIComponent(token)}&status=${status}`, baseDoPedido(request)),
      303,
    );
  if (!senhaValida(password) || password !== confirmation) return back('invalid');

  try {
    const credentials = await hashPassword(password);
    await consumePasswordResetToken({
      tokenHash: await hashResetToken(token),
      ...credentials,
    });
    return NextResponse.redirect(new URL('/entrar?status=password-updated', baseDoPedido(request)), 303);
  } catch {
    return NextResponse.redirect(new URL('/esqueci-senha?status=expired', baseDoPedido(request)), 303);
  }
}
