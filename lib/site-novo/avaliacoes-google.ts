/*
 * Avaliações do perfil da Space Light no Google, direto da Places API (New).
 *
 * Liga só com GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID no servidor; sem elas a
 * home mostra as avaliações fixas de `lib/site-novo/home.ts`.
 *
 * Regras do Google para este conteúdo (developers.google.com/maps/documentation/
 * places/web-service/policies): nada de guardar ou cachear as avaliações (só o
 * Place ID pode ser guardado), cada avaliação aparece com nome, foto e link de
 * quem avaliou, com acesso à avaliação no Google Maps e a marca "Google Maps".
 *
 * Custo: nota, total e avaliações são do SKU "Place Details Enterprise +
 * Atmosphere" — 1.000 consultas grátis por mês e US$ 25 por mil depois disso.
 * A home só consulta quando a seção de avaliações aparece na tela.
 */

export type AvaliacaoDoGoogle = {
  autor: string;
  foto: string | null;
  perfil: string | null;
  estrelas: number;
  texto: string;
  quando: string;
  link: string | null;
};

export type AvaliacoesDoGoogle = {
  nota: number;
  total: number;
  link: string | null;
  avaliacoes: AvaliacaoDoGoogle[];
};

type ReviewDaApi = {
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};

type PlaceDaApi = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: ReviewDaApi[];
};

export function avaliacoesLigadas() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID);
}

/** Consulta o Google agora. Devolve null se não estiver configurado ou se a consulta falhar. */
export async function buscarAvaliacoesDoGoogle(): Promise<AvaliacoesDoGoogle | null> {
  const chave = process.env.GOOGLE_PLACES_API_KEY;
  const lugar = process.env.GOOGLE_PLACE_ID;
  if (!chave || !lugar) return null;
  try {
    const resposta = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(lugar)}?languageCode=pt-BR&regionCode=BR`, {
      headers: { 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!resposta.ok) {
      console.error(JSON.stringify({ event: 'avaliacoes_google.falha', status: resposta.status }));
      return null;
    }
    const dados = (await resposta.json()) as PlaceDaApi;
    if (typeof dados.rating !== 'number' || typeof dados.userRatingCount !== 'number') return null;
    return {
      nota: dados.rating,
      total: dados.userRatingCount,
      link: dados.googleMapsUri ?? null,
      avaliacoes: (dados.reviews ?? [])
        .map((review) => ({
          autor: review.authorAttribution?.displayName?.trim() || 'Usuário do Google',
          foto: review.authorAttribution?.photoUri ?? null,
          perfil: review.authorAttribution?.uri ?? null,
          estrelas: Math.round(review.rating ?? 0),
          texto: (review.text?.text ?? review.originalText?.text ?? '').trim(),
          quando: review.relativePublishTimeDescription ?? '',
          link: review.googleMapsUri ?? null,
        }))
        .filter((avaliacao) => avaliacao.texto),
    };
  } catch (error) {
    console.error(JSON.stringify({ event: 'avaliacoes_google.falha', erro: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}
