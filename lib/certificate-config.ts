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
  /** Só a norma com atestado cadastrado emite atestado; as demais, só certificados. */
  attestation?: AttestationSetup;
};

export type AttestationTurma = { duration: string; kind: string; machine: string };

/**
 * O atestado lista os participantes e a edificação do cliente. O parágrafo de
 * abertura muda de norma para norma (base legal, fecho, às vezes a carga
 * horária no meio), então cada uma guarda o texto inteiro, transcrito do
 * atestado do certificador.
 */
export type AttestationSetup = {
  texto: (turma: AttestationTurma) => string;
  /** NR 23 e DEA listam a data de nascimento; as demais, o tipo do treinamento. */
  colunaExtra: 'nascimento' | 'treinamento';
};

const ATESTO = 'Atesto, para os devidos fins, que as pessoas abaixo relacionadas participaram com bom aproveitamento';
const EDIFICACAO = 'referente à edificação localizada no endereço abaixo';

/**
 * Base legal transcrita dos certificados do certificador da Space Light
 * (documentos recebidos em 18/09/2026), com os erros de digitação da origem
 * corrigidos a pedido do Vitor: "DAREFERIDA NORMA", acentos faltando e caixa
 * alta corrida. Números de portaria, item e norma não foram tocados. Os
 * atestados vieram em 29/09/2026, com o mesmo tratamento e o emissor
 * padronizado como SPACE LIGHT ENGENHARIA.
 */
export const CERTIFICATE_SETUP: Record<string, CertificateSetup> = {
  'NR 05': {
    legalBasis: 'de acordo com a Portaria 3214/78 do MTB - NR 05 - CIPAA,',
  },
  // Transcrito do certificado do certificador recebido em 29/09/2026.
  'NR 06': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 06 - Equipamento de Proteção Individual,',
  },
  // Primeiros socorros pela Lei Lucas (escolas). Certificado recebido em
  // 30/09/2026; a NR 07 "pura" (primeiros socorros em empresa) ainda não veio.
  'NR 07 LEI LUCAS': {
    legalBasis:
      'de acordo com a Lei nº 13.722, de 4 de outubro de 2018, e a Portaria 3214/78 - NR 07 - Programa de Controle Médico de Saúde Ocupacional,',
    seal: '/images/certificado/selo-lei-lucas.png',
    sealAlt: 'Lei Lucas',
  },
  'NR 10': {
    legalBasis: 'de acordo com a NR 10, item 10.8 e Anexo III da referida norma,',
    attestation: {
      texto: () => `${ATESTO} da formação do "CURSO DE NR 10 - FORMAÇÃO EM SEGURANÇA EM INSTALAÇÕES E SERVIÇOS COM ELETRICIDADE", ministrado pela SPACE LIGHT ENGENHARIA, ${EDIFICACAO}:`,
      colunaExtra: 'treinamento',
    },
  },
  // Curso complementar do SEP: mesma base legal da formação, conteúdo próprio.
  'NR 10 SEP': {
    legalBasis: 'de acordo com a NR 10, item 10.8 e Anexo III da referida norma,',
    attestation: {
      texto: ({ duration }) => `${ATESTO} do treinamento de "NR 10, SEGURANÇA EM INSTALAÇÕES E SERVIÇOS EM ELETRICIDADE - SISTEMA ELÉTRICO DE POTÊNCIA", ${duration.trim() ? `com carga horária de ${duration.trim()}, ` : ''}teórico e prático, de acordo com a NR 10, item 10.8 e Anexo III da referida norma, ministrado pela SPACE LIGHT ENGENHARIA, ${EDIFICACAO}:`,
      colunaExtra: 'treinamento',
    },
  },
  'NR 11': {
    legalBasis:
      'de acordo com a NR 11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais,',
  },
  'NR 12': {
    legalBasis:
      'de acordo com a Portaria 3214/78 - NR 12 - Segurança no Trabalho em Máquinas e Equipamentos,',
    background: '/images/certificado/fundo-nr12.jpg',
    attestation: {
      // O original diz "da bobcat": a máquina vem do cadastro da turma.
      texto: ({ kind, machine }) => `${ATESTO} do treinamento de "${kind === 'reciclagem' ? 'Reciclagem' : 'Formação'}", de acordo com a NR 12 - Segurança com Máquinas e Equipamentos, Portaria 3214/78, referente às máquinas alocadas na edificação localizada no endereço abaixo e estão aptas ao manuseio ${machine.trim() ? `da máquina ${machine.trim()}` : 'das máquinas'} da edificação:`,
      colunaExtra: 'treinamento',
    },
  },
  'NR 18': {
    legalBasis: 'de acordo com a NR 18, item 18.12.37,',
    attestation: {
      texto: () => `${ATESTO} do treinamento de "Plataforma Elevatória Móvel de Trabalho", ${EDIFICACAO} e estão aptas ao manuseio da máquina da edificação:`,
      colunaExtra: 'treinamento',
    },
  },
  'NR 20': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 20,',
    attestation: {
      texto: () => `${ATESTO} do treinamento de "SEGURANÇA E SAÚDE NOS TRABALHOS COM LÍQUIDOS E COMBUSTÍVEIS INFLAMÁVEIS", de acordo com a Portaria 3214/78 - NR 20, ${EDIFICACAO} e estão aptas ao manuseio e contenção dos produtos líquidos e combustíveis inflamáveis da edificação:`,
      colunaExtra: 'treinamento',
    },
  },
  'NR 23': {
    legalBasis:
      'de acordo com o decreto 69.118, de 09 de dezembro de 2024, – Instrução Técnica 17 de 2025 e Portaria 3214/78 - NR 23,',
    background: '/images/certificado/fundo-nr23.jpg',
    seal: '/images/certificado/selo-nr23.png',
    sealAlt: 'Selo Brigada de Incêndio',
    // A peça que vai ao Corpo de Bombeiros.
    attestation: {
      texto: () => `${ATESTO} do treinamento de "Brigada de Incêndio", de acordo com o Decreto 69.118, de 09 de dezembro de 2024, IT 17 de 2025 do Corpo de Bombeiros do Estado de São Paulo, e NBR 14276 e 14277, ${EDIFICACAO} e estão aptas ao manuseio dos equipamentos de prevenção e combate a incêndio da edificação:`,
      colunaExtra: 'nascimento',
    },
  },
  'NR 31': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 31,',
    background: '/images/certificado/fundo-nr31.jpg',
  },
  'NR 33': {
    legalBasis: 'de acordo com a Portaria 3214/78 - NR 33 - Espaço Confinado,',
  },
  'NR 35': {
    legalBasis: 'de acordo com a NR 35 - Trabalho em Altura,',
    background: '/images/certificado/fundo-nr35.jpg',
    attestation: {
      texto: () => `${ATESTO} do treinamento de "Trabalho em Altura", de acordo com a NR 35 - Portaria 3214/78, ${EDIFICACAO} e estão aptas ao manuseio dos equipamentos de proteção individual e trabalho seguro:`,
      colunaExtra: 'treinamento',
    },
  },
  // Não é NR: a base é norma da ABNT, e por isso entra pelo nome do treinamento.
  'EMERGÊNCIAS QUÍMICAS': {
    legalBasis: 'de acordo com a ABNT NBR 14.064,',
    background: '/images/certificado/fundo-emergencias-quimicas.jpg',
  },
  // Também não é NR: lei municipal de São Paulo, com a NR 07 de apoio.
  // Certificado e atestado recebidos em 29/09/2026. O fecho do atestado
  // ("combate a incêndio") está assim no original.
  'DEA': {
    legalBasis:
      'de acordo com a Lei nº 14.621, de 11 de dezembro de 2007, de São Paulo e a Portaria 3214/78 - NR 07 - Programa de Controle Médico de Saúde Ocupacional,',
    attestation: {
      texto: () => `${ATESTO} do "TREINAMENTO DO DEA – DESFIBRILADOR EXTERNO AUTOMÁTICO", de acordo com a Lei nº 14.621, de 11 de dezembro de 2007, de São Paulo e a Portaria 3214/78 - NR 07 - Programa de Controle Médico de Saúde Ocupacional, ministrado pela SPACE LIGHT ENGENHARIA, ${EDIFICACAO} e estão aptas ao manuseio dos equipamentos de prevenção e combate a incêndio da edificação:`,
      colunaExtra: 'nascimento',
    },
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

/**
 * "MTE: <registro>", sem repetir o rótulo quando o cadastro já traz "MTE" na
 * frente (ex.: "MTE SP 008828-5").
 */
export function mte(registry: string) {
  return `MTE: ${registry.trim().replace(/^MTE[\s:.-]*/i, '')}`;
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
