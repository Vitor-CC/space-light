import { NextResponse } from 'next/server';

import { saveChecklistTemplate } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A equipe define os itens do checklist de uma norma, um por linha. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { nr, items } = (await request.json().catch(() => ({}))) as { nr?: string; items?: string };
  try {
    return NextResponse.json(await saveChecklistTemplate({ nr: nr ?? '', items: items ?? '', byUserId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar o checklist.' }, { status: 400 });
  }
}
