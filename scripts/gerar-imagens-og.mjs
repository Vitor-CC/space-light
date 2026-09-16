/**
 * Imagens de compartilhamento (Open Graph) do site novo: 1200×630 em JPEG,
 * recortadas das fotos que já existem em public/images/brand-v2. Não é foto
 * nova — é a mesma foto no formato que WhatsApp, LinkedIn e Facebook aceitam
 * sem pesar (o PNG original tem ~2 MB). Os originais ficam onde estão.
 *
 * Uso (dentro de site/): node scripts/gerar-imagens-og.mjs
 */
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const brand = fileURLToPath(
  new URL('../public/images/brand-v2/', import.meta.url),
);
const destino = `${brand}og/`;

const ORIGENS = {
  home: 'heroes/space-light-hero-01',
  'nr-05': 'services/space-light-service-nr05',
  'nr-06': 'services/space-light-service-nr06',
  'nr-10': 'services/space-light-service-nr10',
  'nr-11': 'services/space-light-service-nr11',
  'nr-23': 'services/space-light-service-nr23',
  'nr-33': 'services/space-light-service-nr33',
  'nr-35': 'services/space-light-service-nr35',
};

await mkdir(destino, { recursive: true });
for (const [nome, origem] of Object.entries(ORIGENS)) {
  const saida = `${destino}space-light-og-${nome}.jpg`;
  await sharp(`${brand}${origem}-brand-v2.png`)
    // O recorte procura a região de maior interesse da foto, para a pessoa
    // em ação não sair cortada quando a proporção muda.
    .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(saida);
  console.log(
    `${((await stat(saida)).size / 1024).toFixed(0).padStart(4)} KB  og/space-light-og-${nome}.jpg`,
  );
}
