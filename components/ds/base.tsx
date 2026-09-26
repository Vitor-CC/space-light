/**
 * Peças do Design System 2026 (Figma "01 · Design System") que não precisam de
 * estado: servem tanto a componente de servidor quanto de cliente. As que têm
 * estado (abas, painel lateral, interruptor, menu do portal) ficam em
 * `interativo.tsx`.
 */
import Image from 'next/image';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/* ─── Botão ──────────────────────────────────────────────────────────────── */

export type BotaoTipo = 'primario' | 'escuro' | 'secundario' | 'inverso' | 'link' | 'perigo' | 'fantasma';
export type BotaoTamanho = 'P' | 'M' | 'L';

const botaoTipo: Record<BotaoTipo, string> = {
  primario: 'bg-ds-amarelo text-ds-texto hover:bg-[#eab900]',
  escuro: 'bg-ds-inverso text-ds-texto-inv hover:bg-[#262626]',
  secundario: 'border-[1.5px] border-ds-borda-forte text-ds-texto hover:bg-ds-inverso hover:text-ds-texto-inv',
  inverso: 'border-[1.5px] border-ds-texto-inv text-ds-texto-inv hover:bg-ds-texto-inv hover:text-ds-texto',
  link: 'text-ds-texto hover:underline underline-offset-4 !px-0',
  perigo: 'bg-ds-perigo text-ds-texto-inv hover:bg-[#a82a22]',
  // Ação discreta dentro de tabela e lista (não existe no Figma: é o Link com borda leve).
  fantasma: 'border border-ds-borda bg-ds-superficie text-ds-texto hover:border-ds-borda-forte',
};

const botaoTamanho: Record<BotaoTamanho, string> = {
  P: 'min-h-9 gap-2 px-3 py-2 ds-botao text-[13px]',
  M: 'min-h-11 gap-2.5 px-5 py-3 ds-botao',
  // O "L" do Figma usa Plex Sans 17 semibold, não Montserrat.
  L: 'min-h-14 gap-2.5 px-7 py-[18px] font-ds-sans text-[17px] leading-5 font-semibold',
};

export function botaoClasses(tipo: BotaoTipo = 'primario', tamanho: BotaoTamanho = 'M', extra?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md transition-colors ds-foco disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
    tamanho === 'L' ? '[&_svg]:size-5' : '[&_svg]:size-[18px]',
    botaoTamanho[tamanho],
    botaoTipo[tipo],
    extra,
  );
}

export function Botao({ tipo = 'primario', tamanho = 'M', className, type = 'button', ...props }: ComponentProps<'button'> & { tipo?: BotaoTipo; tamanho?: BotaoTamanho }) {
  return <button type={type} className={botaoClasses(tipo, tamanho, className)} {...props} />;
}

/** Botão quadrado só com ícone (sino, sair, fechar, excluir). */
export function BotaoIcone({ className, rotulo, type = 'button', tom = 'claro', ...props }: ComponentProps<'button'> & { rotulo: string; tom?: 'claro' | 'escuro' | 'perigo' }) {
  const cores = tom === 'escuro'
    ? 'border-ds-borda-inv text-ds-texto-inv-2 hover:border-ds-amarelo hover:text-ds-texto-inv'
    : tom === 'perigo'
      ? 'border-ds-borda bg-ds-superficie text-ds-texto-2 hover:border-ds-perigo hover:text-ds-perigo'
      : 'border-ds-borda bg-ds-superficie text-ds-texto hover:border-ds-borda-forte';
  return <button type={type} aria-label={rotulo} title={rotulo} className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors ds-foco disabled:opacity-45 [&_svg]:size-[18px]', cores, className)} {...props} />;
}

/* ─── Tag de status ──────────────────────────────────────────────────────── */

export type Tom = 'neutro' | 'sucesso' | 'atencao' | 'perigo' | 'info' | 'sinal';

const tagTom: Record<Tom, { fundo: string; texto: string; ponto: string }> = {
  neutro: { fundo: 'bg-ds-muted', texto: 'text-ds-texto-2', ponto: 'bg-ds-texto-2' },
  sucesso: { fundo: 'bg-ds-sucesso-suave', texto: 'text-ds-sucesso', ponto: 'bg-ds-sucesso' },
  atencao: { fundo: 'bg-ds-atencao-suave', texto: 'text-ds-atencao', ponto: 'bg-ds-atencao' },
  perigo: { fundo: 'bg-ds-perigo-suave', texto: 'text-ds-perigo', ponto: 'bg-ds-perigo' },
  info: { fundo: 'bg-ds-info-suave', texto: 'text-ds-info', ponto: 'bg-ds-info' },
  sinal: { fundo: 'bg-ds-amarelo-suave', texto: 'text-ds-amarelo-texto', ponto: 'bg-ds-amarelo-texto' },
};

export function Tag({ tom = 'neutro', children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  const cor = tagTom[tom];
  return <span className={cn('inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm px-2 py-1 ds-caps', cor.fundo, cor.texto, className)}>
    <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', cor.ponto)} />
    <span className="truncate">{children}</span>
  </span>;
}

/* ─── Chip de seleção e pílula de filtro ────────────────────────────────── */

export function Chip({ selecionado, className, type = 'button', ...props }: ComponentProps<'button'> & { selecionado?: boolean }) {
  return <button type={type} aria-pressed={selecionado} className={cn('inline-flex items-center rounded-md border px-3.5 py-2.5 ds-caps-l transition-colors ds-foco', selecionado ? 'border-ds-borda-forte bg-ds-inverso text-ds-texto-inv' : 'border-ds-borda bg-ds-superficie text-ds-texto hover:border-ds-borda-forte', className)} {...props} />;
}

/** Filtro em pílula da tabela de turmas ("Todas · 48"). */
export function Pilula({ ativa, className, type = 'button', ...props }: ComponentProps<'button'> & { ativa?: boolean }) {
  return <button type={type} aria-pressed={ativa} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 font-ds-sans text-sm leading-5 font-medium transition-colors ds-foco', ativa ? 'border-ds-inverso bg-ds-inverso text-ds-texto-inv' : 'border-ds-borda bg-ds-superficie text-ds-texto hover:border-ds-borda-forte', className)} {...props} />;
}

/* ─── Campo de formulário ───────────────────────────────────────────────── */

/** Caixa do campo (input, select, textarea): borda #e4e2dc, raio 6, 14×12. */
export const campoClasses = 'w-full min-h-12 rounded-md border border-ds-borda bg-ds-superficie px-3.5 py-3 ds-body-m text-ds-texto placeholder:text-ds-texto-2 outline-none transition-colors focus:border-ds-borda-forte focus-visible:ring-2 focus-visible:ring-ds-amarelo/40 disabled:bg-ds-muted disabled:text-ds-texto-2 aria-[invalid=true]:border-ds-perigo';
export const selectClasses = cn(campoClasses, 'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2718%27 height=%2718%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27m6 9 6 6 6-6%27/></svg>")] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-11');
export const areaClasses = cn(campoClasses, 'min-h-28 resize-y');
export const rotuloClasses = 'block font-ds-sans text-sm leading-5 font-medium text-ds-texto';

/** Rótulo + campo + ajuda. O <label> envolve o campo, então dispensa id. */
export function Campo({ rotulo, ajuda, children, className }: { rotulo: ReactNode; ajuda?: ReactNode; children: ReactNode; className?: string }) {
  return <label className={cn('flex flex-col gap-2', className)}>
    <span className={rotuloClasses}>{rotulo}</span>
    {children}
    {ajuda ? <span className="block ds-caption text-ds-texto-2">{ajuda}</span> : null}
  </label>;
}

/* ─── Superfícies ───────────────────────────────────────────────────────── */

export function Cartao({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-lg border border-ds-borda bg-ds-superficie', className)} {...props} />;
}

export function CartaoCabecalho({ titulo, icone, acao, className }: { titulo: ReactNode; icone?: ReactNode; acao?: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-3 px-5 pt-5 pb-4 sm:px-6', className)}>
    <h2 className="flex min-w-0 flex-1 items-center gap-2 ds-h4 text-ds-texto [&_svg]:size-[18px]">{icone}{titulo}</h2>
    {acao}
  </div>;
}

/** Indicador do painel (rótulo em caixa alta, número grande, apoio). */
export function Indicador({ rotulo, valor, apoio, onClick, className }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; onClick?: () => void; className?: string }) {
  const corpo = <>
    <span className="ds-caps text-ds-texto-2">{rotulo}</span>
    <span className="font-ds-display text-[34px] leading-[40px] font-bold tracking-[-0.02em] text-ds-texto sm:text-[40px] sm:leading-[46px]">{valor}</span>
    {apoio ? <span className="ds-body-s text-ds-texto-2">{apoio}</span> : null}
  </>;
  const classes = cn('flex flex-col items-start gap-3 rounded-md border border-ds-borda bg-ds-superficie p-5 text-left', className);
  return onClick
    ? <button type="button" onClick={onClick} className={cn(classes, 'transition-colors hover:border-ds-borda-forte ds-foco')}>{corpo}</button>
    : <div className={classes}>{corpo}</div>;
}

export function Vazio({ icone, titulo, texto, acao, className }: { icone?: ReactNode; titulo: string; texto?: ReactNode; acao?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ds-borda bg-ds-superficie px-6 py-10 text-center', className)}>
    {icone ? <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-ds-amarelo-suave text-ds-amarelo-texto [&_svg]:size-5">{icone}</span> : null}
    <strong className="ds-body-s font-semibold text-ds-texto">{titulo}</strong>
    {texto ? <p className="max-w-md ds-caption text-ds-texto-2">{texto}</p> : null}
    {acao ? <div className="mt-3">{acao}</div> : null}
  </div>;
}

/** Faixa de aviso dentro da página (não é toast). */
export function Faixa({ tom = 'sinal', titulo, children, acao, className }: { tom?: Tom; titulo?: ReactNode; children?: ReactNode; acao?: ReactNode; className?: string }) {
  const cor = tagTom[tom];
  return <div role={tom === 'perigo' ? 'alert' : 'status'} className={cn('flex flex-col gap-3 rounded-lg px-4 py-3.5 sm:flex-row sm:items-center', cor.fundo, className)}>
    <div className="min-w-0 flex-1">
      {titulo ? <strong className={cn('block ds-body-s font-semibold', cor.texto)}>{titulo}</strong> : null}
      {children ? <div className="ds-body-s text-ds-texto">{children}</div> : null}
    </div>
    {acao}
  </div>;
}

export function BarraProgresso({ valor, total, escura, className }: { valor: number; total: number; escura?: boolean; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  // Decorativa: o número ("6 de 7") sempre aparece em texto ao lado.
  return <div aria-hidden className={cn('h-2 w-full overflow-hidden rounded-full', escura ? 'h-1.5 bg-black/18' : 'bg-ds-muted', className)}>
    <div className={cn('h-full rounded-full', escura ? 'bg-ds-inverso' : 'ds-degrade')} style={{ width: `${pct}%` }} />
  </div>;
}

/* ─── Tabela ────────────────────────────────────────────────────────────── */

export const tabelaClasses = {
  moldura: 'overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie',
  rolagem: 'overflow-x-auto',
  tabela: 'w-full border-collapse text-left',
  cabeca: 'bg-ds-muted',
  th: 'px-3 py-2.5 ds-caps font-semibold text-ds-texto-2 first:pl-6 last:pr-6 whitespace-nowrap',
  linha: 'border-t border-ds-borda transition-colors',
  linhaClicavel: 'cursor-pointer hover:bg-ds-muted/60',
  td: 'px-3 py-4 ds-body-s text-ds-texto first:pl-6 last:pr-6 align-middle',
  codigo: 'ds-mono text-ds-texto-2 whitespace-nowrap',
} as const;

/* ─── Identidade ────────────────────────────────────────────────────────── */

export function Logo({ cor = 'escuro', layout = 'horizontal', className, prioridade }: { cor?: 'escuro' | 'claro'; layout?: 'horizontal' | 'vertical'; className?: string; prioridade?: boolean }) {
  const src = `/images/branding/logo-${layout}-${cor}.svg`;
  const [w, h] = layout === 'horizontal' ? [193, 44] : [200, 157];
  return <Image src={src} alt="Space Light Engenharia" width={w} height={h} priority={prioridade} unoptimized className={cn(layout === 'horizontal' ? 'h-11 w-auto' : 'h-auto w-[200px]', className)} />;
}

export function Simbolo({ className }: { className?: string }) {
  return <Image src="/images/branding/logo-simbolo.svg" alt="" width={45} height={48} unoptimized className={cn('h-7 w-auto', className)} />;
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : partes[0]?.[1] ?? '';
  return `${primeira}${ultima}`.toUpperCase();
}

export function Avatar({ nome, tamanho = 36, className }: { nome: string; tamanho?: number; className?: string }) {
  return <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-ds-amarelo font-ds-sans text-sm leading-5 font-medium text-ds-texto', className)} style={{ width: tamanho, height: tamanho }}>{iniciais(nome)}</span>;
}

/* ─── Cabeçalho de página do portal ─────────────────────────────────────── */

export function TopoDePagina({ titulo, subtitulo, acoes, trilha, className }: { titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode; trilha?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4', className)}>
    {trilha}
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="ds-h3 text-ds-texto">{titulo}</h1>
        {subtitulo ? <div className="mt-1 ds-body-s text-ds-texto-2">{subtitulo}</div> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2.5">{acoes}</div> : null}
    </div>
  </div>;
}

/** Linha de metadados com ícone (data, local, instrutor, carga horária). */
export function Meta({ itens, className }: { itens: Array<{ icone: ReactNode; texto: ReactNode } | null | false>; className?: string }) {
  return <div className={cn('flex flex-wrap gap-x-5 gap-y-1.5', className)}>
    {itens.filter(Boolean).map((item, i) => item ? <span key={i} className="inline-flex items-center gap-1.5 ds-body-s text-ds-texto-2 [&_svg]:size-[15px] [&_svg]:shrink-0">{item.icone}{item.texto}</span> : null)}
  </div>;
}

/** Contador em pílula ao lado do rótulo das abas. */
export function Contador({ ativo, children }: { ativo?: boolean; children: ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 ds-caption', ativo ? 'bg-ds-inverso text-ds-texto-inv' : 'bg-ds-superficie text-ds-texto-2')}>{children}</span>;
}

/** Linha de lista com ícone em quadrado amarelo-suave (documentos da turma). */
export function LinhaArquivo({ titulo, detalhe, icone, acoes, className }: { titulo: ReactNode; detalhe?: ReactNode; icone: ReactNode; acoes?: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-3 border-t border-ds-borda py-3', className)}>
    <span className="flex shrink-0 items-center justify-center rounded-md bg-ds-amarelo-suave p-2 text-ds-texto [&_svg]:size-4">{icone}</span>
    <div className="min-w-0 flex-1">
      <p className="truncate ds-body-s font-medium text-ds-texto">{titulo}</p>
      {detalhe ? <p className="truncate ds-caption text-ds-texto-2">{detalhe}</p> : null}
    </div>
    {acoes ? <div className="flex shrink-0 items-center gap-1.5">{acoes}</div> : null}
  </div>;
}
