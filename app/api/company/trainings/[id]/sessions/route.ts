import { NextResponse } from 'next/server';

import { listTrainingSessions, updateTrainingSession } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A Space escala o instrutor, a data e o horário de um dia do treinamento. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as {
    sessionId?: string;
    instructorId?: string | null;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
  };
  if (!body.sessionId) return NextResponse.json({ error: 'Dia não informado.' }, { status: 400 });
  try {
    await updateTrainingSession({ ...body, sessionId: body.sessionId, trainingId: id, byUserId: user.id });
    return NextResponse.json({ ok: true, sessions: await listTrainingSessions(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar o dia.' },
      { status: 400 },
    );
  }
}
