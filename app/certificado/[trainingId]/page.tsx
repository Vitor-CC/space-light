import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Certificate } from '@/components/certificate';
import { getCertificateData } from '@/db/company-repository';
import { requireUser } from '@/lib/app-auth';
import { TECHNICAL_LEAD } from '@/lib/certificate-config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certificado | Space Light Engenharia',
  robots: { index: false, follow: false },
};

export default async function CertificatePage({ params }: { params: Promise<{ trainingId: string }> }) {
  const user = await requireUser();
  if (user.must_reset) redirect('/definir-senha');
  if (user.role !== 'admin' && user.role !== 'instructor') redirect('/cliente');
  const { trainingId } = await params;
  const data = await getCertificateData({
    trainingId,
    user: { id: user.id, role: user.role, instructor_id: user.instructor_id },
  });
  if (!data) redirect(user.role === 'admin' ? '/empresa' : '/instrutor');

  if (data.participants.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#efefeb] p-8">
        <div className="max-w-lg border-l-4 border-[#f2ad19] bg-white p-6">
          <strong className="text-sm uppercase">Nenhum participante nesta turma</strong>
          <p className="mt-2 text-sm leading-relaxed text-[#666]">
            O certificado é emitido por participante. Registre a presença da turma antes de emitir.
          </p>
        </div>
      </main>
    );
  }

  // Sem o arquivo da assinatura, imprime a linha em branco para assinar à mão
  // em vez de deixar um ícone de imagem quebrada no certificado.
  const assinaturaResponsavel = existsSync(
    path.join(process.cwd(), 'public', TECHNICAL_LEAD.signature),
  )
    ? TECHNICAL_LEAD.signature
    : null;

  return (
    <main className="min-h-screen bg-[#efefeb] p-4 md:p-8">
      <Certificate data={data} technicalLeadSignature={assinaturaResponsavel} />
    </main>
  );
}
