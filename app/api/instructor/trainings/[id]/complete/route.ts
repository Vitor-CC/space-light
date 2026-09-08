import { NextResponse } from 'next/server';

import { completeInstructorTraining } from '@/db/company-repository';
import { publishCertificateDocument } from '@/lib/certificate-publish';
import { getCurrentUser } from '@/lib/app-auth';

/**
 * Cada aluno vira um PDF, e cada PDF embute ~574 KB de imagens do modelo:
 * uma turma de 30 leva perto de 25s. O padrão da Vercel corta antes disso.
 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const resultado = await completeInstructorTraining({
      instructorId: user.instructor_id,
      trainingId: id,
      userId: user.id,
    });
    // O PDF vai para os documentos da turma. Falhar aqui não desfaz o
    // encerramento — a Space pode republicar pela aba Certificados.
    const publicacao = await publishCertificateDocument({ trainingId: id, user });
    return NextResponse.json({
      ...resultado,
      certificatePublished: publicacao.ok,
      certificateProblem: publicacao.ok ? null : publicacao.reason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível encerrar o treinamento.' },
      { status: 400 },
    );
  }
}
