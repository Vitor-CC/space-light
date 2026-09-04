import {
  findInstructorDocumentForUser,
  findTrainingClientId,
  getCertificateData,
  replaceCertificateDocument,
} from '@/db/company-repository';
import type { CertificateData, StoredUser } from '@/db/company-repository';
import { deleteStoredFile, isStorageConfigured, readStoredFile, uploadTrainingFile } from '@/lib/blob-storage';
import { attestationFileName, buildAttestationPdf } from '@/lib/attestation-pdf';
import {
  buildCertificatePdf,
  buildCompanyCertificatePdf,
  certificateFileName,
  companyCertificateFileName,
} from '@/lib/certificate-pdf';
import { certificateSetup } from '@/lib/certificate-config';

type Assinatura = { bytes: Uint8Array; contentType: string } | null;

/** A assinatura do instrutor vive no Blob, como documento aprovado. */
async function lerAssinaturaDoInstrutor(data: CertificateData, user: StoredUser): Promise<Assinatura> {
  if (!data.instructor.signatureDocumentId) return null;
  try {
    const documento = await findInstructorDocumentForUser({
      documentId: data.instructor.signatureDocumentId,
      user,
    });
    if (!documento) return null;
    const guardado = await readStoredFile(documento.object_key);
    if (!guardado) return null;
    const buffer = await new Response(guardado.stream).arrayBuffer();
    return { bytes: new Uint8Array(buffer), contentType: documento.content_type };
  } catch {
    return null;
  }
}

function paraArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export type PublishedDocument = { name: string; fileId: string };

/**
 * Gera os documentos da turma e arquiva nos documentos do treinamento, de onde
 * a Space e o cliente baixam. Não derruba o encerramento da turma se falhar:
 * o instrutor não pode ficar preso por causa de um PDF.
 */
export async function publishCertificateDocument(input: {
  trainingId: string;
  user: StoredUser;
}): Promise<{ ok: true; documents: PublishedDocument[] } | { ok: false; reason: string }> {
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

  const clientId = await findTrainingClientId(input.trainingId);
  if (!clientId) return { ok: false, reason: 'Treinamento sem cliente vinculado.' };

  const instructorSignature = await lerAssinaturaDoInstrutor(data, input.user);

  const documentos: { nome: string; bytes: Uint8Array }[] = [
    { nome: certificateFileName(data), bytes: await buildCertificatePdf({ data, instructorSignature }) },
    { nome: companyCertificateFileName(data), bytes: await buildCompanyCertificatePdf({ data, instructorSignature }) },
    { nome: attestationFileName(data), bytes: await buildAttestationPdf({ data, instructorSignature }) },
  ];

  const publicados: PublishedDocument[] = [];
  for (const [indice, documento] of documentos.entries()) {
    const { objectKey } = await uploadTrainingFile({
      clientId,
      trainingId: input.trainingId,
      fileId: `doc-${indice}-${input.trainingId}`,
      name: documento.nome,
      contentType: 'application/pdf',
      body: paraArrayBuffer(documento.bytes),
    });
    const { id, substituidos } = await replaceCertificateDocument({
      trainingId: input.trainingId,
      clientId,
      name: documento.nome,
      objectKey,
      size: documento.bytes.byteLength,
      byUserId: input.user.id,
    });
    for (const antigo of substituidos) {
      if (antigo === objectKey) continue;
      try { await deleteStoredFile(antigo); } catch { /* órfão é melhor que perder o novo */ }
    }
    publicados.push({ name: documento.nome, fileId: id });
  }

  return { ok: true, documents: publicados };
}
