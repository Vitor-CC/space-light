import { NextResponse } from 'next/server';

import { completeTrainingByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { publishCertificateDocument } from '@/lib/certificate-publish';

/** Mesma conta do encerramento pelo instrutor: um PDF por aluno leva tempo. */
export const maxDuration = 60;

/**
 * A Space fecha a turma quando o instrutor não fechou. Sem a foto da lista o
 * primeiro pedido é recusado com `needsConfirmation`; quem insiste assume, e
 * a ressalva fica na auditoria.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { semLista } = (await request.json().catch(() => ({}))) as { semLista?: boolean };
  try {
    const resultado = await completeTrainingByAdmin({ trainingId: id, byUserId: user.id, semLista });
    const publicacao = await publishCertificateDocument({ trainingId: id, user });
    return NextResponse.json({
      ok: true,
      certificates: resultado.certificates,
      listaEnviada: resultado.listaEnviada,
      certificatePublished: publicacao.ok,
      certificateProblem: publicacao.ok ? null : publicacao.reason,
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro ao encerrar o treinamento.';
    if (mensagem === 'SEM_LISTA') {
      return NextResponse.json(
        {
          error: 'A foto da lista de presença assinada ainda não foi enviada por nenhum instrutor.',
          needsConfirmation: true,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: mensagem }, { status: 400 });
  }
}
