import { NextResponse } from 'next/server';
import { createTraining, deleteTrainingByAdmin } from '@/db/company-repository';
import type { NovoDiaDeTreinamento } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = await request.json() as { clientId: string; nr: string; title: string; internalLabel?: string; days: NovoDiaDeTreinamento[]; contentProgram: string; duration: string; location: string };
  try { return NextResponse.json(await createTraining({ ...input, createdByUserId: user.id }), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar treinamento.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { trainingId } = await request.json() as { trainingId?: string };
  if (!trainingId) return NextResponse.json({ error: 'Treinamento não informado.' }, { status: 400 });
  try { await deleteTrainingByAdmin({ trainingId, byUserId: user.id }); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao excluir treinamento.' }, { status: 400 }); }
}
