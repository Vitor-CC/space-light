/**
 * Caminho da versão WebP de uma imagem de `public/images/brand-v2`.
 * Os PNG originais continuam no repositório; o WebP sai de
 * `scripts/converter-imagens-webp.mjs`.
 *
 * @example imagemMarca('heroes/space-light-hero-01')
 */
export function imagemMarca(caminho: string) {
  return `/images/brand-v2/${caminho}-brand-v2.webp`;
}
