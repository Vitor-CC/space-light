import {
  findInstructorDocumentForUser,
  findTrainingClientId,
  getCertificateData,
  replaceCertificateDocument,
} from '@/db/company-repository';
import type { StoredUser } from '@/db/company-repository';
import { deleteStoredFile, isStorageConfigured, readStoredFile, uploadTrainingFile } from '@/lib/blob-storage';
import { buildCertificatePdf, certificateFileName } from '@/lib/certificate-pdf';
import { certificateSetup } from '@/lib/certificate-config';

/**
 * Gera o PDF dos certificados e arquiva nos documentos do treinamento, de onde
 * a Space e o cliente baixam. Não derruba o encerramento da turma se falhar:
 * o instrutor não pode ficar preso por causa de um PDF.
 */
export async function publishCertificateDocument(input: {
  trainingId: string;
  user: StoredUser;
}): Promise<{ ok: true; fileId: string } | { ok: false; reason: string }> {
  if (!isStorageConfigured()) {
    return { ok: false, reason: 'O armazenamento de arquivos não está configurado.' };
  }

  const data = await getCertificateData({ trainingId: input.trainingId });
  if (!data) return { ok: false, reason: 'Treinamento não encontrado.' };
  if (data.participants.length === 0) {
    return { ok: false, reason: 'A turma não tem participantes na lista de presença.' };
  }
  if (!certificateSetup(data.training.nr)) {
    return { ok: false, reason: `A base legal da ${data.training.nr} ainda não foi cadastrada.` };
  }

  // A assinatura do instrutor vive no Blob, como documento aprovado.
  let instructorSignature: { bytes: Uint8Array; contentType: string } | null = null;
  if (data.instructor.signatureDocumentId) {
    try {
      const documento = await findInstructorDocumentForUser({
        documentId: data.instructor.signatureDocumentId,
        user: input.user,
      });
      if (documento) {
        const guardado = await readStoredFile(documento.object_key);
        if (guardado) {
          const buffer = await new Response(guardado.stream).arrayBuffer();
          instructorSignature = {
            bytes: new Uint8Array(buffer),
            contentType: documento.content_type,
          };
        }
      }
    } catch { instructorSignature = null; }
  }

  const clientId = await findTrainingClientId(input.trainingId);
  if (!clientId) return { ok: false, reason: 'Treinamento sem cliente vinculado.' };

  const pdf = await buildCertificatePdf({ data, instructorSignature });
  const name = certificateFileName(data);
  const fileId = `cert-${input.trainingId}`;

  const { objectKey } = await uploadTrainingFile({
    clientId,
    trainingId: input.trainingId,
    fileId,
    name,
    contentType: 'application/pdf',
    body: pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer,
  });

  const { id, substituidos } = await replaceCertificateDocument({
    trainingId: input.trainingId,
    clientId,
    name,
    objectKey,
    size: pdf.byteLength,
    byUserId: input.user.id,
  });

  for (const antigo of substituidos) {
    if (antigo === objectKey) continue;
    try { await deleteStoredFile(antigo); } catch { /* órfão é melhor que perder o novo */ }
  }

  return { ok: true, fileId: id };
}
