import { NextResponse } from 'next/server';

import { saveProgramTemplate } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A equipe salva o conteúdo programático como padrão da norma, para as próximas turmas. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { nr, content } = (await request.json().catch(() => ({}))) as { nr?: string; content?: string };
  try {
    return NextResponse.json(await saveProgramTemplate({ nr: nr ?? '', content: content ?? '', byUserId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar o conteúdo padrão.' }, { status: 400 });
  }
}
