import { NextResponse } from 'next/server';

import { createDocumentRequest } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** "Solicitar documento": o cliente pede um laudo ou outro documento fora de turma. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'client' || !user.client_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json().catch(() => ({}))) as { title?: string; notes?: string };
  try {
    const { id } = await createDocumentRequest({ clientId: user.client_id, userId: user.id, title: input.title ?? '', notes: input.notes ?? '' });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao enviar o pedido.' }, { status: 400 });
  }
}
