import { NextResponse } from 'next/server';

import {
  removeInstructorAvailability,
  saveInstructorAvailability,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = await request.json() as { availableDate?: string; note?: string };
  try {
    return NextResponse.json(await saveInstructorAvailability({
      instructorId: user.instructor_id,
      userId: user.id,
      availableDate: input.availableDate ?? '',
      note: input.note ?? '',
    }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a disponibilidade.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = await request.json() as { availabilityId?: string };
  if (!input.availabilityId) {
    return NextResponse.json({ error: 'Disponibilidade não informada.' }, { status: 400 });
  }
  await removeInstructorAvailability({
    instructorId: user.instructor_id,
    availabilityId: input.availabilityId,
    userId: user.id,
  });
  return NextResponse.json({ ok: true });
}
