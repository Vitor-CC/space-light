import { NextResponse } from 'next/server';

import { createTrainingRequest } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** "Solicitar treinamento": a empresa pede uma nova turma pelo portal. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'client' || !user.client_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json().catch(() => ({}))) as {
    nr?: string;
    title?: string;
    participants?: number;
    preferredPeriod?: string;
    location?: string;
    notes?: string;
    basedOnTrainingId?: string | null;
  };
  try {
    const { id } = await createTrainingRequest({
      clientId: user.client_id,
      userId: user.id,
      nr: input.nr ?? '',
      title: input.title ?? '',
      participants: Number(input.participants ?? 0),
      preferredPeriod: input.preferredPeriod ?? '',
      location: input.location ?? '',
      notes: input.notes ?? '',
      basedOnTrainingId: input.basedOnTrainingId ?? null,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao enviar a solicitação.' }, { status: 400 });
  }
}
