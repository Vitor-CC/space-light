import { NextResponse } from 'next/server';

import { baseDoPedido, redirectInterno } from '@/lib/safe-redirect';

import { selfRegisterInstructor } from '@/db/company-repository';
import { hashPassword } from '@/lib/password-auth';
import { senhaValida } from '@/lib/regras-senha';

function back(request: Request, status: string) {
  return redirectInterno(request, `/instrutor/cadastro?status=${encodeURIComponent(status)}`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('passwordConfirmation') ?? '');
  if (!senhaValida(password)) return back(request, 'weak');
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
      new URL('/instrutor/login?status=registered', baseDoPedido(request)),
      303,
    );
  } catch {
    return back(request, 'exists');
  }
}
