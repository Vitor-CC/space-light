'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export { botao } from '@/components/site-novo/botao';
export { caixa, controle, seletor } from '@/components/site-novo/controles';

/*
 * Peças comuns aos três portais, na direção "documento técnico" do site novo:
 * fio no lugar de card, raio zero, sem sombra, cor só por token.
 */

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

// ---------------------------------------------------------------------------
// Estado da turma: forma + rótulo, cor só como reforço
// ---------------------------------------------------------------------------

export function rotuloDoEstado(status: string) {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em execução';
  return 'Programada';
}

/** Quadrado vazio = programada, metade = em execução, cheio = concluída. */
export function SeloDeEstado({
  status,
  texto,
}: {
  status: string;
  texto?: string;
}) {
  const forma =
    status === 'completed'
      ? 'bg-doc-ink'
      : status === 'in_progress'
        ? 'bg-[linear-gradient(90deg,var(--sl-gold-ink)_50%,transparent_50%)] border-doc-mark'
        : '';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-doc-mono text-xs whitespace-nowrap',
        status === 'in_progress' ? 'text-doc-mark' : 'text-doc-ink',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2.5 shrink-0 border border-doc-ink', forma)}
      />
      {texto ?? rotuloDoEstado(status)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cabeçalho de tela
// ---------------------------------------------------------------------------

export function Cabecalho({
  titulo,
  meta,
  voltar,
  acoes,
  children,
}: {
  titulo: React.ReactNode;
  meta?: React.ReactNode;
  voltar?: { rotulo: string; aoVoltar: () => void };
  acoes?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-doc-ink pb-5">
      {voltar ? (
        <button
          type="button"
          onClick={voltar.aoVoltar}
          className={cn(botaoTexto, 'mb-4 no-underline')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {voltar.rotulo}
        </button>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl leading-none font-extrabold text-balance uppercase md:text-4xl">
            {titulo}
          </h1>
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-doc-ink-muted">
              {meta}
            </div>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
      </div>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Abas internas (Base UI: setas do teclado, aria-selected, aria-controls)
// ---------------------------------------------------------------------------

export type Aba<T extends string> = {
  id: T;
  rotulo: string;
  contagem?: number;
};

export function Abas<T extends string>({
  abas,
  ativa,
  aoMudar,
  rotuloDaLista,
  children,
  className,
}: {
  abas: readonly Aba<T>[];
  ativa: T;
  aoMudar: (id: T) => void;
  rotuloDaLista: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root
      value={ativa}
      onValueChange={(valor) => aoMudar(valor as T)}
      className={className}
    >
      <TabsPrimitive.List
        aria-label={rotuloDaLista}
        className="flex gap-6 overflow-x-auto border-b border-doc-rule-strong"
      >
        {abas.map((aba) => (
          <TabsPrimitive.Tab
            key={aba.id}
            value={aba.id}
            className="doc-focus relative -mb-px inline-flex shrink-0 items-baseline gap-2 border-b-2 border-transparent py-3 text-sm font-semibold text-doc-ink-muted transition-colors hover:text-doc-ink data-active:border-sl-gold data-active:text-doc-ink"
          >
            {aba.rotulo}
            {aba.contagem === undefined ? null : (
              <span className={cn(mono, 'text-xs')}>{aba.contagem}</span>
            )}
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
      <TabsPrimitive.Panel value={ativa} className="pt-6 outline-none">
        {children}
      </TabsPrimitive.Panel>
    </TabsPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Estados: vazio, carregando, erro, sem permissão
// ---------------------------------------------------------------------------

export function Vazio({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-doc-rule-strong px-5 py-8">
      <p className="font-semibold">{titulo}</p>
      {texto ? (
        <p className="mt-1 max-w-measure text-sm text-doc-ink-muted">{texto}</p>
      ) : null}
      {children ? (
        <div className="mt-4 flex flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/** Esqueleto com a forma de uma lista de linhas. */
export function Carregando({
  linhas = 4,
  rotulo: texto = 'Carregando',
}: {
  linhas?: number;
  rotulo?: string;
}) {
  return (
    <output
      aria-label={texto}
      className="block border-t border-doc-rule-strong"
    >
      {Array.from({ length: linhas }, (_, indice) => (
        <span
          key={indice}
          className="flex items-center gap-4 border-b border-doc-rule-strong py-4"
        >
          <span className="h-3 w-16 animate-pulse bg-doc-rule" />
          <span className="h-3 flex-1 animate-pulse bg-doc-rule" />
          <span className="hidden h-3 w-24 animate-pulse bg-doc-rule sm:block" />
        </span>
      ))}
    </output>
  );
}

export function ErroAoCarregar({
  mensagem,
  aoTentar,
}: {
  mensagem: string;
  aoTentar: () => void;
}) {
  return (
    <div role="alert" className="border-l-2 border-doc-error py-2 pl-4">
      <p className="font-semibold text-doc-error">{mensagem}</p>
      <button
        type="button"
        onClick={aoTentar}
        className={cn(botaoTexto, 'mt-2')}
      >
        Tentar de novo
      </button>
    </div>
  );
}

export function SemPermissao({ texto }: { texto: string }) {
  return (
    <div className="border-l-2 border-doc-rule-strong py-2 pl-4">
      <p className="font-semibold">Acesso restrito</p>
      <p className="mt-1 text-sm text-doc-ink-muted">{texto}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aviso de resultado das ações
// ---------------------------------------------------------------------------

export function useAviso(duracao = 6000) {
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(''), duracao);
    return () => window.clearTimeout(timer);
  }, [aviso, duracao]);
  return [aviso, setAviso] as const;
}

export function AvisoFlutuante({ texto }: { texto: string }) {
  return (
    <output
      aria-live="polite"
      className={cn(
        'fixed inset-x-4 bottom-4 z-50 border-l-4 border-sl-gold bg-sl-black p-4 text-sm text-sl-white sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm',
        !texto && 'sr-only',
      )}
    >
      {texto}
    </output>
  );
}

// ---------------------------------------------------------------------------
// Pares rótulo/valor
// ---------------------------------------------------------------------------

export function Dados({
  itens,
  className,
}: {
  itens: readonly (readonly [string, React.ReactNode])[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid border-t border-doc-rule-strong sm:grid-cols-2 sm:gap-x-8',
        className,
      )}
    >
      {itens.map(([chave, valor]) => (
        <div
          key={chave}
          className="flex justify-between gap-4 border-b border-doc-rule-strong py-3 text-sm"
        >
          <dt className="text-doc-ink-muted">{chave}</dt>
          <dd className="min-w-0 text-right font-semibold break-words">
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Linha de confirmação com as duas saídas, no lugar de um modal. */
export function Confirmar({
  titulo,
  texto,
  confirmar,
  aoConfirmar,
  aoCancelar,
  ocupado,
  perigo = false,
  children,
}: {
  titulo: string;
  texto?: React.ReactNode;
  confirmar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  ocupado?: boolean;
  perigo?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className={cn(
        'border-l-4 bg-doc-sheet p-4',
        perigo ? 'border-doc-error' : 'border-sl-gold',
      )}
    >
      <p className="font-semibold">{titulo}</p>
      {texto ? (
        <div className="mt-1 max-w-measure text-sm text-doc-ink-muted">
          {texto}
        </div>
      ) : null}
      {children}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={ocupado}
          className={
            perigo
              ? botaoPerigo
              : 'doc-focus inline-flex h-10 items-center justify-center bg-sl-gold px-4 text-sm font-semibold text-sl-black hover:bg-sl-orange disabled:opacity-50'
          }
        >
          {ocupado ? 'Aguarde…' : confirmar}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="doc-focus inline-flex h-10 items-center justify-center border border-doc-ink px-4 text-sm font-semibold hover:bg-doc-ink hover:text-doc-paper"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
