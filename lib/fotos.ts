/**
 * Foto de perfil (instrutor e equipe) e logo do cliente. O arquivo fica em
 * disco e é servido por /api/fotos/<tipo>/<id>; o `v` muda quando a foto é
 * trocada, para o navegador não mostrar a antiga do cache.
 */

export type TipoDeFoto = 'instrutor' | 'equipe' | 'cliente';

/** Endereço da foto, ou null quando não há (o avatar mostra as iniciais). */
export function urlDaFoto(tipo: TipoDeFoto, id: string, chave: string | null | undefined) {
  if (!chave) return null;
  const versao = chave.split('/').pop()?.replace(/\.[a-z]+$/i, '') ?? '';
  return `/api/fotos/${tipo}/${encodeURIComponent(id)}?v=${encodeURIComponent(versao)}`;
}
