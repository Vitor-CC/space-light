import { NextResponse } from 'next/server';
import { CheckinBloqueadoError, checkinParticipant, findTrainingByToken, listTrainingSessions, registerParticipant } from '@/db/company-repository';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const training = await findTrainingByToken(token);
  if (!training) return NextResponse.json({ training: null });
  // Data e horário de cada dia, para o formulário mostrar o dia do check-in.
  // O nome do instrutor não precisa sair numa página pública.
  const sessions = (await listTrainingSessions(training.id)).map((dia) => ({ ...dia, instructor_id: null, instructor_name: null }));
  return NextResponse.json({ training: { ...training, sessions } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const input = await request.json() as { fullName: string; documentId: string; rg?: string; birthDate?: string; email: string; phone: string; jobTitle: string; checkinOnly?: boolean };
  try {
    // Dias seguintes ao 1º: só o CPF basta para marcar a presença.
    if (input.checkinOnly) return NextResponse.json(await checkinParticipant(token, input.documentId ?? ''));
    return NextResponse.json(await registerParticipant(token, input), { status: 201 });
  }
  catch (error) {
    // 403: faltou um dia anterior e a turma segue sem ele (nada foi gravado).
    const bloqueado = error instanceof CheckinBloqueadoError;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a inscrição.', blocked: bloqueado }, { status: bloqueado ? 403 : 400 });
  }
}
