/**
 * Escala de texto do site novo, pensada primeiro para 375px. Work Sans nos
 * títulos, Open Sans no corpo, monoespaçada só em rótulo, código e número.
 */
export const texto = {
  eyebrow:
    'font-heading text-xs font-bold tracking-[0.16em] text-doc-mark uppercase',
  tituloPagina:
    'font-heading text-[clamp(2.75rem,1.6rem+5vw,6rem)] leading-[0.92] font-black text-balance uppercase',
  tituloSecao:
    'font-heading text-[clamp(2rem,1.2rem+3.4vw,3.75rem)] leading-[0.95] font-extrabold text-balance uppercase',
  tituloItem: 'font-heading text-lg leading-tight font-bold',
  corpo: 'max-w-measure text-base leading-relaxed',
  apoio: 'max-w-measure text-base leading-relaxed text-doc-ink-muted',
  rotulo: 'font-doc-mono text-xs text-doc-ink-muted',
  link: 'doc-focus font-semibold underline decoration-sl-gold decoration-2 underline-offset-4 hover:decoration-doc-ink',
} as const;
