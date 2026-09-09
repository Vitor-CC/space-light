import { del, get, put } from '@vercel/blob';

// Teto real do que passa por uma função da Vercel: 4,5 MB por requisição.
// Ficamos abaixo disso de propósito, para o erro nunca virar um 413 cru.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

export function isStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function requireToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'O armazenamento de arquivos ainda não foi configurado (BLOB_READ_WRITE_TOKEN ausente).',
    );
  }
  return token;
}

function extensionFor(name: string, contentType: string) {
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return `.${fromName.toLowerCase()}`;
  if (contentType === 'application/pdf') return '.pdf';
  return `.${(contentType.split('/')[1] ?? 'bin').replace(/[^a-z0-9]/gi, '')}`;
}

/**
 * Guarda o arquivo no Vercel Blob e devolve o pathname, que é o que
 * gravamos em `files.object_key`. O store é privado: a leitura sempre
 * passa por `readStoredFile`, nunca por URL direta.
 */
export async function uploadTrainingFile(input: {
  clientId: string;
  trainingId: string;
  fileId: string;
  name: string;
  contentType: string;
  body: ArrayBuffer;
}) {
  const pathname = `treinamentos/${input.clientId}/${input.trainingId}/${input.fileId}${extensionFor(input.name, input.contentType)}`;
  const result = await put(pathname, input.body, {
    access: 'private',
    contentType: input.contentType,
    addRandomSuffix: false,
    // O caminho é determinístico de propósito. Sem isto, "Gerar de novo" quebra
    // na segunda emissão: o Blob recusa gravar por cima de um caminho existente.
    allowOverwrite: true,
    token: requireToken(),
  });
  return { objectKey: result.pathname };
}

export async function readStoredFile(objectKey: string) {
  return get(objectKey, { access: 'private', token: requireToken() });
}

export async function deleteStoredFile(objectKey: string) {
  await del(objectKey, { token: requireToken() });
}

/** Documento pessoal do instrutor: caminho próprio, fora da pasta dos treinamentos. */
export async function uploadInstructorFile(input: {
  instructorId: string;
  documentId: string;
  category: string;
  name: string;
  contentType: string;
  body: ArrayBuffer;
}) {
  const pathname = `instrutores/${input.instructorId}/${input.category}-${input.documentId}${extensionFor(input.name, input.contentType)}`;
  const result = await put(pathname, input.body, {
    access: 'private',
    contentType: input.contentType,
    addRandomSuffix: false,
    // O caminho é determinístico de propósito. Sem isto, "Gerar de novo" quebra
    // na segunda emissão: o Blob recusa gravar por cima de um caminho existente.
    allowOverwrite: true,
    token: requireToken(),
  });
  return { objectKey: result.pathname };
}
