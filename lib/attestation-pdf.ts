import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage } from 'pdf-lib';

import type { CertificateData } from '@/db/company-repository';
import {
  ISSUING_CITY,
  TECHNICAL_LEAD,
  certificateSetup,
  formatCertificateDates,
} from '@/lib/certificate-config';

/** O atestado é A4 retrato: é um documento de texto com tabela. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT = PAGE_W - MARGIN * 2;

async function embedImage(pdf: PDFDocument, relative: string): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', relative));
    return /\.png$/i.test(relative) ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current.length === 0) {
      current.push(word);
    } else {
      lines.push(current);
      current = [word];
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/** Corta o texto com reticências para não estourar a coluna da tabela. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let corte = text;
  while (corte.length > 1 && font.widthOfTextAtSize(`${corte}…`, size) > maxWidth) {
    corte = corte.slice(0, -1);
  }
  return `${corte}…`;
}

function formatBirthDate(iso: string) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export type AttestationPdfInput = {
  data: CertificateData;
  instructorSignature?: { bytes: Uint8Array; contentType: string } | null;
};

/**
 * Atestado de treinamento: um documento por turma, listando os participantes
 * e a edificação onde o treinamento foi aplicado.
 */
export async function buildAttestationPdf(input: AttestationPdfInput): Promise<Uint8Array> {
  const { data } = input;
  const setup = certificateSetup(data.training.nr);
  if (!setup) {
    throw new Error(`A base legal da ${data.training.nr} ainda não foi cadastrada.`);
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedImage(pdf, '/images/certificado/logo-space.png');
  const assinaturaResponsavel = await embedImage(pdf, TECHNICAL_LEAD.signature);

  let assinaturaInstrutor: PDFImage | null = null;
  if (input.instructorSignature) {
    try {
      assinaturaInstrutor = input.instructorSignature.contentType.includes('png')
        ? await pdf.embedPng(input.instructorSignature.bytes)
        : await pdf.embedJpg(input.instructorSignature.bytes);
    } catch { assinaturaInstrutor = null; }
  }

  const preto = rgb(0, 0, 0);
  const cinza = rgb(0.42, 0.42, 0.42);
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function novaPagina() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  if (logo) {
    const altura = 52;
    const largura = (logo.width / logo.height) * altura;
    page.drawImage(logo, { x: PAGE_W - MARGIN - largura, y: y - altura, width: largura, height: altura });
  }

  y -= 62;
  const titulo = 'ATESTADO';
  page.drawText(titulo, {
    x: MARGIN + (CONTENT - bold.widthOfTextAtSize(titulo, 20)) / 2,
    y, size: 20, font: bold, color: preto,
  });

  // Parágrafo de abertura, justificado.
  y -= 38;
  const corpo = 10.5;
  const paragrafo = `Atesto, para os devidos fins, que as pessoas abaixo relacionadas participaram com bom aproveitamento do treinamento de "${setup.attestationSubject}", ${setup.attestationLegalBasis} referente à edificação localizada no endereço abaixo e estão aptas ao manuseio dos equipamentos de prevenção e combate a incêndio da edificação:`;
  const linhas = wrap(paragrafo, regular, corpo, CONTENT);
  linhas.forEach((palavras, indice) => {
    const ultima = indice === linhas.length - 1;
    if (ultima || palavras.length === 1) {
      page.drawText(palavras.join(' '), { x: MARGIN, y, size: corpo, font: regular, color: preto });
    } else {
      const larguraPalavras = palavras.reduce((soma, w) => soma + regular.widthOfTextAtSize(w, corpo), 0);
      const espaco = (CONTENT - larguraPalavras) / (palavras.length - 1);
      let x = MARGIN;
      for (const palavra of palavras) {
        page.drawText(palavra, { x, y, size: corpo, font: regular, color: preto });
        x += regular.widthOfTextAtSize(palavra, corpo) + espaco;
      }
    }
    y -= 17;
  });

  // Bloco da empresa e da edificação.
  y -= 14;
  const enderecoLinha = [data.client.address, data.client.district ? `BAIRRO: ${data.client.district}` : '']
    .filter(Boolean)
    .join(' - ');
  const municipioLinha = [
    data.client.city ? `MUNICÍPIO: ${data.client.city}` : '',
    data.client.state ? `UF: ${data.client.state}` : '',
  ].filter(Boolean).join('   ');

  const blocos: [string, string][] = [
    ['EMPRESA:', data.client.legalName.toUpperCase()],
    ['ENDEREÇO:', enderecoLinha || '—'],
    ['', municipioLinha],
    ['CNPJ:', data.client.document || '—'],
  ];
  for (const [rotulo, valor] of blocos) {
    if (!valor) continue;
    let x = MARGIN;
    if (rotulo) {
      page.drawText(rotulo, { x, y, size: corpo, font: bold, color: preto });
      x += bold.widthOfTextAtSize(`${rotulo} `, corpo);
    }
    page.drawText(fit(valor, regular, corpo, CONTENT - (x - MARGIN)), {
      x, y, size: corpo, font: regular, color: preto,
    });
    y -= 16;
  }

  // Tabela de participantes.
  y -= 16;
  const colunas: { titulo: string; largura: number; valor: (p: CertificateData['participants'][number]) => string }[] = [
    { titulo: 'NOME', largura: 196, valor: (p) => p.fullName },
    { titulo: 'RG', largura: 78, valor: (p) => p.rg },
    { titulo: 'CPF', largura: 92, valor: (p) => p.documentId },
    { titulo: 'DATA NASC.', largura: 68, valor: (p) => formatBirthDate(p.birthDate) },
    { titulo: 'CARGA HORÁRIA', largura: 49, valor: () => data.training.duration },
  ];
  const alturaLinha = 20;
  const tabelaSize = 8;

  function cabecalhoTabela() {
    let x = MARGIN;
    page.drawRectangle({ x: MARGIN, y: y - alturaLinha + 5, width: CONTENT, height: alturaLinha, color: rgb(0.93, 0.93, 0.91) });
    for (const coluna of colunas) {
      page.drawText(coluna.titulo, { x: x + 4, y: y - alturaLinha + 11, size: tabelaSize, font: bold, color: preto });
      x += coluna.largura;
    }
    y -= alturaLinha;
  }

  cabecalhoTabela();
  for (const participante of data.participants) {
    if (y < 210) {
      novaPagina();
      cabecalhoTabela();
    }
    let x = MARGIN;
    for (const coluna of colunas) {
      page.drawText(fit(coluna.valor(participante), regular, tabelaSize, coluna.largura - 8), {
        x: x + 4, y: y - alturaLinha + 11, size: tabelaSize, font: regular, color: preto,
      });
      x += coluna.largura;
    }
    page.drawLine({
      start: { x: MARGIN, y: y - alturaLinha + 5 },
      end: { x: MARGIN + CONTENT, y: y - alturaLinha + 5 },
      thickness: 0.4, color: rgb(0.8, 0.8, 0.8),
    });
    y -= alturaLinha;
  }

  // Data e assinaturas: se não couberem, vão para a página seguinte.
  if (y < 200) novaPagina();
  y -= 34;
  const linhaData = `${ISSUING_CITY}, ${formatCertificateDates(data.training.dates)}.`;
  page.drawText(linhaData, { x: MARGIN, y, size: corpo, font: regular, color: preto });

  const baseY = Math.max(y - 96, 96);
  const vao = CONTENT / 2;
  const assinaturas = [
    {
      assinatura: assinaturaInstrutor,
      linhas: ['Técnico de Segurança', data.instructor.name, data.instructor.registry ? `MTE: ${data.instructor.registry}` : ''],
      destaque: false,
    },
    {
      assinatura: assinaturaResponsavel,
      linhas: [TECHNICAL_LEAD.role, TECHNICAL_LEAD.name, `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
      destaque: true,
    },
  ];
  assinaturas.forEach((bloco, indice) => {
    const meio = MARGIN + vao * indice + vao / 2;
    const larguraLinha = Math.min(vao - 30, 190);
    if (bloco.assinatura) {
      const altura = bloco.destaque ? 62 : 44;
      const largura = Math.min((bloco.assinatura.width / bloco.assinatura.height) * altura, larguraLinha + 20);
      page.drawImage(bloco.assinatura, { x: meio - largura / 2, y: baseY + 3, width: largura, height: altura });
    }
    page.drawLine({
      start: { x: meio - larguraLinha / 2, y: baseY },
      end: { x: meio + larguraLinha / 2, y: baseY },
      thickness: 0.8, color: preto,
    });
    let linhaY = baseY - 12;
    for (const texto of bloco.linhas.filter(Boolean)) {
      page.drawText(texto, {
        x: meio - regular.widthOfTextAtSize(texto, 8.5) / 2,
        y: linhaY, size: 8.5, font: regular, color: preto,
      });
      linhaY -= 11;
    }
  });

  page.drawText('SPACE LIGHT ENGENHARIA', {
    x: MARGIN + (CONTENT - regular.widthOfTextAtSize('SPACE LIGHT ENGENHARIA', 8)) / 2,
    y: 48, size: 8, font: regular, color: cinza,
  });

  return pdf.save();
}

export function attestationFileName(data: CertificateData) {
  const limpo = `${data.training.nr}-${data.training.title}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `atestado-${limpo.toLowerCase()}.pdf`;
}
