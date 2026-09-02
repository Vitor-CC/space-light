import { NextResponse } from 'next/server';
import { createTraining } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = await request.json() as { clientId: string; instructorId: string; nr: string; title: string; trainingDate: string; duration: string; location: string; participantLimit: number };
  try { return NextResponse.json(await createTraining({ ...input, createdByUserId: user.id }), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar treinamento.' }, { status: 400 }); }
}
