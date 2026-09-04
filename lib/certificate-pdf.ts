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

/** A4 paisagem em pontos, o mesmo do modelo impresso da Space. */
const PAGE_W = 842;
const PAGE_H = 595.28;
const LEFT = 44;
/** Faixa decorativa fica na direita; o conteúdo respeita esta margem. */
const RIGHT_SAFE = 118;

async function readPublic(relative: string) {
  return readFile(path.join(process.cwd(), 'public', relative));
}

async function embedImage(pdf: PDFDocument, relative: string): Promise<PDFImage | null> {
  try {
    const bytes = await readPublic(relative);
    return /\.png$/i.test(relative) ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

/** Quebra o texto respeitando a largura, medindo com a própria fonte. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export type CertificatePdfInput = {
  data: CertificateData;
  /** Bytes da assinatura do instrutor, quando houver documento aprovado. */
  instructorSignature?: { bytes: Uint8Array; contentType: string } | null;
};

/**
 * Monta o PDF com uma página A4 paisagem por participante. As imagens são
 * embutidas uma única vez e reaproveitadas em todas as páginas.
 */
export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const { data } = input;
  const setup = certificateSetup(data.training.nr);
  if (!setup) {
    throw new Error(`A base legal da ${data.training.nr} ainda não foi cadastrada.`);
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fundo = await embedImage(pdf, setup.background);
  const faixa = await embedImage(pdf, '/images/certificado/faixa-lateral.png');
  const selo = setup.seal ? await embedImage(pdf, setup.seal) : null;
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

  const dataLinha = formatCertificateDates(data.training.dates);
  const preto = rgb(0, 0, 0);

  for (const participante of data.participants) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    if (fundo) page.drawImage(fundo, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    if (faixa) {
      // A arte é quadrada: encostada à direita com a altura da página, a parte
      // transparente sobra à esquerda e o amarelo fica na borda.
      const largura = (faixa.width / faixa.height) * PAGE_H;
      page.drawImage(faixa, { x: PAGE_W - largura, y: 0, width: largura, height: PAGE_H });
    }

    let y = PAGE_H - 30;

    if (selo) {
      const altura = 66;
      page.drawImage(selo, { x: LEFT, y: y - altura, width: (selo.width / selo.height) * altura, height: altura });
    }
    if (logo) {
      const altura = 54;
      const largura = (logo.width / logo.height) * altura;
      page.drawImage(logo, { x: PAGE_W - RIGHT_SAFE - largura, y: y - altura, width: largura, height: altura });
    }

    y -= 96;
    const titulo = 'CERTIFICADO';
    const tituloSize = 30;
    const centro = LEFT + (PAGE_W - RIGHT_SAFE - LEFT) / 2;
    page.drawText(titulo, {
      x: centro - bold.widthOfTextAtSize(titulo, tituloSize) / 2,
      y, size: tituloSize, font: bold, color: preto,
    });

    // Bloco de texto: a primeira linha tem o nome sublinhado no meio.
    y -= 52;
    const corpo = 10.5;
    const larguraTexto = PAGE_W - RIGHT_SAFE - LEFT;
    const nome = `${participante.fullName}${participante.rg ? ` RG - ${participante.rg}` : ''}`;

    const prefixo = 'Certificamos que ';
    const sufixo = ' concluiu';
    const larguraNome = Math.max(bold.widthOfTextAtSize(nome, corpo) + 24, 300);
    let x = LEFT;
    page.drawText(prefixo, { x, y, size: corpo, font: regular, color: preto });
    x += regular.widthOfTextAtSize(prefixo, corpo);
    page.drawText(nome, {
      x: x + (larguraNome - bold.widthOfTextAtSize(nome, corpo)) / 2,
      y, size: corpo, font: bold, color: preto,
    });
    page.drawLine({
      start: { x, y: y - 3 }, end: { x: x + larguraNome, y: y - 3 },
      thickness: 0.8, color: preto,
    });
    x += larguraNome;
    page.drawText(sufixo, { x, y, size: corpo, font: regular, color: preto });

    // Restante do parágrafo, quebrado na largura útil.
    y -= 26;
    const restante = `com aproveitamento o "${data.training.title.toUpperCase()}", ${setup.legalBasis} ministrado pela SPACE LIGHT ENGENHARIA.`;
    for (const linha of wrap(restante, regular, corpo, larguraTexto)) {
      page.drawText(linha, { x: LEFT, y, size: corpo, font: regular, color: preto });
      y -= 22;
    }

    y -= 14;
    const cliente = data.client.legalName.toUpperCase();
    page.drawText(cliente, {
      x: centro - bold.widthOfTextAtSize(cliente, corpo) / 2,
      y, size: corpo, font: bold, color: preto,
    });

    y -= 26;
    const linhaData = `${ISSUING_CITY}, ${dataLinha}.`;
    page.drawText(linhaData, {
      x: PAGE_W - RIGHT_SAFE - bold.widthOfTextAtSize(linhaData, corpo),
      y, size: corpo, font: bold, color: preto,
    });

    // Três assinaturas na base.
    const baseY = 66;
    const colunas = 3;
    const vao = (PAGE_W - RIGHT_SAFE - LEFT) / colunas;
    const blocos: { assinatura: PDFImage | null; linhas: string[] }[] = [
      {
        assinatura: assinaturaResponsavel,
        linhas: [TECHNICAL_LEAD.role, TECHNICAL_LEAD.name, `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
      },
      {
        assinatura: null,
        linhas: [participante.fullName, participante.rg ? `RG - ${participante.rg}` : ''],
      },
      {
        assinatura: assinaturaInstrutor,
        linhas: ['Técnico de Segurança', data.instructor.name, data.instructor.registry ? `MTE: ${data.instructor.registry}` : ''],
      },
    ];

    blocos.forEach((bloco, indice) => {
      const meio = LEFT + vao * indice + vao / 2;
      const larguraLinha = Math.min(vao - 26, 170);
      if (bloco.assinatura) {
        const altura = 34;
        const largura = Math.min((bloco.assinatura.width / bloco.assinatura.height) * altura, larguraLinha);
        page.drawImage(bloco.assinatura, {
          x: meio - largura / 2, y: baseY + 4, width: largura, height: altura,
        });
      }
      page.drawLine({
        start: { x: meio - larguraLinha / 2, y: baseY },
        end: { x: meio + larguraLinha / 2, y: baseY },
        thickness: 0.8, color: preto,
      });
      let linhaY = baseY - 11;
      for (const texto of bloco.linhas.filter(Boolean)) {
        const size = 8;
        page.drawText(texto, {
          x: meio - regular.widthOfTextAtSize(texto, size) / 2,
          y: linhaY, size, font: regular, color: preto,
        });
        linhaY -= 10;
      }
    });
  }

  return pdf.save();
}

export function certificateFileName(data: CertificateData) {
  const limpo = `${data.training.nr}-${data.training.title}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `certificados-${limpo.toLowerCase()}.pdf`;
}
