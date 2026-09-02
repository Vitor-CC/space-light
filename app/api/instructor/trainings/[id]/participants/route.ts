import { NextResponse } from 'next/server';

import { listInstructorTrainingParticipants } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  return NextResponse.json({ participants: await listInstructorTrainingParticipants({
    instructorId: user.instructor_id,
    trainingId: id,
  }) });
}
