import { NextResponse } from 'next/server';

import { setDocumentRequestStatus } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A equipe muda a situação de um pedido de documento (ex.: não atendido). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };
  try {
    return NextResponse.json(await setDocumentRequestStatus({ requestId: id, status: status ?? '', byUserId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar o pedido.' }, { status: 400 });
  }
}
