import { NextResponse } from 'next/server';
import { CheckinBloqueadoError, checkinParticipant, findTrainingByToken, registerParticipant } from '@/db/company-repository';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.json({ training: await findTrainingByToken(token) });
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
