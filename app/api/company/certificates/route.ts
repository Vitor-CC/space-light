import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/app-auth';
import { publishCertificateDocument } from '@/lib/certificate-publish';

/**
 * Cada aluno vira um PDF, e cada PDF embute ~574 KB de imagens do modelo:
 * uma turma de 30 leva perto de 25s. O padrão da Vercel corta antes disso.
 */
export const maxDuration = 60;

/** A Space gera (ou regera) o PDF de certificados de uma turma. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { trainingId } = (await request.json()) as { trainingId?: string };
  if (!trainingId) {
    return NextResponse.json({ error: 'Treinamento não informado.' }, { status: 400 });
  }
  try {
    const resultado = await publishCertificateDocument({ trainingId, user });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true, documents: resultado.documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar os certificados.' },
      { status: 500 },
    );
  }
}
