/**
 * Armazenamento dos arquivos em disco.
 *
 * Antes isto era o Vercel Blob. Saiu porque o store foi suspenso por limite do
 * plano gratuito e levou junto a LEITURA — cliente e instrutor ficaram sem
 * conseguir baixar documento nenhum, e 515 MB de originais ficaram inacessíveis.
 * Em disco próprio isso não acontece: o limite é o disco, que a gente enxerga.
 *
 * O formato da chave (`treinamentos/<cliente>/<turma>/<arquivo>.<ext>`) é o
 * mesmo de antes de propósito: as 1.358 linhas de `files` que já existem
 * continuam apontando para o lugar certo, sem migração de dados.
 */
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Onde os arquivos moram. No servidor fica fora de /opt/space-light de
 * propósito: deploy troca a aplicação inteira, e os arquivos não podem ir junto.
 */
function raiz() {
  const configurada = process.env.ARQUIVOS_DIR?.trim();
  return path.resolve(configurada || path.join(process.cwd(), 'data', 'arquivos'));
}

// Limite e tipos aceitos moram em `upload-limites.ts`, que a tela também
// importa — este arquivo usa `node:fs` e não pode ir para o navegador.
// Reexportados aqui para quem já importava daqui não ter de mudar.
export {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_PHOTO_TYPES,
  LIMITE_UPLOAD_LABEL,
  MAX_UPLOAD_BYTES,
} from '@/lib/upload-limites';

/** Disco sempre existe; a pasta é criada na primeira gravação. */
export function isStorageConfigured() {
  return true;
}

/**
 * Caminho real de uma chave, recusando qualquer uma que escape da pasta.
 * As chaves são geradas aqui, mas `readStoredFile` recebe o que está gravado
 * no banco — e ler arquivo do servidor a partir de dado guardado é exatamente
 * o tipo de coisa que não se deixa sem trava.
 */
function caminhoDe(objectKey: string) {
  const base = raiz();
  const destino = path.resolve(base, objectKey);
  if (destino !== base && !destino.startsWith(base + path.sep)) {
    throw new Error('Caminho de arquivo inválido.');
  }
  return destino;
}

function extensionFor(name: string, contentType: string) {
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return `.${fromName.toLowerCase()}`;
  if (contentType === 'application/pdf') return '.pdf';
  return `.${(contentType.split('/')[1] ?? 'bin').replace(/[^a-z0-9]/gi, '')}`;
}

async function gravar(objectKey: string, body: ArrayBuffer) {
  const destino = caminhoDe(objectKey);
  await mkdir(path.dirname(destino), { recursive: true });
  // Sobrescreve sem reclamar: "Gerar de novo" regrava o mesmo caminho, e era
  // justamente aí que o Blob quebrava até ganhar allowOverwrite.
  await writeFile(destino, Buffer.from(body));
  return { objectKey };
}

/** Guarda o arquivo da turma e devolve a chave, que vai para `files.object_key`. */
export async function uploadTrainingFile(input: {
  clientId: string;
  trainingId: string;
  fileId: string;
  name: string;
  contentType: string;
  body: ArrayBuffer;
}) {
  const pathname = `treinamentos/${input.clientId}/${input.trainingId}/${input.fileId}${extensionFor(input.name, input.contentType)}`;
  return gravar(pathname, input.body);
}

/** Documento avulso do cliente (laudo etc.): fora das turmas, na pasta do cliente. */
export async function uploadClientDocument(input: {
  clientId: string;
  documentId: string;
  name: string;
  contentType: string;
  body: ArrayBuffer;
}) {
  const pathname = `clientes/${input.clientId}/documentos/${input.documentId}${extensionFor(input.name, input.contentType)}`;
  return gravar(pathname, input.body);
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
  return gravar(pathname, input.body);
}

/**
 * Devolve o conteúdo em stream, ou null quando o arquivo não está no disco.
 * Null em vez de erro porque a rota já trata "não encontrado" como 404 — e
 * arquivo faltando é caso esperado: as 1.358 linhas herdadas do Vercel Blob
 * apontam para conteúdo que ficou lá.
 */
export async function readStoredFile(objectKey: string) {
  let destino: string;
  try {
    destino = caminhoDe(objectKey);
  } catch {
    return null;
  }
  try {
    const info = await stat(destino);
    if (!info.isFile()) return null;
  } catch {
    return null;
  }
  return {
    stream: Readable.toWeb(createReadStream(destino)) as ReadableStream,
    size: (await stat(destino)).size,
  };
}

export async function deleteStoredFile(objectKey: string) {
  try {
    await unlink(caminhoDe(objectKey));
  } catch (error) {
    // Arquivo já ausente não é falha: a rota de exclusão apaga o conteúdo antes
    // da linha, e repetir a operação tem de ser inofensivo.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/**
 * Foto de perfil ou logo, já tratada (quadrada, 256 px, WebP). O nome leva um
 * sufixo aleatório: a foto nova tem endereço novo, e o cache não segura a velha.
 */
export async function uploadProfilePhoto(input: { tipo: string; id: string; body: ArrayBuffer }) {
  const pathname = `fotos/${input.tipo}/${input.id}-${crypto.randomUUID().slice(0, 8)}.webp`;
  return gravar(pathname, input.body);
}
