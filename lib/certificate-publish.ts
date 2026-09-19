import { createHash } from 'node:crypto';

import {
  findInstructorDocumentForUser,
  deleteFileRow,
  findTrainingClientId,
  listTrainingFiles,
  getCertificateData,
  replaceCertificateDocument,
} from '@/db/company-repository';
import type { CertificateData, StoredUser } from '@/db/company-repository';
import { deleteStoredFile, isStorageConfigured, readStoredFile, uploadTrainingFile } from '@/lib/blob-storage';
import { attestationFileName, buildAttestationPdf } from '@/lib/attestation-pdf';
import {
  buildCertificatePdf,
  buildCompanyCertificatePdf,
  PREFIXO_CERTIFICADO_ALUNO,
  certificateFileName,
  companyCertificateFileName,
} from '@/lib/certificate-pdf';
import { certificateSetup } from '@/lib/certificate-config';
import { prepararAssinatura } from '@/lib/signature-image';

type Assinatura = { bytes: Uint8Array; contentType: string } | null;

/**
 * Caminho do PDF no Blob, derivado do NOME do documento.
 *
 * Já foi derivado da posição na lista (`doc-0`, `doc-1`), e isso quebrava o
 * "gerar de novo": a linha em `files` é substituída pelo nome, então bastava
 * alguém entrar ou sair da lista — que sai em ordem alfabética — para o índice
 * passar a ser de outro documento, e a inserção esbarrar no índice único de
 * `files.object_key`. Pelo nome, cada documento tem sempre o mesmo caminho.
 */
export function chaveDoDocumento(nome: string) {
  const legivel = nome
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const digest = createHash('sha256').update(nome).digest('hex').slice(0, 8);
  return `${legivel}-${digest}`;
}

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
    // Recorta a margem e normaliza para PNG uma vez só: os três documentos
    // reaproveitam o mesmo resultado.
    return prepararAssinatura(new Uint8Array(buffer), documento.content_type);
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
    return {
      ok: false,
      reason: data.participantsCertifiedElsewhere > 0
        ? 'Os participantes com todos os dias cumpridos se certificam na turma em que fizeram o último dia.'
        : data.participantsWithMissingDays > 0
          ? 'Nenhum participante tem presença (check-in) em todos os dias do treinamento.'
          : 'A turma não tem participantes na lista de presença.',
    };
  }
  if (!certificateSetup(data.training.nr)) {
    return { ok: false, reason: `A base legal da ${data.training.nr} ainda não foi cadastrada.` };
  }

  const clientId = await findTrainingClientId(input.trainingId);
  if (!clientId) return { ok: false, reason: 'Treinamento sem cliente vinculado.' };

  const instructorSignature = await lerAssinaturaDoInstrutor(data, input.user);

  // Um certificado por aluno. Cada PDF leva só a página daquela pessoa, mais o
  // conteúdo programático — é o documento que ela recebe na mão.
  const documentos: { nome: string; bytes: Uint8Array }[] = [];
  for (const participante of data.participants) {
    documentos.push({
      nome: certificateFileName(data, participante),
      bytes: await buildCertificatePdf({
        data: { ...data, participants: [participante] },
        instructorSignature,
      }),
    });
  }
  documentos.push({
    nome: companyCertificateFileName(data),
    bytes: await buildCompanyCertificatePdf({ data, instructorSignature }),
  });
  // Só a norma com texto de atestado cadastrado gera a peça do Corpo de
  // Bombeiros; as demais entregam apenas os certificados.
  if (certificateSetup(data.training.nr)?.attestationSubject) {
    documentos.push({
      nome: attestationFileName(data),
      bytes: await buildAttestationPdf({ data, instructorSignature }),
    });
  }

  const publicados: PublishedDocument[] = [];
  for (const documento of documentos) {
    const { objectKey } = await uploadTrainingFile({
      clientId,
      trainingId: input.trainingId,
      fileId: chaveDoDocumento(documento.nome),
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

  // Quem saiu da lista de presença não pode continuar com certificado guardado
  // na turma. Também recolhe o arquivo único do formato antigo, de quando todos
  // os alunos vinham num PDF só.
  const emitidos = new Set(publicados.map((item) => item.name));
  for (const arquivo of await listTrainingFiles(input.trainingId)) {
    const ehCertificadoDeAluno =
      arquivo.name.startsWith(PREFIXO_CERTIFICADO_ALUNO) || arquivo.name.startsWith('certificados-');
    if (arquivo.kind !== 'document' || !ehCertificadoDeAluno || emitidos.has(arquivo.name)) continue;
    try {
      await deleteFileRow({ fileId: arquivo.id, byUserId: input.user.id });
      await deleteStoredFile(arquivo.object_key);
    } catch { /* deixar sobrando é melhor que derrubar a emissão inteira */ }
  }

  return { ok: true, documents: publicados };
}
