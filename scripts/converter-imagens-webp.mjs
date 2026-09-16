/**
 * Gera uma versão WebP ao lado de cada PNG de public/images/brand-v2.
 * Os PNG originais ficam no repositório; o site serve só o .webp.
 *
 * Uso (dentro de site/): node scripts/converter-imagens-webp.mjs
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = fileURLToPath(
  new URL('../public/images/brand-v2/', import.meta.url),
);
const LARGURA_MAX = 1920;

async function* pngs(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, item.name);
    if (item.isDirectory()) yield* pngs(caminho);
    else if (item.name.endsWith('.png')) yield caminho;
  }
}

let antes = 0;
let depois = 0;
for await (const png of pngs(raiz)) {
  const webp = png.replace(/\.png$/, '.webp');
  await sharp(png)
    .resize({ width: LARGURA_MAX, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(webp);
  const [a, d] = await Promise.all([stat(png), stat(webp)]);
  antes += a.size;
  depois += d.size;
  console.log(
    `${(a.size / 1024).toFixed(0).padStart(6)} KB → ${(d.size / 1024).toFixed(0).padStart(4)} KB  ${webp.split('brand-v2')[1]}`,
  );
}
console.log(
  `Total: ${(antes / 1048576).toFixed(1)} MB → ${(depois / 1048576).toFixed(1)} MB`,
);
