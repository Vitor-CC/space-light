import { NextResponse } from 'next/server';

import { redirectInterno } from '@/lib/safe-redirect';

import { selfRegisterInstructor } from '@/db/company-repository';
import { hashPassword } from '@/lib/password-auth';

function back(request: Request, status: string) {
  return redirectInterno(request, `/instrutor/cadastro?status=${encodeURIComponent(status)}`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');
  if (password.length < 10) return back(request, 'weak');
  if (password !== confirmation) return back(request, 'mismatch');

  const input = {
    name: String(form.get('name') ?? '').trim(),
    document: String(form.get('document') ?? '').trim(),
    email: String(form.get('email') ?? '').trim().toLowerCase(),
    phone: String(form.get('phone') ?? '').trim(),
    professionalRegistry: String(form.get('professionalRegistry') ?? '').trim(),
    specialties: String(form.get('specialties') ?? '').trim(),
    baseCity: String(form.get('baseCity') ?? '').trim(),
  };
  if (Object.values(input).some((value) => !value)) return back(request, 'required');

  try {
    const credentials = await hashPassword(password);
    await selfRegisterInstructor({ ...input, ...credentials });
    return NextResponse.redirect(
      new URL('/instrutor/login?status=registered', request.url),
      303,
    );
  } catch {
    return back(request, 'exists');
  }
}
