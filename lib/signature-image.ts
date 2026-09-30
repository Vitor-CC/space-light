import sharp from 'sharp';

/**
 * Prepara a assinatura enviada pelo instrutor para entrar no PDF.
 *
 * Resolve problemas medidos nos documentos gerados:
 *
 * 1. O pdf-lib só embute PNG e JPEG. Assinatura enviada em WebP ou HEIC — o
 *    formato padrão da câmera do iPhone — falhava ao embutir e o erro era
 *    engolido: o certificado saía SEM assinatura nenhuma, sem avisar ninguém.
 *
 * 2. Assinatura escaneada ou fotografada vem com muita margem vazia em volta do
 *    traço. Como a caixa no documento tem tamanho fixo, quem ocupa a caixa é a
 *    margem, e o traço aparecia com menos da metade da altura do da responsável
 *    técnica. Recortar a borda faz o traço encher a caixa: medido, ele fica de
 *    2,8 a 3,5 vezes maior sem mudar nada no layout.
 *
 * 3. Foto de papel com sombra saía com o fundo cinza no documento (30/09/2026).
 *    O papel vira transparente e só o traço fica.
 *
 * 4. Foto de celular vira PNG de 4000 px e ~20 MB, e o pdf-lib leva ~8 s para
 *    embutir cada um: uma turma de 26 alunos travava a emissão por minutos
 *    (NR 06, 30/09/2026). A caixa tem no máximo 96 pt de altura, então 400 px
 *    já dão ~300 dpi impressos.
 */
export async function prepararAssinatura(
  bytes: Uint8Array,
  contentType: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  try {
    const limpa = await tirarFundo(Buffer.from(bytes));
    let recortada = sharp(await sharp(limpa).trim({ threshold: 1 }).toBuffer());
    const { width, height } = await recortada.metadata();
    // Traço bem mais alto que largo é foto tirada com o papel de lado: ninguém
    // assina na vertical. Gira no sentido anti-horário (o caso que chegou).
    if (height > width * 1.5) recortada = sharp(await recortada.rotate(270).toBuffer());
    const pronta = await recortada
      .resize({ width: 1200, height: 400, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return { bytes: new Uint8Array(pronta), contentType: 'image/png' };
  } catch {
    // Formato que o sharp não leu: devolve o original e deixa o pdf-lib tentar.
    // Pior caso é o comportamento de antes, nunca pior que ele.
    return { bytes, contentType };
  }
}

/** Lado maior durante o tratamento: sobra para a caixa e mantém o laço rápido. */
const LADO_DE_TRABALHO = 1600;
/** Quantos blocos no lado maior para medir a luz do papel. */
const BLOCOS = 40;
/**
 * Força da tinta = quanto o canal mais escuro do pixel caiu em relação ao papel
 * em volta. Pega caneta azul (o vermelho despenca) e preta, e deixa de fora a
 * sombra cinza de dobra ou de borda, que cai pouco e por igual nos três canais.
 */
const TINTA_COMECA = 0.16;
const TINTA_CHEIA = 0.32;
/** Fator aplicado à cor do traço para ele sair firme no documento. */
const ESCURECER = 0.55;
/** Faixa da borda descartada: canto de mesa ou de sombra que entrou na foto. */
const BORDA = 0.025;

/**
 * Divide a imagem pela luz do papel medida em volta de cada ponto: o papel vira
 * branco mesmo com sombra e gradiente, e o traço fica com a cor dele. A luz do
 * papel é a média da metade mais clara de cada bloco, o que deixa a tinta
 * (sempre minoria no bloco) de fora da conta.
 */
async function tirarFundo(entrada: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(entrada)
    .rotate() // orientação gravada pela câmera
    .flatten({ background: '#ffffff' })
    .resize({ width: LADO_DE_TRABALHO, height: LADO_DE_TRABALHO, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const lado = Math.max(8, Math.ceil(Math.max(width, height) / BLOCOS));
  const bw = Math.ceil(width / lado);
  const bh = Math.ceil(height / lado);

  const grade = Buffer.alloc(bw * bh * 3);
  const brilhos: number[] = [];
  for (let by = 0; by < bh; by += 1) {
    for (let bx = 0; bx < bw; bx += 1) {
      brilhos.length = 0;
      for (let y = by * lado; y < Math.min(height, (by + 1) * lado); y += 1) {
        for (let x = bx * lado; x < Math.min(width, (bx + 1) * lado); x += 1) {
          const i = (y * width + x) * 3;
          brilhos.push(luz(data[i], data[i + 1], data[i + 2]));
        }
      }
      const corte = [...brilhos].sort((a, b) => a - b)[Math.floor(brilhos.length / 2)];
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let y = by * lado; y < Math.min(height, (by + 1) * lado); y += 1) {
        for (let x = bx * lado; x < Math.min(width, (bx + 1) * lado); x += 1) {
          const i = (y * width + x) * 3;
          if (luz(data[i], data[i + 1], data[i + 2]) < corte) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
        }
      }
      const o = (by * bw + bx) * 3;
      grade[o] = r / n; grade[o + 1] = g / n; grade[o + 2] = b / n;
    }
  }
  const papel = await sharp(grade, { raw: { width: bw, height: bh, channels: 3 } })
    .resize(width, height, { kernel: 'cubic' })
    .blur(lado / 2)
    .raw()
    .toBuffer();

  const margemX = Math.round(width * BORDA);
  const margemY = Math.round(height * BORDA);
  const saida = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p += 1) {
    const i = p * 3;
    const o = p * 4;
    const x = p % width;
    const y = (p - x) / width;
    const normal = [0, 1, 2].map((c) => Math.min(255, (data[i + c] / Math.max(1, papel[i + c])) * 255));
    const queda = 1 - Math.min(...normal) / 255;
    const tinta = Math.min(1, Math.max(0, (queda - TINTA_COMECA) / (TINTA_CHEIA - TINTA_COMECA)));
    const naBorda = x < margemX || y < margemY || x >= width - margemX || y >= height - margemY;
    // Papel fica branco puro e transparente: é o que deixa o recorte achar a borda.
    if (tinta < 0.08 || naBorda) { saida[o] = 255; saida[o + 1] = 255; saida[o + 2] = 255; continue; }
    // Foto borrada deixa o traço desbotado: escurece mantendo a cor da caneta.
    saida[o] = normal[0] * ESCURECER; saida[o + 1] = normal[1] * ESCURECER; saida[o + 2] = normal[2] * ESCURECER;
    saida[o + 3] = Math.round(tinta * 255);
  }
  return sharp(saida, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function luz(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
