/**
 * Configuração do certificado. Cada NR tem a sua base legal e a sua arte —
 * o texto jurídico NÃO pode ser inventado, então uma NR sem entrada aqui
 * simplesmente não emite certificado.
 */

export type CertificateSetup = {
  /** Vai depois de "concluiu com aproveitamento satisfatório o ..." — literal. */
  legalBasis: string;
  /** Arte de fundo. Sem ela o certificado sai em fundo branco, sem quebrar. */
  background?: string;
  seal?: string;
  sealAlt?: string;
  /**
   * Atestado é a peça que vai ao Corpo de Bombeiros, e o fecho dela fala de
   * combate a incêndio. Só a norma que tem estes dois campos emite atestado;
   * as demais emitem apenas os certificados.
   */
  attestationSubject?: string;
  attestationLegalBasis?: string;
};

/**
 * Base legal transcrita dos certificados do certificador da Space Light
 * (documentos recebidos em 18/09/2026), com os erros de digitação da origem
 * corrigidos a pedido do Vitor: "DAREFERIDA NORMA", acentos faltando e caixa
 * alta corrida. Números de portaria, item e norma não foram tocados.
 */
export const CERTIFICATE_SETUP: Record<string, CertificateSetup> = {
  'NR 05': {
    legalBasis: 'de acordo com a Portaria 3214/78 do MTB - NR 05 - CIPAA,',
  },
  'NR 10': {
    legalBasis: 'de acordo com a NR 10, item 10.8 e Anexo III da referida norma,',
  },
  // Curso complementar do SEP: mesma base legal da formação, conteúdo próprio.
  'NR 10 SEP': {
    legalBasis: 'de acordo com a NR 10, item 10.8 e Anexo III da referida norma,',
  },
  'NR 11': {
    legalBasis:
      'de acordo com a NR 11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais,',
  },
  'NR 12': {
    legalBasis:
      'de acordo com a Portaria 3214/78 - NR 12 - Segurança no Trabalho em Máquinas e Equipamentos,',
  },
  'NR 18': {
    legalBasis: 'de acordo com a NR 18, item 18.12.37,',
  },
  'NR 20': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 20,',
  },
  'NR 23': {
    legalBasis:
      'de acordo com o decreto 69.118, de 09 de dezembro de 2024, – Instrução Técnica 17 de 2025 e Portaria 3214/78 - NR 23,',
    background: '/images/certificado/fundo-nr23.jpg',
    seal: '/images/certificado/selo-nr23.png',
    sealAlt: 'Selo Brigada de Incêndio',
    attestationSubject: 'Brigada de Incêndio',
    attestationLegalBasis:
      'de acordo com o Decreto 69.118, de 09 de dezembro de 2024, IT 17 de 2025 do Corpo de Bombeiros do Estado de São Paulo, e NBR 14276 e 14277,',
  },
  'NR 31': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 31,',
  },
  'NR 33': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 33 - Espaço Confinado,',
  },
  'NR 35': {
    legalBasis: 'de acordo com a NR 35 - Trabalho em Altura,',
  },
  // Não é NR: a base é norma da ABNT, e por isso entra pelo nome do treinamento.
  'EMERGÊNCIAS QUÍMICAS': {
    legalBasis: 'de acordo com a ABNT NBR 14.064,',
  },
};

/**
 * O registro profissional do instrutor vale como registro?
 *
 * Cadastro em branco e "00000" são o mesmo caso na prática: instrutor sem
 * habilitação registrada. Nesses o documento sai assinado só pela responsável
 * técnica — assinar sem registro ao lado é o que não pode.
 */
export function registroValido(registry: string | null | undefined) {
  const limpo = (registry ?? '').replace(/[^0-9a-z]/gi, '');
  return limpo.length > 0 && !/^0+$/.test(limpo);
}

export function certificateSetup(nr: string) {
  return CERTIFICATE_SETUP[nr.trim()] ?? null;
}

/** Responsável técnica que assina os certificados. */
export const TECHNICAL_LEAD = {
  role: 'Engenheira Eletricista / Segurança do Trabalho',
  name: 'Ana Paula Sobrinho',
  registryLabel: 'CREA',
  registry: '5070910783',
  signature: '/images/certificado/assinatura-ana-paula.png',
};

/**
 * Cidade dos CERTIFICADOS (aluno e empresa): quem emite é a Space Light, de
 * São Paulo, então aqui é fixo mesmo — não acompanha o endereço do cliente.
 */
export const ISSUING_CITY = 'São Paulo';

/**
 * Cidade do ATESTADO, que é diferente de propósito: o atestado descreve a
 * edificação do cliente, então a linha de local e data sai do município
 * cadastrado. São Paulo só entra como reserva, para cliente sem endereço.
 */
export function issuingCity(client: { city?: string }) {
  return client.city?.trim() || ISSUING_CITY;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * "São Paulo, 23 e 28 de fevereiro de 2026." quando as datas caem no mesmo
 * mês; caindo em meses diferentes, cada data aparece por extenso.
 */
export function formatCertificateDates(dates: string[]) {
  const parsed = dates
    .filter(Boolean)
    .map((iso) => {
      const [year, month, day] = iso.split('-').map(Number);
      return { year, month, day };
    })
    .filter((item) => item.year && item.month && item.day)
    .sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);

  if (parsed.length === 0) return '';

  const mesmoMes = parsed.every(
    (item) => item.month === parsed[0].month && item.year === parsed[0].year,
  );
  const juntar = (partes: string[]) =>
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;

  if (mesmoMes) {
    const dias = juntar(parsed.map((item) => String(item.day).padStart(2, '0')));
    return `${dias} de ${MESES[parsed[0].month - 1]} de ${parsed[0].year}`;
  }
  return juntar(
    parsed.map((item) => `${String(item.day).padStart(2, '0')} de ${MESES[item.month - 1]} de ${item.year}`),
  );
}
