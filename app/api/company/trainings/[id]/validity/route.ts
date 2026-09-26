import { NextResponse } from 'next/server';

import { setTrainingValidity } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** Validade do certificado da turma, em meses. Só aparece no portal. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { months } = (await request.json().catch(() => ({}))) as { months?: number };
  try {
    await setTrainingValidity({ trainingId: id, months: Number(months ?? 0), byUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar a validade.' }, { status: 400 });
  }
}
