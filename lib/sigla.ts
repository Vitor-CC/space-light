/**
 * Sigla do cliente, que forma o código da turma: PETZ-JAC + nº da turma
 * daquele cliente → PETZ-JAC-03. Sem dependência de servidor: a tela usa
 * para sugerir e o repositório para validar.
 */

export const SIGLA_REGRA = 'De 2 a 12 caracteres: letras, números e hífen.';

/** Maiúsculas, sem acento, só A-Z, 0-9 e hífen (sem hífen repetido nas pontas). */
export function normalizarSigla(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12);
}

export function siglaValida(sigla: string) {
  return /^[A-Z0-9](?:[A-Z0-9-]{0,10}[A-Z0-9])?$/.test(sigla) && sigla.length >= 2;
}

/** Enquanto digita: deixa o hífen do fim, para a pessoa conseguir continuar. */
export function limparDigitacaoSigla(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 12);
}

// Marcas conhecidas ganham a abreviação que a equipe já usa.
const MARCAS: Record<string, string> = { AMAZON: 'AMZ', MAGAZINE: 'MGLU', AEROPORTO: 'AERO' };
const LIGACOES = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'CD', 'LTDA', 'SA', 'ME', 'EIRELI']);

/**
 * Sugestão a partir do nome: marca + unidade.
 * "PETZ JAÇANÃ" → PETZ-JAC; "AMAZON GRU 09" → AMZ-GRU09; "PROLAB" → PROLAB.
 */
export function sugerirSigla(nome: string) {
  const palavras = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((p) => p && !LIGACOES.has(p));
  if (palavras.length === 0) return '';
  const [primeira, ...resto] = palavras as [string, ...string[]];
  if (resto.length === 0) return normalizarSigla(primeira.slice(0, 8));
  const marca = MARCAS[primeira] ?? (primeira.length <= 5 ? primeira : primeira.slice(0, 4));
  // Código de unidade com número (GRU 09, CGH7) vira uma peça só.
  const comNumero = resto.findIndex((p) => /\d/.test(p));
  let unidade: string;
  if (comNumero > 0 && /^[A-Z]{2,4}$/.test(resto[comNumero - 1]!)) unidade = `${resto[comNumero - 1]}${resto[comNumero]!.padStart(2, '0')}`;
  else if (comNumero === 0) unidade = resto[0]!;
  else if (['SAO', 'SANTO', 'SANTA'].includes(resto[0]!) && resto[1]) unidade = `S${resto[1].slice(0, 2)}`;
  else unidade = resto[0]!.slice(0, 3);
  return normalizarSigla(`${marca}-${unidade}`);
}

/** Código da turma: sigla + número da turma no cliente, com 2 dígitos. */
export function codigoDaTurma(sigla: string, numero: number) {
  return `${sigla}-${String(numero).padStart(2, '0')}`;
}
