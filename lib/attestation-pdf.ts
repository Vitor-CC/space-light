import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';

import type { CertificateData } from '@/db/company-repository';
import {
  issuingCity,
  TECHNICAL_LEAD,
  certificateSetup,
  registroValido,
  formatCertificateDates,
} from '@/lib/certificate-config';
import { caixaAlta } from '@/lib/certificate-pdf';

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

/**
 * A assinatura aqui é menor que a do certificado: ela se repete em toda folha,
 * e cada ponto que ela devolve vira nome na lista.
 */
const ASSINATURA_ALTURA = 56;

function caixaDaAssinatura(assinatura: PDFImage, vao: number) {
  const escala = Math.min(ASSINATURA_ALTURA / assinatura.height, (vao - 16) / assinatura.width);
  return { width: assinatura.width * escala, height: assinatura.height * escala };
}

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

const TIPO_DO_TREINAMENTO: Record<string, string> = { formacao: 'FORMAÇÃO', reciclagem: 'RECICLAGEM' };

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
  const atestado = setup.attestation;
  if (!atestado) {
    throw new Error(`A ${data.training.nr} não tem texto de atestado cadastrado.`);
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

  const corpo = 10.5;
  const paragrafo = atestado.texto({ duration: data.training.duration ?? '', kind: data.training.kind });
  const campos: [string, string][] = [
    ['EMPRESA', caixaAlta(data.client.legalName)],
    ['CNPJ', data.client.document || '—'],
    ['ENDEREÇO', [data.client.address, data.client.district].filter(Boolean).join(' - ') || '—'],
    ['MUNICÍPIO / UF', [data.client.city, data.client.state].filter(Boolean).join(' / ') || '—'],
  ];

  /** Faixa amarela, selo e logo: a moldura da folha. */
  function moldura() {
    page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: AMARELO });
    let topo = PAGE_H - 28;
    if (selo) {
      const altura = 58;
      page.drawImage(selo, { x: MARGIN, y: topo - altura, width: (selo.width / selo.height) * altura, height: altura });
    }
    if (logo) {
      const altura = 52;
      const largura = (logo.width / logo.height) * altura;
      page.drawImage(logo, { x: PAGE_W - MARGIN - largura, y: topo - altura + 3, width: largura, height: altura });
    }
    topo -= 72;
    page.drawLine({ start: { x: MARGIN, y: topo }, end: { x: PAGE_W - MARGIN, y: topo }, thickness: 0.6, color: LINHA });
    y = topo - 22;
  }

  /**
   * Título, texto legal e dados da edificação. Vai em TODA página: o atestado
   * pode ser destacado folha a folha, e cada uma precisa dizer sozinha de que
   * treinamento e de qual edificação se trata.
   */
  function cabecalhoCompleto() {
    const titulo = 'ATESTADO';
    const tituloSize = 19;
    const larguraTitulo = bold.widthOfTextAtSize(titulo, tituloSize);
    page.drawText(titulo, { x: MARGIN + (CONTENT - larguraTitulo) / 2, y, size: tituloSize, font: bold, color: PRETO });
    page.drawRectangle({ x: MARGIN + (CONTENT - 54) / 2, y: y - 9, width: 54, height: 3, color: AMARELO });

    // Parágrafo de abertura, justificado sem esticar linha curta.
    y -= 31;
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
      y -= 13.5;
    });

    // Caixa com os dados da edificação.
    y -= 13;
    const alturaCaixa = campos.length * 15 + 22;
    page.drawRectangle({ x: MARGIN, y: y - alturaCaixa + 12, width: CONTENT, height: alturaCaixa, color: FUNDO_SUAVE });
    page.drawRectangle({ x: MARGIN, y: y - alturaCaixa + 12, width: 3, height: alturaCaixa, color: AMARELO });
    page.drawText('DADOS DA EDIFICAÇÃO', { x: MARGIN + 16, y: y - 2, size: 7.5, font: bold, color: rgb(0.54, 0.38, 0.03) });
    let campoY = y - 18;
    for (const [rotulo, valor] of campos) {
      page.drawText(rotulo, { x: MARGIN + 16, y: campoY, size: 8, font: bold, color: CINZA });
      page.drawText(fit(valor, regular, corpo - 0.5, CONTENT - 130), {
        x: MARGIN + 120, y: campoY, size: corpo - 0.5, font: regular, color: PRETO,
      });
      campoY -= 15;
    }
    y = y - alturaCaixa - 4;

    y -= 13;
    page.drawText('PARTICIPANTES', { x: MARGIN, y, size: 8, font: bold, color: rgb(0.54, 0.38, 0.03) });
    y -= 12;
  }

  function abrirPagina() {
    moldura();
    cabecalhoCompleto();
  }

  function novaPagina() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    abrirPagina();
  }

  abrirPagina();

  type Coluna = { titulo: string; largura: number; valor: (p: CertificateData['participants'][number]) => string };
  // Turma sem tipo informado (as antigas) fica sem a coluna, em vez de chutar.
  const tipo = TIPO_DO_TREINAMENTO[data.training.kind] ?? '';
  const extra: Coluna | null = atestado.colunaExtra === 'nascimento'
    ? { titulo: 'DATA NASC.', largura: 0.14, valor: (p) => formatBirthDate(p.birthDate) }
    : tipo ? { titulo: 'TREINAMENTO', largura: 0.14, valor: () => tipo } : null;
  const colunas = ([
    // Sem coluna de RG: o atestado identifica pelo CPF, como o certificado.
    { titulo: 'NOME', largura: extra ? 0.53 : 0.62, valor: (p) => caixaAlta(p.fullName) },
    { titulo: 'CPF', largura: extra ? 0.18 : 0.21, valor: (p) => p.documentId },
    ...(extra ? [extra] : []),
    { titulo: 'CARGA HORÁRIA', largura: extra ? 0.15 : 0.17, valor: () => data.training.duration },
  ] satisfies Coluna[]).map((coluna) => ({ ...coluna, largura: CONTENT * coluna.largura }));
  const alturaLinha = 16;
  const tabelaSize = 7.6;
  /** Data e assinaturas ficam sempre no mesmo lugar, porque vão em toda folha. */
  const Y_DATA = 172;
  const Y_ASSINATURA = 100;
  /** Piso da tabela: acima da data, com folga para a última linha respirar. */
  const LIMITE_TABELA = 186;

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
    if (y - alturaLinha < LIMITE_TABELA) {
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

  // Mesma ordem dos certificados: responsável técnica à esquerda, instrutor à
  // direita — e o instrutor sem registro válido simplesmente não entra na fila.
  const assinaturas = [
    {
      assinatura: assinaturaResponsavel,
      linhas: [TECHNICAL_LEAD.role, caixaAlta(TECHNICAL_LEAD.name), `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
    },
    ...(registroValido(data.instructor.registry)
      ? [{
          assinatura: assinaturaInstrutor,
          linhas: ['Técnico de Segurança', caixaAlta(data.instructor.name), `MTE: ${data.instructor.registry}`],
        }]
      : []),
  ];
  const linhaData = `${issuingCity(data.client)}, ${formatCertificateDates(data.training.dates)}.`;

  /** Data e assinaturas de uma folha, sempre na mesma altura. */
  function assinar(destino: PDFPage) {
    destino.drawText(linhaData, {
      x: PAGE_W - MARGIN - regular.widthOfTextAtSize(linhaData, corpo),
      y: Y_DATA, size: corpo, font: regular, color: PRETO,
    });
    const vao = CONTENT / assinaturas.length;
    assinaturas.forEach((bloco, indice) => {
      const meio = MARGIN + vao * indice + vao / 2;
      const larguraLinha = Math.min(vao - 30, 200);
      if (bloco.assinatura) {
        const { width, height } = caixaDaAssinatura(bloco.assinatura, vao);
        destino.drawImage(bloco.assinatura, { x: meio - width / 2, y: Y_ASSINATURA + 3, width, height });
      }
      destino.drawLine({
        start: { x: meio - larguraLinha / 2, y: Y_ASSINATURA },
        end: { x: meio + larguraLinha / 2, y: Y_ASSINATURA },
        thickness: 0.8, color: PRETO,
      });
      let linhaY = Y_ASSINATURA - 12;
      for (const texto of bloco.linhas.filter(Boolean)) {
        destino.drawText(fit(texto, regular, 8.5, larguraLinha + 40), {
          x: meio - Math.min(regular.widthOfTextAtSize(texto, 8.5), larguraLinha + 40) / 2,
          y: linhaY, size: 8.5, font: regular, color: PRETO,
        });
        linhaY -= 11;
      }
    });
  }

  // Assinatura e rodapé em todas as páginas: cada folha do atestado é
  // destacável, então nenhuma pode circular sem assinatura.
  for (const pagina of pdf.getPages()) {
    assinar(pagina);
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
