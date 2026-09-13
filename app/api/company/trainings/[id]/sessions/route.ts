import { NextResponse } from 'next/server';

import {
  addTrainingDayByAdmin,
  listTrainingSessions,
  removeTrainingDayByAdmin,
  updateTrainingSession,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

async function exigirGestao() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return null;
  return user;
}

const semAcesso = () => NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });

function falha(error: unknown, padrao: string) {
  return NextResponse.json({ error: error instanceof Error ? error.message : padrao }, { status: 400 });
}

/** A Space escala o instrutor, a data e o horário de um dia do treinamento. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
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
    return falha(error, 'Erro ao atualizar o dia.');
  }
}

/** A gestão acrescenta um dia à turma. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
  const { id } = await params;
  const body = (await request.json()) as { date?: string; startTime?: string; endTime?: string; instructorId?: string | null };
  try {
    await addTrainingDayByAdmin({
      trainingId: id,
      byUserId: user.id,
      date: body.date ?? '',
      startTime: body.startTime ?? '',
      endTime: body.endTime ?? '',
      instructorId: body.instructorId || null,
    });
    return NextResponse.json({ ok: true, sessions: await listTrainingSessions(id) }, { status: 201 });
  } catch (error) {
    return falha(error, 'Erro ao acrescentar o dia.');
  }
}

/** A gestão remove um dia da turma; as presenças daquele dia saem junto. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
  const { id } = await params;
  const { sessionId } = (await request.json()) as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: 'Dia não informado.' }, { status: 400 });
  try {
    await removeTrainingDayByAdmin({ trainingId: id, sessionId, byUserId: user.id });
    return NextResponse.json({ ok: true, sessions: await listTrainingSessions(id) });
  } catch (error) {
    return falha(error, 'Erro ao remover o dia.');
  }
}
