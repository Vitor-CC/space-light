import { NextResponse } from 'next/server';

import { setAttendanceByInstructor } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** Chamada em campo: presente ou ausente no dia em curso do instrutor. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso restrito ao instrutor da turma.' }, { status: 403 });
  }
  const { id } = await params;
  const input = (await request.json().catch(() => ({}))) as { participantId?: string; present?: boolean };
  if (!input.participantId || typeof input.present !== 'boolean') {
    return NextResponse.json({ error: 'Informe o participante e a presença.' }, { status: 400 });
  }
  try {
    const resultado = await setAttendanceByInstructor({
      instructorId: user.instructor_id,
      trainingId: id,
      participantId: input.participantId,
      present: input.present,
      userId: user.id,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao registrar a chamada.' }, { status: 400 });
  }
}
