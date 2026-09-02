import { NextResponse } from 'next/server';

import { createInstructorByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = await request.json() as {
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
    professionalRegistry?: string;
    specialties?: string;
    baseCity?: string;
  };
  if (!input.name || !input.document || !input.email || !input.phone || !input.professionalRegistry || !input.specialties || !input.baseCity) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  }
  try {
    const temporaryPassword = generateTemporaryPassword();
    const credentials = await hashPassword(temporaryPassword);
    const result = await createInstructorByAdmin({
      name: input.name,
      document: input.document,
      email: input.email,
      phone: input.phone,
      professionalRegistry: input.professionalRegistry,
      specialties: input.specialties,
      baseCity: input.baseCity,
      createdByUserId: user.id,
      ...credentials,
    });
    return NextResponse.json({ ...result, temporaryPassword }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Já existe um instrutor com este CPF ou e-mail.' }, { status: 409 });
  }
}
