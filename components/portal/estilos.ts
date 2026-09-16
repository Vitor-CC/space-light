/*
 * Classes comuns aos portais. Módulo neutro (sem 'use client') para que
 * componentes de servidor — login, cadastro do instrutor — recebam as strings.
 */

export { botao } from '@/components/site-novo/botao';
export { caixa, controle, seletor } from '@/components/site-novo/controles';

export const rotulo = 'mb-1.5 block text-sm font-semibold text-doc-ink';
/** `<input>`/`<select>`/`<textarea>` nativos, fora do kit do shadcn. */
export const campo =
  'doc-focus h-12 w-full border border-doc-ink-muted bg-doc-sheet px-3 text-base text-doc-ink outline-none placeholder:text-doc-ink-muted hover:border-doc-ink disabled:bg-doc-paper disabled:text-doc-ink-muted aria-invalid:border-doc-error';
export const areaDeTexto = `${campo} h-auto min-h-28 py-3`;
export const ajuda = 'mt-1.5 block text-sm text-doc-ink-muted';
export const mono = 'font-doc-mono tabular-nums';
export const painel = 'border border-doc-rule-strong bg-doc-sheet';
export const botaoPerigo =
  'doc-focus inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-doc-error px-4 text-sm font-semibold text-doc-error transition-colors hover:bg-doc-error hover:text-doc-sheet disabled:opacity-50';
export const botaoTexto =
  'doc-focus inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-sl-gold decoration-2 underline-offset-4 hover:decoration-doc-ink disabled:opacity-50';
export const botaoIcone =
  'doc-focus inline-flex size-10 shrink-0 items-center justify-center border border-doc-rule-strong text-doc-ink-muted transition-colors hover:border-doc-ink hover:text-doc-ink disabled:opacity-50';
/** Título de bloco dentro de uma tela. */
export const tituloBloco = 'font-heading text-lg font-bold leading-tight';
