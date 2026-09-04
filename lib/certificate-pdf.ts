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

type Desenho = {
  drawText: (text: string, options: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }) => void;
};

/**
 * Justifica distribuindo a sobra entre os espaços da linha. A última linha do
 * parágrafo fica alinhada à esquerda, como manda a convenção tipográfica.
 */
function drawJustified(
  page: Desenho,
  lines: string[][],
  options: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; maxWidth: number; leading: number },
) {
  let y = options.y;
  lines.forEach((words, indice) => {
    const ultima = indice === lines.length - 1;
    const texto = words.join(' ');
    if (ultima || words.length === 1) {
      page.drawText(texto, { x: options.x, y, size: options.size, font: options.font, color: options.color });
    } else {
      const larguraPalavras = words.reduce((soma, w) => soma + options.font.widthOfTextAtSize(w, options.size), 0);
      const espaco = (options.maxWidth - larguraPalavras) / (words.length - 1);
      let x = options.x;
      for (const palavra of words) {
        page.drawText(palavra, { x, y, size: options.size, font: options.font, color: options.color });
        x += options.font.widthOfTextAtSize(palavra, options.size) + espaco;
      }
    }
    y -= options.leading;
  });
  return y;
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
    const tituloSize = 36;
    const centro = LEFT + (PAGE_W - RIGHT_SAFE - LEFT) / 2;
    page.drawText(titulo, {
      x: centro - bold.widthOfTextAtSize(titulo, tituloSize) / 2,
      y, size: tituloSize, font: bold, color: preto,
    });

    // Bloco de texto: a primeira linha tem o nome sublinhado no meio.
    y -= 52;
    const corpo = 14;
    const larguraTexto = PAGE_W - RIGHT_SAFE - LEFT;
    const nome = `${participante.fullName}${participante.rg ? ` RG - ${participante.rg}` : ''}`;

    const prefixo = 'Certificamos que ';
    const sufixo = ' concluiu';
    const larguraNome = Math.max(bold.widthOfTextAtSize(nome, corpo) + 24, 300);
    // A linha do nome fica centralizada; o parágrafo abaixo é que é justificado.
    const larguraLinhaNome =
      regular.widthOfTextAtSize(prefixo, corpo) + larguraNome + regular.widthOfTextAtSize(sufixo, corpo);
    let x = centro - larguraLinhaNome / 2;
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

    // Como no modelo impresso, "ministrado pela..." fica sozinho na última
    // linha: as linhas de cima são justificadas de ponta a ponta.
    y -= 26;
    const fecho = 'ministrado pela SPACE LIGHT ENGENHARIA.';
    const abertura = `com aproveitamento o "${data.training.title.toUpperCase()}", ${setup.legalBasis}`;
    const linhas = [...wrap(abertura, regular, corpo, larguraTexto), fecho.split(' ')];
    y = drawJustified(page, linhas, {
      x: LEFT, y, size: corpo, font: regular, color: preto,
      maxWidth: larguraTexto, leading: 26,
    });

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
    const blocos: { assinatura: PDFImage | null; linhas: string[]; destaque?: boolean }[] = [
      {
        assinatura: assinaturaResponsavel,
        destaque: true,
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
        // A da responsável técnica é maior: é a assinatura que valida o documento.
        const altura = bloco.destaque ? 74 : 50;
        const largura = Math.min((bloco.assinatura.width / bloco.assinatura.height) * altura, larguraLinha + 30);
        page.drawImage(bloco.assinatura, {
          x: meio - largura / 2, y: baseY + 3, width: largura, height: altura,
        });
      }
      page.drawLine({
        start: { x: meio - larguraLinha / 2, y: baseY },
        end: { x: meio + larguraLinha / 2, y: baseY },
        thickness: 0.8, color: preto,
      });
      let linhaY = baseY - 13;
      for (const texto of bloco.linhas.filter(Boolean)) {
        const size = 9.5;
        page.drawText(texto, {
          x: meio - regular.widthOfTextAtSize(texto, size) / 2,
          y: linhaY, size, font: regular, color: preto,
        });
        linhaY -= 12;
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
