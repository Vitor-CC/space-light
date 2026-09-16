import { NextResponse } from 'next/server';

import { updateUserPassword } from '@/db/company-repository';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';
import { hashPassword } from '@/lib/password-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/entrar', request.url), 303);
  }
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');
  if (password.length < 10 || password !== confirmation) {
    return NextResponse.redirect(
      new URL('/definir-senha?status=invalid', request.url),
      303,
    );
  }
  const credentials = await hashPassword(password);
  await updateUserPassword({ userId: user.id, ...credentials });
  return NextResponse.redirect(
    new URL(portalPathForRole(user.role), request.url),
    303,
  );
}
