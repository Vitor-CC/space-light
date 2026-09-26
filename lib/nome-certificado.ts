/**
 * Nome do arquivo do certificado individual. Fica fora de certificate-pdf.ts
 * (que carrega pdf-lib e fontes) para o portal achar o PDF de cada aluno sem
 * puxar o gerador. certificate-pdf.ts usa estas mesmas funções: um nome só.
 */

export const PREFIXO_CERTIFICADO_ALUNO = 'certificado-aluno-';

/** Tira acento e pontuação: nome de arquivo tem que sobreviver a qualquer sistema. */
export function semAcento(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

export function nomeCertificadoAluno(fullName: string, nr: string) {
  return `${PREFIXO_CERTIFICADO_ALUNO}${semAcento(fullName)}-${semAcento(nr)}.pdf`;
}
