import { NextResponse } from 'next/server';
import { findTrainingByToken, registerParticipant } from '@/db/company-repository';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.json({ training: await findTrainingByToken(token) });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const input = await request.json() as { fullName: string; documentId: string; rg?: string; birthDate?: string; email: string; phone: string; jobTitle: string };
  try { return NextResponse.json(await registerParticipant(token, input), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a inscrição.' }, { status: 400 }); }
}
