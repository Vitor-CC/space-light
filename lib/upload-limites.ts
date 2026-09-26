/**
 * Limite e tipos aceitos no envio de arquivos.
 *
 * Mora fora de `blob-storage.ts` porque aquele arquivo importa `node:fs` e não
 * pode ser carregado pelo navegador. Aqui não há nada de servidor, então a
 * tela lê o mesmo número que a API usa para recusar — antes o limite estava
 * escrito à mão em cinco textos diferentes, e todos ficaram defasados quando
 * ele mudou.
 */

/**
 * 25 MB por arquivo. Eram 4 MB enquanto o portal rodava na Vercel, porque uma
 * função dela aceitava no máximo 4,5 MB por requisição. Em servidor próprio
 * esse teto não existe; o valor agora é escolhido pelo uso real — foto de
 * celular de lista assinada passa longe de 25 MB, mesmo em 48 MP.
 *
 * Quem recusa é o portal, não o proxy: o Caddy aceita um pouco mais, para o
 * usuário receber a mensagem da tela em vez de um erro cru de servidor.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** O limite como as telas escrevem: "25 MB". */
export const LIMITE_UPLOAD_LABEL = `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;

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
