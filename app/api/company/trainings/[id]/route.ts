import { NextResponse } from 'next/server';

import { renameTraining } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/**
 * Troca a identificação interna da turma. Só esse campo: o título impresso no
 * certificado é outro e não se mexe por aqui.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { internalLabel } = (await request.json()) as { internalLabel?: string };
  if (typeof internalLabel !== 'string') {
    return NextResponse.json({ error: 'Identificação não informada.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await renameTraining({ trainingId: id, internalLabel, byUserId: user.id }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao renomear a turma.' },
      { status: 400 },
    );
  }
}
