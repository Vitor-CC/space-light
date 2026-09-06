import { NextResponse } from 'next/server';

import { redirectInterno } from '@/lib/safe-redirect';

import { selfRegisterClient } from '@/db/company-repository';
import { hashPassword } from '@/lib/password-auth';

function back(request: Request, status: string) {
  return redirectInterno(request, `/cliente/cadastro?status=${encodeURIComponent(status)}`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');
  if (password.length < 10) return back(request, 'weak');
  if (password !== confirmation) return back(request, 'mismatch');

  const input = {
    companyName: String(form.get('companyName') ?? '').trim(),
    legalName: String(form.get('legalName') ?? '').trim(),
    document: String(form.get('document') ?? '').trim(),
    unit: String(form.get('unit') ?? '').trim(),
    contactName: String(form.get('contactName') ?? '').trim(),
    email: String(form.get('email') ?? '').trim().toLowerCase(),
    phone: String(form.get('phone') ?? '').trim(),
  };
  if (Object.values(input).some((value) => !value)) return back(request, 'required');

  try {
    const credentials = await hashPassword(password);
    await selfRegisterClient({ ...input, ...credentials });
    return NextResponse.redirect(
      new URL('/cliente/login?status=registered', request.url),
      303,
    );
  } catch {
    return back(request, 'exists');
  }
}
