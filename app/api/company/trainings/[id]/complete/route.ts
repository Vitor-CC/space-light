import { NextResponse } from 'next/server';

import { completeSessionByAdmin, completeTrainingByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { publishCertificateDocument } from '@/lib/certificate-publish';

/** Mesma conta do encerramento pelo instrutor: um PDF por aluno leva tempo. */
export const maxDuration = 60;

/**
 * A Space fecha a turma inteira ou um dia só (`sessionId`) quando o instrutor
 * não fechou. Sem a foto da lista, o fechamento do último dia é recusado com
 * `needsConfirmation`; quem insiste assume, e a ressalva fica na auditoria.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { semLista, sessionId } = (await request.json().catch(() => ({}))) as {
    semLista?: boolean;
    sessionId?: string;
  };
  try {
    const resultado = sessionId
      ? await completeSessionByAdmin({ trainingId: id, sessionId, byUserId: user.id, semLista })
      : await completeTrainingByAdmin({ trainingId: id, byUserId: user.id, semLista });
    // Dia do meio não fecha a turma: sem certificado a publicar ainda.
    if (!resultado.concluiuAgora && sessionId) {
      return NextResponse.json({
        ok: true,
        turmaConcluida: false,
        certificates: 0,
        listaEnviada: resultado.listaEnviada,
        certificatePublished: false,
        certificateProblem: null,
      });
    }
    const publicacao = await publishCertificateDocument({ trainingId: id, user });
    return NextResponse.json({
      ok: true,
      turmaConcluida: true,
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
