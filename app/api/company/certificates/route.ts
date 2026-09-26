import { NextResponse } from 'next/server';

import { getCertificateNoticeInfo, setTrainingValidity } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { publishCertificateDocument } from '@/lib/certificate-publish';
import { isMailerConfigured, sendCertificatesAvailableEmail } from '@/lib/mailer';
import { SITE_URL } from '@/lib/site-url';

/**
 * Cada aluno vira um PDF, e cada PDF embute ~574 KB de imagens do modelo:
 * uma turma de 30 leva perto de 25s.
 */
export const maxDuration = 60;

/**
 * A Space gera (ou regera) os certificados de uma turma — o painel "Emitir
 * certificados". Opcionalmente grava a validade (só portal) e avisa o cliente
 * por e-mail. O certificado continua saindo sozinho no encerramento; esta
 * rota cobre o que falhou, o que faltou e a regeração.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { trainingId, validityMonths, notifyClient } = (await request.json()) as { trainingId?: string; validityMonths?: number; notifyClient?: boolean };
  if (!trainingId) {
    return NextResponse.json({ error: 'Treinamento não informado.' }, { status: 400 });
  }
  try {
    if (validityMonths !== undefined) {
      await setTrainingValidity({ trainingId, months: Number(validityMonths), byUserId: user.id });
    }
    const resultado = await publishCertificateDocument({ trainingId, user });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.reason }, { status: 400 });
    }
    // O aviso é extra: se falhar, os certificados já estão no portal e a
    // resposta diz isso em vez de dar erro.
    let aviso: 'enviado' | 'sem-email' | 'nao-configurado' | 'falhou' | null = null;
    if (notifyClient) {
      if (!isMailerConfigured()) aviso = 'nao-configurado';
      else {
        const info = await getCertificateNoticeInfo(trainingId);
        if (!info?.contact_email) aviso = 'sem-email';
        else {
          try {
            await sendCertificatesAvailableEmail({
              to: info.contact_email,
              contactName: info.contact_name,
              trainingLabel: `${info.nr} · ${info.title}`,
              quantity: Number(info.quantity ?? 0),
              portalLink: `${SITE_URL}/cliente`,
            });
            aviso = 'enviado';
          } catch {
            aviso = 'falhou';
          }
        }
      }
    }
    return NextResponse.json({ ok: true, documents: resultado.documents, aviso });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar os certificados.' },
      { status: 500 },
    );
  }
}
