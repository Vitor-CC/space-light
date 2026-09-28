import { NextResponse } from 'next/server';

import { setTrainingChecklistItem } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A equipe marca ou desmarca um item do checklist da turma. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  const { item, done } = (await request.json().catch(() => ({}))) as { item?: string; done?: boolean };
  try {
    return NextResponse.json(await setTrainingChecklistItem({ trainingId: id, item: item ?? '', done: Boolean(done), byUserId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao marcar o item.' }, { status: 400 });
  }
}
