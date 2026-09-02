import { NextResponse } from 'next/server';

import { startInstructorTraining } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  try {
    return NextResponse.json(await startInstructorTraining({
      instructorId: user.instructor_id,
      trainingId: id,
      userId: user.id,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível iniciar o treinamento.' }, { status: 400 });
  }
}
