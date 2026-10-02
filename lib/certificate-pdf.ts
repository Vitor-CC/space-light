import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';

import type { CertificateData } from '@/db/company-repository';
import {
  ISSUING_CITY,
  TECHNICAL_LEAD,
  mte,
  certificateSetup,
  registroValido,
  formatCertificateDates,
} from '@/lib/certificate-config';
import { nomeCertificadoAluno, PREFIXO_CERTIFICADO_ALUNO, semAcento } from '@/lib/nome-certificado';
import { programForNr } from '@/lib/nr23-program';
import { programaDoCurso } from '@/lib/nr-programs';
import { textosParaPdf } from '@/lib/texto-pdf';
import type { ProgramaDeCurso } from '@/lib/nr-programs';

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
    // Linha curta demais fica alinhada à esquerda: esticá-la abriria buracos
    // entre as palavras, que é pior do que a margem irregular.
    const curta = options.font.widthOfTextAtSize(texto, options.size) < options.maxWidth * 0.88;
    if (ultima || curta || words.length === 1) {
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

/**
 * Nome de pessoa ou empresa sai sempre em caixa alta no documento, não importa
 * como foi digitado no cadastro ou na lista de presença.
 */
export function caixaAlta(texto: string) {
  return (texto ?? '').toLocaleUpperCase('pt-BR');
}

/**
 * Reduz o corpo do texto até ele caber na largura, com um piso.
 * Devolve null quando nem no piso cabe — aí quem chama decide o que fazer.
 */
export function tamanhoQueCabe(
  texto: string,
  font: PDFFont,
  inicial: number,
  larguraMax: number,
  piso = 9,
) {
  let tamanho = inicial;
  while (tamanho > piso && font.widthOfTextAtSize(texto, tamanho) > larguraMax) {
    tamanho -= 0.5;
  }
  return font.widthOfTextAtSize(texto, tamanho) <= larguraMax ? tamanho : null;
}

type SignatureBlock = { assinatura: PDFImage | null; linhas: string[] };

/** Altura máxima de qualquer assinatura, seja da responsável técnica ou do instrutor. */
const ASSINATURA_ALTURA_MAX = 96;

/**
 * Encaixa a assinatura na coluna preservando a proporção.
 *
 * A da responsável técnica é um arquivo conhecido; a do instrutor é enviada por
 * ele e chega em proporção imprevisível. Limitar só a largura, como era antes,
 * achatava assinatura larga (a altura ficava fixa) e ainda a desenhava menor
 * que a da engenheira, porque as duas usavam alturas diferentes.
 */
export function signatureBox(assinatura: PDFImage, vao: number) {
  const larguraMax = vao - 16;
  const escala = Math.min(
    ASSINATURA_ALTURA_MAX / assinatura.height,
    larguraMax / assinatura.width,
  );
  return { width: assinatura.width * escala, height: assinatura.height * escala };
}

/** Fila de assinaturas na base da página, distribuídas na largura útil. */
/**
 * O bloco de assinatura do instrutor, ou nada quando ele não tem registro
 * profissional válido. Devolver lista permite espalhar com `...`, e assim a
 * fila de assinaturas encolhe de três colunas para duas sozinha.
 */
function blocoDoInstrutor(
  data: CertificateData,
  assinatura: PDFImage | null,
): SignatureBlock[] {
  if (!registroValido(data.instructor.registry)) return [];
  return [{
    assinatura,
    linhas: ['Técnico de Segurança', caixaAlta(data.instructor.name), mte(data.instructor.registry)],
  }];
}

function drawSignatureRow(
  page: PDFPage,
  options: {
    baseY: number;
    left: number;
    width: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    blocks: SignatureBlock[];
  },
) {
  const vao = options.width / options.blocks.length;
  options.blocks.forEach((bloco, indice) => {
    const meio = options.left + vao * indice + vao / 2;
    const larguraLinha = Math.min(vao - 26, 170);
    if (bloco.assinatura) {
      const { width, height } = signatureBox(bloco.assinatura, vao);
      page.drawImage(bloco.assinatura, {
        x: meio - width / 2, y: options.baseY + 3, width, height,
      });
    }
    page.drawLine({
      start: { x: meio - larguraLinha / 2, y: options.baseY },
      end: { x: meio + larguraLinha / 2, y: options.baseY },
      thickness: 0.8, color: options.color,
    });
    let linhaY = options.baseY - 13;
    const limite = vao - 12;
    for (const texto of bloco.linhas.filter(Boolean)) {
      // Razão social costuma ser longa: quebra em duas linhas antes de encolher.
      const partes = options.font.widthOfTextAtSize(texto, 9.5) <= limite
        ? [texto]
        : wrap(texto, options.font, 8.5, limite).map((palavras) => palavras.join(' ')).slice(0, 2);
      const size = partes.length > 1 || options.font.widthOfTextAtSize(texto, 9.5) > limite ? 8.5 : 9.5;
      for (const parte of partes) {
        page.drawText(parte, {
          x: meio - options.font.widthOfTextAtSize(parte, size) / 2,
          y: linhaY, size, font: options.font, color: options.color,
        });
        linhaY -= size + 2;
      }
    }
  });
}

/** A4 retrato, para as páginas de conteúdo programático. */
/** Página da grade da NR 23: A4 em pé. Não muda — o documento já está em uso. */
const PROG_W = 595.28;
const PROG_H = 841.89;
const PROG_MARGIN = 40;

/** Página da lista dos demais cursos: A4 deitado, como os documentos de origem. */
const LISTA_W = 841.89;
const LISTA_H = 595.28;
const LISTA_MARGIN = 52;

type BlocoDeLista = { linhas: string[][]; altura: number; secao: boolean; espacoAntes: number };

/**
 * Conteúdo programático em lista, numa folha só.
 *
 * Duas colunas em A4 deitado, e o corpo do texto é escolhido por medição: tenta
 * do maior para o menor e fica no primeiro que couber inteiro na página. Curso
 * curto sai com letra grande; curso longo encolhe o suficiente, mas não vira
 * segunda folha.
 */
function appendListaDePrograma(
  pdf: PDFDocument,
  programa: ProgramaDeCurso,
  options: { duration: string; regular: PDFFont; bold: PDFFont; assinaturaResponsavel: PDFImage | null },
) {
  const { secoes, numerada = false, assinada = false } = programa;
  const preto = rgb(0, 0, 0);
  const largura = LISTA_W - LISTA_MARGIN * 2;
  const vaoEntreColunas = 36;
  // A lista numerada vai numa coluna só, na largura toda, como no documento de origem.
  const larguraColuna = numerada ? largura : (largura - vaoEntreColunas) / 2;
  const recuo = numerada ? 22 : 14;
  /** Base da assinatura da responsável, quando o curso pede a página assinada. */
  const baseAssinatura = LISTA_MARGIN + 40;

  const page = pdf.addPage([LISTA_W, LISTA_H]);
  let y = LISTA_H - LISTA_MARGIN;

  const t1 = 'CONTEÚDO PROGRAMÁTICO';
  const t2 = `CARGA HORÁRIA: ${options.duration.toUpperCase()}`;
  page.drawText(t1, {
    x: LISTA_MARGIN + (largura - options.bold.widthOfTextAtSize(t1, 15)) / 2,
    y, size: 15, font: options.bold, color: preto,
  });
  y -= 19;
  page.drawText(t2, {
    x: LISTA_MARGIN + (largura - options.bold.widthOfTextAtSize(t2, 11)) / 2,
    y, size: 11, font: options.bold, color: preto,
  });
  y -= 24;

  const topoDasColunas = y;
  const alturaUtil = topoDasColunas - (assinada ? baseAssinatura + ASSINATURA_ALTURA_MAX + 12 : LISTA_MARGIN);

  function montar(tamanho: number, forcar: boolean) {
    const entreLinhas = tamanho * 1.34;
    const blocos: BlocoDeLista[] = [];
    for (const secao of secoes) {
      if (secao.titulo) {
        const linhas = wrap(secao.titulo, options.bold, tamanho + 1, larguraColuna);
        blocos.push({ linhas, altura: linhas.length * entreLinhas, secao: true, espacoAntes: tamanho });
      }
      for (const item of secao.itens) {
        const linhas = wrap(item, options.regular, tamanho, larguraColuna - recuo);
        blocos.push({ linhas, altura: linhas.length * entreLinhas, secao: false, espacoAntes: tamanho * (numerada ? 1.3 : 0.3) });
      }
    }

    const colunas: BlocoDeLista[][] = [[], []];
    let atual = 0;
    let usado = 0;
    for (let i = 0; i < blocos.length; i += 1) {
      const bloco = blocos[i];
      const proximo = blocos[i + 1];
      // Título de seção não fica órfão no pé da coluna: só entra se o primeiro
      // item dele couber junto.
      const necessario = bloco.espacoAntes + bloco.altura
        + (bloco.secao && proximo ? proximo.espacoAntes + proximo.altura : 0);
      if (usado > 0 && usado + necessario > alturaUtil) {
        if ((atual === 1 || numerada) && !forcar) return null;
        if (atual === 0 && !numerada) { atual = 1; usado = 0; }
      }
      const consumo = (usado === 0 ? 0 : bloco.espacoAntes) + bloco.altura;
      if (consumo > alturaUtil && !forcar) return null;
      colunas[atual].push(bloco);
      usado += consumo;
    }
    return { colunas, entreLinhas, tamanho };
  }

  let montagem: ReturnType<typeof montar> = null;
  for (const tamanho of [12.5, 11.5, 10.5, 9.5, 8.5, 7.5, 7]) {
    montagem = montar(tamanho, false);
    if (montagem) break;
  }
  montagem ??= montar(6.5, true);
  if (!montagem) return;

  const { colunas, entreLinhas, tamanho } = montagem;
  let numero = 0;
  colunas.forEach((blocos, indice) => {
    const x = LISTA_MARGIN + indice * (larguraColuna + vaoEntreColunas);
    let cy = topoDasColunas;
    blocos.forEach((bloco, ordem) => {
      if (ordem > 0) cy -= bloco.espacoAntes;
      if (!bloco.secao) numero += 1;
      bloco.linhas.forEach((palavras, linha) => {
        if (bloco.secao) {
          page.drawText(palavras.join(' '), {
            x, y: cy - tamanho, size: tamanho + 1, font: options.bold, color: preto,
          });
        } else {
          if (linha === 0 && numerada) {
            page.drawText(`${numero}.`, { x, y: cy - tamanho, size: tamanho, font: options.regular, color: preto });
          } else if (linha === 0) {
            page.drawCircle({ x: x + 4, y: cy - tamanho * 0.66, size: tamanho * 0.13, color: preto });
          }
          page.drawText(palavras.join(' '), {
            x: x + recuo, y: cy - tamanho, size: tamanho, font: options.regular, color: preto,
          });
        }
        cy -= entreLinhas;
      });
    });
  });

  if (assinada) {
    // Como no documento de origem: responsável técnica assina à direita.
    drawSignatureRow(page, {
      baseY: baseAssinatura,
      left: LISTA_MARGIN + largura * 0.4,
      width: largura * 0.5,
      font: options.regular,
      color: preto,
      blocks: [{
        assinatura: options.assinaturaResponsavel,
        linhas: [TECHNICAL_LEAD.role, caixaAlta(TECHNICAL_LEAD.name), `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
      }],
    });
  }
}

/**
 * Anexa o conteúdo programático da norma. A grade é fixa por NR; a carga
 * horária vem do treinamento. Quebra em quantas páginas forem necessárias.
 */
function appendProgramPages(
  pdf: PDFDocument,
  options: { nr: string; duration: string; regular: PDFFont; bold: PDFFont; assinaturaResponsavel: PDFImage | null },
) {
  // A NR 23 tem grade de quatro colunas; os demais cursos vieram do
  // certificador como lista de tópicos, e têm página própria.
  const grade = programForNr(options.nr);
  if (!grade || grade.length === 0) {
    const programa = programaDoCurso(options.nr);
    if (programa) appendListaDePrograma(pdf, programa, options);
    return;
  }

  const preto = rgb(0, 0, 0);
  const linhaCor = rgb(0.72, 0.72, 0.72);
  const cabecalhoFundo = rgb(0.93, 0.93, 0.91);
  const largura = PROG_W - PROG_MARGIN * 2;
  const colunas = [
    { titulo: 'MÓDULO', largura: largura * 0.19, campo: 'modulo' as const },
    { titulo: 'ASSUNTO', largura: largura * 0.22, campo: 'assunto' as const },
    { titulo: 'OBJETIVOS PARTE TEÓRICA', largura: largura * 0.34, campo: 'teorica' as const },
    { titulo: 'OBJETIVOS PARTE PRÁTICA', largura: largura * 0.25, campo: 'pratica' as const },
  ];
  const corpo = 6.6;
  const alturaLinhaTexto = 8;
  const padding = 4;

  let page = pdf.addPage([PROG_W, PROG_H]);
  let y = PROG_H - PROG_MARGIN;

  function titulo() {
    const t1 = 'CONTEÚDO PROGRAMÁTICO';
    const t2 = `CARGA HORÁRIA: ${options.duration.toUpperCase()}`;
    page.drawText(t1, {
      x: PROG_MARGIN + (largura - options.bold.widthOfTextAtSize(t1, 12)) / 2,
      y, size: 12, font: options.bold, color: preto,
    });
    y -= 16;
    page.drawText(t2, {
      x: PROG_MARGIN + (largura - options.bold.widthOfTextAtSize(t2, 10)) / 2,
      y, size: 10, font: options.bold, color: preto,
    });
    y -= 22;
  }

  function cabecalho() {
    const altura = 22;
    page.drawRectangle({
      x: PROG_MARGIN, y: y - altura, width: largura, height: altura, color: cabecalhoFundo,
    });
    let x = PROG_MARGIN;
    for (const coluna of colunas) {
      const linhas = wrap(coluna.titulo, options.bold, corpo, coluna.largura - padding * 2);
      let ty = y - 9;
      for (const palavras of linhas) {
        page.drawText(palavras.join(' '), { x: x + padding, y: ty, size: corpo, font: options.bold, color: preto });
        ty -= alturaLinhaTexto;
      }
      page.drawLine({ start: { x, y }, end: { x, y: y - altura }, thickness: 0.4, color: linhaCor });
      x += coluna.largura;
    }
    page.drawLine({ start: { x: PROG_MARGIN, y }, end: { x: PROG_MARGIN + largura, y }, thickness: 0.4, color: linhaCor });
    page.drawLine({ start: { x, y }, end: { x, y: y - altura }, thickness: 0.4, color: linhaCor });
    page.drawLine({ start: { x: PROG_MARGIN, y: y - altura }, end: { x: PROG_MARGIN + largura, y: y - altura }, thickness: 0.4, color: linhaCor });
    y -= altura;
  }

  titulo();
  cabecalho();

  for (const item of grade) {
    // Mede antes de desenhar: a linha inteira precisa caber na página.
    const celulas = colunas.map((coluna) => wrap(item[coluna.campo] || '', options.regular, corpo, coluna.largura - padding * 2));
    const alturaLinha = Math.max(...celulas.map((c) => c.length)) * alturaLinhaTexto + padding * 2;

    if (y - alturaLinha < PROG_MARGIN + 20) {
      page = pdf.addPage([PROG_W, PROG_H]);
      y = PROG_H - PROG_MARGIN;
      cabecalho();
    }

    let x = PROG_MARGIN;
    celulas.forEach((linhas, indice) => {
      let ty = y - padding - 5;
      for (const palavras of linhas) {
        page.drawText(palavras.join(' '), { x: x + padding, y: ty, size: corpo, font: options.regular, color: preto });
        ty -= alturaLinhaTexto;
      }
      page.drawLine({ start: { x, y }, end: { x, y: y - alturaLinha }, thickness: 0.4, color: linhaCor });
      x += colunas[indice].largura;
    });
    page.drawLine({ start: { x, y }, end: { x, y: y - alturaLinha }, thickness: 0.4, color: linhaCor });
    page.drawLine({
      start: { x: PROG_MARGIN, y: y - alturaLinha },
      end: { x: PROG_MARGIN + largura, y: y - alturaLinha },
      thickness: 0.4, color: linhaCor,
    });
    y -= alturaLinha;
  }
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
  const data = textosParaPdf(input.data);
  const setup = certificateSetup(data.training.nr);
  if (!setup) {
    throw new Error(`A base legal da ${data.training.nr} ainda não foi cadastrada.`);
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fundo = setup.background ? await embedImage(pdf, setup.background) : null;
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
      const altura = 88;
      page.drawImage(selo, { x: LEFT, y: y - altura, width: (selo.width / selo.height) * altura, height: altura });
    }
    if (logo) {
      const altura = 72;
      const largura = (logo.width / logo.height) * altura;
      page.drawImage(logo, { x: PAGE_W - RIGHT_SAFE - largura, y: y - altura, width: largura, height: altura });
    }

    y -= 112;
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
    // O certificado identifica o aluno pelo CPF (decisão de 2026-09-12; antes era o RG).
    const nome = `${caixaAlta(participante.fullName)}${participante.documentId ? ` CPF - ${participante.documentId}` : ''}`;

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

    // "ministrado pela..." entra no fluxo do parágrafo. Isolado numa linha só,
    // ele deixava a linha anterior terminando curta e abria um vão no meio do
    // texto — a quebra tem que cair onde a medida pedir.
    y -= 26;
    const paragrafo = `com aproveitamento satisfatório o "${data.training.title.toUpperCase()}", ${cargaHoraria(data)}${setup.legalBasis} ministrado pela SPACE LIGHT ENGENHARIA.`;
    y = drawJustified(page, wrap(paragrafo, regular, corpo, larguraTexto), {
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
    // Mesma função das outras páginas: antes havia uma cópia desta fila aqui,
    // e uma correção de assinatura podia valer num documento e não no outro.
    drawSignatureRow(page, {
      baseY,
      left: LEFT,
      width: vao * colunas,
      font: regular,
      color: preto,
      blocks: [
        {
          assinatura: assinaturaResponsavel,
          linhas: [TECHNICAL_LEAD.role, caixaAlta(TECHNICAL_LEAD.name), `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
        },
        {
          assinatura: null,
          linhas: [caixaAlta(participante.fullName), participante.documentId ? `CPF - ${participante.documentId}` : ''],
        },
        ...blocoDoInstrutor(data, assinaturaInstrutor),
      ],
    });
  }

  appendProgramPages(pdf, { nr: data.training.nr, duration: data.training.duration, regular, bold, assinaturaResponsavel });

  return pdf.save();
}

/**
 * Certificado da empresa: um por turma, nomeando a razão social em vez do
 * participante. Só duas assinaturas — não há aluno para assinar.
 */
export async function buildCompanyCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const data = textosParaPdf(input.data);
  const setup = certificateSetup(data.training.nr);
  if (!setup) {
    throw new Error(`A base legal da ${data.training.nr} ainda não foi cadastrada.`);
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fundo = setup.background ? await embedImage(pdf, setup.background) : null;
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

  const preto = rgb(0, 0, 0);
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  if (fundo) page.drawImage(fundo, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  if (faixa) {
    const largura = (faixa.width / faixa.height) * PAGE_H;
    page.drawImage(faixa, { x: PAGE_W - largura, y: 0, width: largura, height: PAGE_H });
  }

  let y = PAGE_H - 30;
  if (selo) {
    const altura = 88;
    page.drawImage(selo, { x: LEFT, y: y - altura, width: (selo.width / selo.height) * altura, height: altura });
  }
  if (logo) {
    const altura = 72;
    const largura = (logo.width / logo.height) * altura;
    page.drawImage(logo, { x: PAGE_W - RIGHT_SAFE - largura, y: y - altura, width: largura, height: altura });
  }

  y -= 112;
  const tituloSize = 36;
  const centro = LEFT + (PAGE_W - RIGHT_SAFE - LEFT) / 2;
  page.drawText('CERTIFICADO', {
    x: centro - bold.widthOfTextAtSize('CERTIFICADO', tituloSize) / 2,
    y, size: tituloSize, font: bold, color: preto,
  });

  y -= 52;
  const corpo = 14;
  const larguraTexto = PAGE_W - RIGHT_SAFE - LEFT;
  const razao = data.client.legalName.toUpperCase();

  // Razão social longa estourava a margem e invadia a faixa decorativa da
  // direita. Agora o nome encolhe até caber ao lado do prefixo; se nem no
  // menor corpo couber, ele desce para uma linha própria, centralizado.
  const prefixo = 'Certificamos que os colaboradores da ';
  const larguraPrefixo = regular.widthOfTextAtSize(prefixo, corpo);
  const sobraNaLinha = larguraTexto - larguraPrefixo - 24;
  const corpoNomeInline = tamanhoQueCabe(razao, bold, corpo, sobraNaLinha, 10);

  if (corpoNomeInline) {
    const larguraNome = Math.max(bold.widthOfTextAtSize(razao, corpoNomeInline) + 24, 280);
    let x = centro - (larguraPrefixo + larguraNome) / 2;
    page.drawText(prefixo, { x, y, size: corpo, font: regular, color: preto });
    x += larguraPrefixo;
    page.drawText(razao, {
      x: x + (larguraNome - bold.widthOfTextAtSize(razao, corpoNomeInline)) / 2,
      y, size: corpoNomeInline, font: bold, color: preto,
    });
    page.drawLine({ start: { x, y: y - 3 }, end: { x: x + larguraNome, y: y - 3 }, thickness: 0.8, color: preto });
    y -= 26;
  } else {
    page.drawText(prefixo.trimEnd(), {
      x: centro - regular.widthOfTextAtSize(prefixo.trimEnd(), corpo) / 2,
      y, size: corpo, font: regular, color: preto,
    });
    y -= 24;
    const corpoNome = tamanhoQueCabe(razao, bold, corpo, larguraTexto - 24, 7) ?? 7;
    const larguraNome = Math.min(bold.widthOfTextAtSize(razao, corpoNome) + 24, larguraTexto);
    const inicio = centro - larguraNome / 2;
    page.drawText(razao, {
      x: centro - bold.widthOfTextAtSize(razao, corpoNome) / 2,
      y, size: corpoNome, font: bold, color: preto,
    });
    page.drawLine({ start: { x: inicio, y: y - 3 }, end: { x: inicio + larguraNome, y: y - 3 }, thickness: 0.8, color: preto });
    y -= 26;
  }
  // Igual ao certificado do aluno: o fecho corre junto com o resto do parágrafo.
  const paragrafo = `concluíram com aproveitamento satisfatório o "${data.training.title.toUpperCase()}", ${cargaHoraria(data)}${setup.legalBasis} ministrado pela SPACE LIGHT ENGENHARIA.`;
  y = drawJustified(page, wrap(paragrafo, regular, corpo, larguraTexto), {
    x: LEFT, y, size: corpo, font: regular, color: preto, maxWidth: larguraTexto, leading: 26,
  });

  y -= 14;
  const corpoRazaoCentral = tamanhoQueCabe(razao, bold, corpo, larguraTexto, 7) ?? 7;
  page.drawText(razao, {
    x: centro - bold.widthOfTextAtSize(razao, corpoRazaoCentral) / 2,
    y, size: corpoRazaoCentral, font: bold, color: preto,
  });

  y -= 26;
  const linhaData = `${ISSUING_CITY}, ${formatCertificateDates(data.training.dates)}.`;
  page.drawText(linhaData, {
    x: PAGE_W - RIGHT_SAFE - bold.widthOfTextAtSize(linhaData, corpo),
    y, size: corpo, font: bold, color: preto,
  });

  // Ordem fixa em todos os documentos: responsável técnica à esquerda,
  // instrutor à direita. A do meio fica em branco: quem assina é a contratante,
  // à mão, ao receber o documento.
  drawSignatureRow(page, {
    baseY: 66, left: LEFT, width: PAGE_W - RIGHT_SAFE - LEFT, font: regular, color: preto,
    blocks: [
      {
        assinatura: assinaturaResponsavel,
        linhas: [TECHNICAL_LEAD.role, caixaAlta(TECHNICAL_LEAD.name), `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`],
      },
      {
        assinatura: null,
        linhas: ['Empresa contratante', razao, data.client.document ? `CNPJ: ${data.client.document}` : ''],
      },
      ...blocoDoInstrutor(data, assinaturaInstrutor),
    ],
  });

  appendProgramPages(pdf, { nr: data.training.nr, duration: data.training.duration, regular, bold, assinaturaResponsavel });

  return pdf.save();
}

/** Prefixo de cada papel. São disjuntos de propósito: a aba Certificados
 *  encontra os documentos pelo começo do nome, e "certificado-" sozinho pegaria
 *  também o da empresa. */
/**
 * "com carga horária de 8 horas, " antes da base legal. Sai do cadastro da
 * turma, e não fica chumbada por norma: a mesma NR é dada em cargas diferentes.
 * Turma sem carga horária preenchida simplesmente não mostra o trecho.
 */
function cargaHoraria(data: CertificateData) {
  const valor = (data.training.duration ?? '').trim();
  return valor ? `com carga horária de ${valor}, ` : '';
}

export { PREFIXO_CERTIFICADO_ALUNO };
export const PREFIXO_CERTIFICADO_EMPRESA = 'certificado-empresa-';

export function companyCertificateFileName(data: CertificateData) {
  return `${PREFIXO_CERTIFICADO_EMPRESA}${semAcento(`${data.training.nr}-${data.training.title}`)}.pdf`;
}

/**
 * Um arquivo por aluno, com o nome dele no nome do arquivo — é assim que a
 * equipe acha o certificado certo sem abrir um por um, e é assim que o cliente
 * recebe já separado.
 */
export function certificateFileName(
  data: CertificateData,
  participante: { fullName: string },
) {
  return nomeCertificadoAluno(participante.fullName, data.training.nr);
}
