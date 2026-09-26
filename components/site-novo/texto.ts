/**
 * Escala de texto do site, pensada primeiro para 375px, nos estilos do Design
 * System 2026: Montserrat nos títulos e rótulos, IBM Plex Sans no corpo,
 * monoespaçada só em código e número.
 */
export const texto = {
  eyebrow: 'ds-caps text-doc-mark',
  tituloPagina: 'ds-h1 text-balance',
  tituloSecao: 'ds-h2 text-balance',
  tituloItem: 'ds-h4',
  corpo: 'max-w-measure ds-body-m',
  apoio:
    'max-w-measure ds-body-m text-doc-ink-muted',
  rotulo: 'font-doc-mono text-xs text-doc-ink-muted',
  link: 'doc-focus font-semibold underline decoration-ds-amarelo decoration-2 underline-offset-4 hover:decoration-doc-ink',
} as const;

/**
 * Grades de conteúdo. O briefing permite no máximo duas colunas — a coluna de
 * margem do documento não conta.
 */
export const grade = {
  /** A partir de 1024: texto corrido, listas, tabelas e figuras. */
  duas: 'grid gap-y-10 lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16',
  /**
   * Só a partir de 1280, quando uma das colunas leva título grande: em 1024 a
   * coluna tem ~340px e uma palavra como "TREINAMENTO" não caberia.
   */
  duasComTitulo:
    'grid gap-y-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-x-16',
} as const;
