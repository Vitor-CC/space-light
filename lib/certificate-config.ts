/**
 * Configuração do certificado. Cada NR tem a sua base legal e a sua arte —
 * o texto jurídico NÃO pode ser inventado, então uma NR sem entrada aqui
 * simplesmente não emite certificado.
 */

export type CertificateSetup = {
  /** Vai depois de "concluiu com aproveitamento o ..." — texto legal literal. */
  legalBasis: string;
  background: string;
  seal?: string;
  sealAlt?: string;
  /** Nome curto do treinamento como aparece no atestado. */
  attestationSubject: string;
  /** O atestado cita normas que o certificado não cita (NBR, por exemplo). */
  attestationLegalBasis: string;
};

export const CERTIFICATE_SETUP: Record<string, CertificateSetup> = {
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
};

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

/** Reserva: só vale quando o cliente ainda não tem município cadastrado. */
export const ISSUING_CITY = 'São Paulo';

/**
 * Cidade que aparece antes das datas nos três documentos. Sai do endereço da
 * edificação, que é onde o treinamento aconteceu — deixar fixo fazia todo
 * documento sair como São Paulo por mais que o endereço do cliente mudasse.
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
