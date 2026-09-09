import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';

import type { CertificateData } from '@/db/company-repository';
import {
  issuingCity,
  TECHNICAL_LEAD,
  certificateSetup,
  formatCertificateDates,
} from '@/lib/certificate-config';
import { caixaAlta, signatureBox } from '@/lib/certificate-pdf';

/** O atestado é A4 retrato: é um documento de texto com tabela. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 52;
const CONTENT = PAGE_W - MARGIN * 2;

const PRETO = rgb(0, 0, 0);
const AMARELO = rgb(0.949, 0.678, 0.098);
const CINZA = rgb(0.45, 0.45, 0.45);
const LINHA = rgb(0.82, 0.82, 0.82);
const FUNDO_SUAVE = rgb(0.965, 0.965, 0.953);

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
  const selo = setup.seal ? await embedImage(pdf, setup.seal) : null;
  const assinaturaResponsavel = await embedImage(pdf, TECHNICAL_LEAD.signature);

  let assinaturaInstrutor: PDFImage | null = null;
  if (input.instructorSignature) {
    try {
      assinaturaInstrutor = input.instructorSignature.contentType.includes('png')
        ? await pdf.embedPng(input.instructorSignature.bytes)
        : await pdf.embedJpg(input.instructorSignature.bytes);
    } catch { assinaturaInstrutor = null; }
  }

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = 0;

  /** Cabeçalho repetido em toda página: selo, logo e faixa amarela. */
  function abrirPagina() {
    page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: AMARELO });
    let topo = PAGE_H - 34;
    if (selo) {
      const altura = 68;
      page.drawImage(selo, { x: MARGIN, y: topo - altura, width: (selo.width / selo.height) * altura, height: altura });
    }
    if (logo) {
      const altura = 62;
      const largura = (logo.width / logo.height) * altura;
      page.drawImage(logo, { x: PAGE_W - MARGIN - largura, y: topo - altura + 3, width: largura, height: altura });
    }
    topo -= 86;
    page.drawLine({ start: { x: MARGIN, y: topo }, end: { x: PAGE_W - MARGIN, y: topo }, thickness: 0.6, color: LINHA });
    y = topo - 30;
  }

  function novaPagina() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    abrirPagina();
  }

  abrirPagina();

  // Título com sublinhado curto em amarelo.
  const titulo = 'ATESTADO';
  const tituloSize = 22;
  const larguraTitulo = bold.widthOfTextAtSize(titulo, tituloSize);
  page.drawText(titulo, { x: MARGIN + (CONTENT - larguraTitulo) / 2, y, size: tituloSize, font: bold, color: PRETO });
  page.drawRectangle({ x: MARGIN + (CONTENT - 54) / 2, y: y - 10, width: 54, height: 3, color: AMARELO });

  // Parágrafo de abertura, justificado sem esticar linha curta.
  y -= 40;
  const corpo = 10.5;
  const paragrafo = `Atesto, para os devidos fins, que as pessoas abaixo relacionadas participaram com bom aproveitamento do treinamento de "${setup.attestationSubject}", ${setup.attestationLegalBasis} referente à edificação localizada no endereço abaixo e estão aptas ao manuseio dos equipamentos de prevenção e combate a incêndio da edificação:`;
  const linhas = wrap(paragrafo, regular, corpo, CONTENT);
  linhas.forEach((palavras, indice) => {
    const texto = palavras.join(' ');
    const curta = regular.widthOfTextAtSize(texto, corpo) < CONTENT * 0.88;
    if (indice === linhas.length - 1 || curta || palavras.length === 1) {
      page.drawText(texto, { x: MARGIN, y, size: corpo, font: regular, color: PRETO });
    } else {
      const larguraPalavras = palavras.reduce((soma, w) => soma + regular.widthOfTextAtSize(w, corpo), 0);
      const espaco = (CONTENT - larguraPalavras) / (palavras.length - 1);
      let x = MARGIN;
      for (const palavra of palavras) {
        page.drawText(palavra, { x, y, size: corpo, font: regular, color: PRETO });
        x += regular.widthOfTextAtSize(palavra, corpo) + espaco;
      }
    }
    y -= 16;
  });

  // Caixa com os dados da edificação.
  y -= 18;
  const campos: [string, string][] = [
    ['EMPRESA', caixaAlta(data.client.legalName)],
    ['CNPJ', data.client.document || '—'],
    ['ENDEREÇO', [data.client.address, data.client.district].filter(Boolean).join(' - ') || '—'],
    ['MUNICÍPIO / UF', [data.client.city, data.client.state].filter(Boolean).join(' / ') || '—'],
  ];
  const alturaCaixa = campos.length * 17 + 26;
  page.drawRectangle({ x: MARGIN, y: y - alturaCaixa + 12, width: CONTENT, height: alturaCaixa, color: FUNDO_SUAVE });
  page.drawRectangle({ x: MARGIN, y: y - alturaCaixa + 12, width: 3, height: alturaCaixa, color: AMARELO });
  page.drawText('DADOS DA EDIFICAÇÃO', { x: MARGIN + 16, y: y - 2, size: 7.5, font: bold, color: rgb(0.54, 0.38, 0.03) });
  let campoY = y - 20;
  for (const [rotulo, valor] of campos) {
    page.drawText(rotulo, { x: MARGIN + 16, y: campoY, size: 8, font: bold, color: CINZA });
    page.drawText(fit(valor, regular, corpo - 0.5, CONTENT - 130), {
      x: MARGIN + 120, y: campoY, size: corpo - 0.5, font: regular, color: PRETO,
    });
    campoY -= 17;
  }
  y = y - alturaCaixa - 6;

  // Tabela de participantes.
  y -= 18;
  page.drawText('PARTICIPANTES', { x: MARGIN, y, size: 8, font: bold, color: rgb(0.54, 0.38, 0.03) });
  y -= 14;

  const colunas: { titulo: string; largura: number; valor: (p: CertificateData['participants'][number]) => string }[] = [
    { titulo: 'NOME', largura: CONTENT * 0.38, valor: (p) => caixaAlta(p.fullName) },
    { titulo: 'RG', largura: CONTENT * 0.15, valor: (p) => p.rg },
    { titulo: 'CPF', largura: CONTENT * 0.18, valor: (p) => p.documentId },
    { titulo: 'DATA NASC.', largura: CONTENT * 0.14, valor: (p) => formatBirthDate(p.birthDate) },
    { titulo: 'CARGA HORÁRIA', largura: CONTENT * 0.15, valor: () => data.training.duration },
  ];
  const alturaLinha = 19;
  const tabelaSize = 7.6;

  function cabecalhoTabela(destino: PDFPage) {
    destino.drawRectangle({ x: MARGIN, y: y - alturaLinha, width: CONTENT, height: alturaLinha, color: PRETO });
    let x = MARGIN;
    for (const coluna of colunas) {
      destino.drawText(coluna.titulo, {
        x: x + 6, y: y - alturaLinha + 6.5, size: tabelaSize, font: bold, color: AMARELO,
      });
      x += coluna.largura;
    }
    y -= alturaLinha;
  }

  cabecalhoTabela(page);
  data.participants.forEach((participante, indice) => {
    if (y - alturaLinha < 250) {
      novaPagina();
      cabecalhoTabela(page);
    }
    if (indice % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - alturaLinha, width: CONTENT, height: alturaLinha, color: FUNDO_SUAVE });
    }
    let x = MARGIN;
    for (const coluna of colunas) {
      page.drawText(fit(coluna.valor(participante), regular, tabelaSize, coluna.largura - 12), {
        x: x + 6, y: y - alturaLinha + 6.5, size: tabelaSize, font: regular, color: PRETO,
      });
      x += coluna.largura;
    }
    page.drawLine({
      start: { x: MARGIN, y: y - alturaLinha },
      end: { x: MARGIN + CONTENT, y: y - alturaLinha },
      thickness: 0.4, color: LINHA,
    });
    y -= alturaLinha;
  });

  // Data e assinaturas: se não couberem, vão para a página seguinte.
  if (y < 235) novaPagina();
  y -= 32;
  const linhaData = `${issuingCity(data.client)}, ${formatCertificateDates(data.training.dates)}.`;
  page.drawText(linhaData, {
    x: PAGE_W - MARGIN - regular.widthOfTextAtSize(linhaData, corpo),
    y, size: corpo, font: regular, color: PRETO,
  });

  const baseY = Math.max(y - 112, 104);
  const vao = CONTENT / 2;
  // Mesma ordem dos certificados: responsável técnica à esquerda, instrutor à direita.
  const assinaturas = [
    {
      assinatura: assinaturaResponsavel,
      linhas: [TECHNICAL_LEAD.role, caixaAlta(TECHNICAL_LEAD.name), `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
    },
    {
      assinatura: assinaturaInstrutor,
      linhas: ['Técnico de Segurança', caixaAlta(data.instructor.name), data.instructor.registry ? `MTE: ${data.instructor.registry}` : ''],
    },
  ];
  assinaturas.forEach((bloco, indice) => {
    const meio = MARGIN + vao * indice + vao / 2;
    const larguraLinha = Math.min(vao - 30, 200);
    if (bloco.assinatura) {
      const { width, height } = signatureBox(bloco.assinatura, vao);
      page.drawImage(bloco.assinatura, { x: meio - width / 2, y: baseY + 3, width, height });
    }
    page.drawLine({
      start: { x: meio - larguraLinha / 2, y: baseY },
      end: { x: meio + larguraLinha / 2, y: baseY },
      thickness: 0.8, color: PRETO,
    });
    let linhaY = baseY - 12;
    for (const texto of bloco.linhas.filter(Boolean)) {
      page.drawText(fit(texto, regular, 8.5, larguraLinha + 40), {
        x: meio - Math.min(regular.widthOfTextAtSize(texto, 8.5), larguraLinha + 40) / 2,
        y: linhaY, size: 8.5, font: regular, color: PRETO,
      });
      linhaY -= 11;
    }
  });

  // Rodapé em todas as páginas.
  for (const pagina of pdf.getPages()) {
    pagina.drawLine({
      start: { x: MARGIN, y: 56 }, end: { x: PAGE_W - MARGIN, y: 56 },
      thickness: 0.5, color: LINHA,
    });
    const rodape = 'SPACE LIGHT ENGENHARIA · Treinamentos em Segurança do Trabalho';
    pagina.drawText(rodape, {
      x: MARGIN + (CONTENT - regular.widthOfTextAtSize(rodape, 7.5)) / 2,
      y: 42, size: 7.5, font: regular, color: CINZA,
    });
  }

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
