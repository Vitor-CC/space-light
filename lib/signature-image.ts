import sharp from 'sharp';

/**
 * Prepara a assinatura enviada pelo instrutor para entrar no PDF.
 *
 * Resolve dois problemas medidos nos documentos gerados:
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
 */
export async function prepararAssinatura(
  bytes: Uint8Array,
  contentType: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  try {
    const recortada = await sharp(Buffer.from(bytes))
      // O limiar tolera o fundo levemente sujo de foto de papel, sem comer o traço.
      .trim({ threshold: 12 })
      // Foto de celular vira PNG de 4000 px e ~20 MB, e o pdf-lib leva ~8 s
      // para embutir cada um: uma turma de 26 alunos travava a emissão por
      // minutos (NR 06, 30/09/2026). A caixa tem no máximo 96 pt de altura,
      // então 400 px já dão ~300 dpi impressos.
      .resize({ width: 1200, height: 400, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return { bytes: new Uint8Array(recortada), contentType: 'image/png' };
  } catch {
    // Formato que o sharp não leu: devolve o original e deixa o pdf-lib tentar.
    // Pior caso é o comportamento de antes, nunca pior que ele.
    return { bytes, contentType };
  }
}
