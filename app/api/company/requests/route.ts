import { NextResponse } from 'next/server';

import { setSiteLeadStatus, setTrainingRequestStatus } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/**
 * A equipe marca a solicitação como agendada, recusada ou em aberto. Vale
 * para o pedido do cliente no portal e, com `origem: 'site'`, para o pedido
 * de proposta do formulário do site.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { requestId, status, origem } = (await request.json().catch(() => ({}))) as { requestId?: string; status?: string; origem?: string };
  if (!requestId || !status) return NextResponse.json({ error: 'Informe a solicitação e a situação.' }, { status: 400 });
  try {
    if (origem === 'site') await setSiteLeadStatus({ leadId: requestId, status, byUserId: user.id });
    else await setTrainingRequestStatus({ requestId, status, byUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar a solicitação.' }, { status: 400 });
  }
}
