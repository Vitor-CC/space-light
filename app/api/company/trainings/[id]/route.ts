import { NextResponse } from 'next/server';

import { renameTraining, updateTrainingByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

type Detalhes = { clientId?: string; nr?: string; title?: string; duration?: string; location?: string; contentProgram?: string; theme?: string };

/**
 * `internalLabel` troca só a identificação interna da turma. `details` é a
 * edição completa pela gestão: cliente, norma, título do certificado, carga
 * horária, endereço e conteúdo programático.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { internalLabel, details } = (await request.json()) as { internalLabel?: string; details?: Detalhes };
  try {
    if (details) {
      return NextResponse.json(await updateTrainingByAdmin({
        trainingId: id,
        byUserId: user.id,
        clientId: details.clientId ?? '',
        nr: details.nr ?? '',
        title: details.title ?? '',
        duration: details.duration ?? '',
        location: details.location ?? '',
        contentProgram: details.contentProgram ?? '',
        theme: details.theme ?? '',
      }));
    }
    if (typeof internalLabel !== 'string') {
      return NextResponse.json({ error: 'Identificação não informada.' }, { status: 400 });
    }
    return NextResponse.json(await renameTraining({ trainingId: id, internalLabel, byUserId: user.id }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar o treinamento.' },
      { status: 400 },
    );
  }
}
