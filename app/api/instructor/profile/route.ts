import { NextResponse } from 'next/server';

import { updateInstructorProfile } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json()) as {
    name?: string; phone?: string; professionalRegistry?: string; specialties?: string; baseCity?: string;
  };
  try {
    await updateInstructorProfile({
      instructorId: user.instructor_id,
      userId: user.id,
      name: input.name ?? '',
      phone: input.phone ?? '',
      professionalRegistry: input.professionalRegistry ?? '',
      specialties: input.specialties ?? '',
      baseCity: input.baseCity ?? '',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar o cadastro.' },
      { status: 400 },
    );
  }
}
