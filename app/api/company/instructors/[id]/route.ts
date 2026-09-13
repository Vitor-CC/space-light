import { NextResponse } from 'next/server';

import { updateInstructorByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

type Corpo = Partial<Record<'name' | 'document' | 'email' | 'phone' | 'professionalRegistry' | 'specialties' | 'baseCity', string>>;

/** A gestão edita qualquer dado do instrutor, inclusive o e-mail de login. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const corpo = (await request.json()) as Corpo;
  try {
    return NextResponse.json(await updateInstructorByAdmin({
      instructorId: id,
      byUserId: user.id,
      name: corpo.name ?? '',
      document: corpo.document ?? '',
      email: corpo.email ?? '',
      phone: corpo.phone ?? '',
      professionalRegistry: corpo.professionalRegistry ?? '',
      specialties: corpo.specialties ?? '',
      baseCity: corpo.baseCity ?? '',
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar os dados do instrutor.' },
      { status: 400 },
    );
  }
}
