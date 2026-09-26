import { NextResponse } from 'next/server';

import { baseDoPedido } from '@/lib/safe-redirect';

import { updateUserPassword } from '@/db/company-repository';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';
import { hashPassword } from '@/lib/password-auth';
import { senhaValida } from '@/lib/regras-senha';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/entrar', baseDoPedido(request)), 303);
  }
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');
  if (!senhaValida(password) || password !== confirmation) {
    return NextResponse.redirect(
      new URL('/definir-senha?status=invalid', baseDoPedido(request)),
      303,
    );
  }
  const credentials = await hashPassword(password);
  await updateUserPassword({ userId: user.id, ...credentials });
  return NextResponse.redirect(
    new URL(portalPathForRole(user.role), baseDoPedido(request)),
    303,
  );
}
