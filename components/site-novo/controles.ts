/**
 * Controles do kit (`components/ui`) vestidos para o site novo. As cores já
 * chegam pelo escopo `.doc-ui` do globals.css (borda, erro, foco); aqui ficam
 * medida, tipo e o foco sólido do documento no lugar do anel translúcido.
 */

/** `Input` e `Textarea`. */
export const controle =
  'doc-focus h-12 bg-doc-sheet px-3 text-base text-doc-ink focus-visible:ring-0 not-aria-invalid:hover:border-doc-ink aria-invalid:ring-0 md:text-base';

/** `NativeSelect`: o kit põe as classes no invólucro, então o alvo é o select. */
export const seletor =
  'w-full [&_select]:doc-focus [&_select]:h-12 [&_select]:bg-doc-sheet [&_select]:pl-3 [&_select]:text-base [&_select]:text-doc-ink [&_select]:focus-visible:ring-0 [&_select]:not-aria-invalid:hover:border-doc-ink [&_select]:aria-invalid:ring-0 [&_svg]:text-doc-ink';

/** `Checkbox`: quadrado de 20px, marcado em ouro com borda preta. */
export const caixa =
  'doc-focus size-5 bg-doc-sheet focus-visible:ring-0 aria-invalid:ring-0 data-checked:border-sl-black data-checked:bg-sl-gold data-checked:text-sl-black';
