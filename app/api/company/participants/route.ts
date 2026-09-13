import { NextResponse } from 'next/server';

import { addParticipantByAdmin, removeParticipantByAdmin, updateParticipantByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

type Corpo = {
  trainingId?: string;
  participantId?: string;
  fullName?: string;
  documentId?: string;
  rg?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
};

async function exigirGestao() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return null;
  return user;
}

const semAcesso = () => NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });

function falha(error: unknown, padrao: string) {
  return NextResponse.json({ error: error instanceof Error ? error.message : padrao }, { status: 400 });
}

function dados(corpo: Corpo) {
  return {
    fullName: corpo.fullName ?? '',
    documentId: corpo.documentId ?? '',
    rg: corpo.rg ?? '',
    birthDate: corpo.birthDate ?? '',
    email: corpo.email ?? '',
    phone: corpo.phone ?? '',
    jobTitle: corpo.jobTitle ?? '',
  };
}

/** A gestão inclui um participante na lista de presença de uma turma. */
export async function POST(request: Request) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
  const corpo = (await request.json()) as Corpo;
  if (!corpo.trainingId) return NextResponse.json({ error: 'Treinamento não informado.' }, { status: 400 });
  try {
    return NextResponse.json(
      await addParticipantByAdmin({ trainingId: corpo.trainingId, byUserId: user.id, participant: dados(corpo) }),
      { status: 201 },
    );
  } catch (error) {
    return falha(error, 'Erro ao incluir o participante.');
  }
}

/** A gestão corrige os dados de um participante. */
export async function PATCH(request: Request) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
  const corpo = (await request.json()) as Corpo;
  if (!corpo.participantId) return NextResponse.json({ error: 'Participante não informado.' }, { status: 400 });
  try {
    return NextResponse.json(
      await updateParticipantByAdmin({ participantId: corpo.participantId, byUserId: user.id, participant: dados(corpo) }),
    );
  } catch (error) {
    return falha(error, 'Erro ao salvar o participante.');
  }
}

/** A gestão tira um participante da lista (as presenças dele saem junto). */
export async function DELETE(request: Request) {
  const user = await exigirGestao();
  if (!user) return semAcesso();
  const corpo = (await request.json()) as Corpo;
  if (!corpo.participantId) return NextResponse.json({ error: 'Participante não informado.' }, { status: 400 });
  try {
    return NextResponse.json(await removeParticipantByAdmin({ participantId: corpo.participantId, byUserId: user.id }));
  } catch (error) {
    return falha(error, 'Erro ao remover o participante.');
  }
}
