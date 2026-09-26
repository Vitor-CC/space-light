'use client';

/**
 * Peças do Design System 2026 com estado: abas, painel lateral, interruptor,
 * aviso flutuante e a moldura dos portais (menu lateral preto do Figma).
 */
import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Avatar, Contador, Logo, Simbolo } from '@/components/ds/base';
import { cn } from '@/lib/utils';

/* ─── Abas sublinhadas (detalhe da turma) ───────────────────────────────── */

export type Aba<T extends string> = { id: T; rotulo: string; contador?: ReactNode };

export function Abas<T extends string>({ abas, ativa, onChange, rotulo, className }: { abas: Aba<T>[]; ativa: T; onChange: (id: T) => void; rotulo: string; className?: string }) {
  return <div role="tablist" aria-label={rotulo} className={cn('flex gap-7 overflow-x-auto overflow-y-hidden border-b border-ds-borda', className)}>
    {abas.map((aba) => {
      const sel = aba.id === ativa;
      return <button key={aba.id} type="button" role="tab" aria-selected={sel} onClick={() => onChange(aba.id)} className={cn('-mb-px inline-flex shrink-0 items-center gap-2 border-b-[3px] pb-3 font-ds-sans text-base leading-6 font-semibold transition-colors ds-foco', sel ? 'border-ds-amarelo text-ds-texto' : 'border-transparent text-ds-texto-2 hover:text-ds-texto')}>
        {aba.rotulo}
        {aba.contador !== undefined ? <Contador ativo={sel}>{aba.contador}</Contador> : null}
      </button>;
    })}
  </div>;
}

/* ─── Controle segmentado (login, abas do instrutor) ────────────────────── */

export function Segmentado<T extends string>({ opcoes, ativa, onChange, rotulo, tom = 'claro', className }: { opcoes: Array<{ id: T; rotulo: ReactNode; curto?: ReactNode; icone?: ReactNode }>; ativa: T; onChange: (id: T) => void; rotulo: string; tom?: 'claro' | 'escuro'; className?: string }) {
  return <div role="tablist" aria-label={rotulo} className={cn('flex gap-1 rounded-lg p-1', tom === 'claro' ? 'bg-ds-muted' : 'bg-ds-superficie', className)}>
    {opcoes.map((op) => {
      const sel = op.id === ativa;
      const ativo = tom === 'claro' ? 'bg-ds-superficie text-ds-texto shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-ds-inverso text-ds-texto-inv';
      return <button key={op.id} type="button" role="tab" aria-selected={sel} onClick={() => onChange(op.id)} className={cn('flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2.5 font-ds-sans text-sm leading-5 font-medium transition-colors ds-foco [&_svg]:size-4 [&_svg]:shrink-0', sel ? ativo : 'text-ds-texto-2 hover:text-ds-texto')}>
        {op.icone}{op.curto ? <><span className="truncate sm:hidden">{op.curto}</span><span className="hidden truncate sm:inline">{op.rotulo}</span></> : <span className="truncate">{op.rotulo}</span>}
      </button>;
    })}
  </div>;
}

/* ─── Interruptor ───────────────────────────────────────────────────────── */

export function Interruptor({ ligado, onChange, rotulo, descricao, name, disabled }: { ligado: boolean; onChange: (valor: boolean) => void; rotulo: ReactNode; descricao?: ReactNode; name?: string; disabled?: boolean }) {
  const id = useId();
  return <div className="flex items-center gap-3">
    <button id={id} type="button" role="switch" aria-checked={ligado} disabled={disabled} onClick={() => onChange(!ligado)} className={cn('relative h-[22px] w-10 shrink-0 rounded-full transition-colors ds-foco disabled:opacity-45', ligado ? 'bg-ds-inverso' : 'bg-ds-borda')}>
      <span className={cn('absolute top-[3px] size-4 rounded-full transition-all', ligado ? 'left-[21px] bg-ds-amarelo' : 'left-[3px] bg-ds-superficie')} />
    </button>
    {name ? <input type="hidden" name={name} value={ligado ? '1' : ''} /> : null}
    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
      <span className="block ds-body-s font-medium text-ds-texto">{rotulo}</span>
      {descricao ? <span className="block ds-caption text-ds-texto-2">{descricao}</span> : null}
    </label>
  </div>;
}

/* ─── Painel lateral (drawer da direita) ────────────────────────────────── */

export function PainelLateral({ aberto, onFechar, sobretitulo, titulo, subtitulo, children, acoes, largura = 440 }: { aberto: boolean; onFechar: () => void; sobretitulo?: ReactNode; titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode; acoes?: ReactNode; largura?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = overflow; anterior?.focus?.(); };
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return <div className="fixed inset-0 z-[80]">
    <button type="button" aria-label="Fechar painel" onClick={onFechar} className="absolute inset-0 bg-black/40" />
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={tituloId} className="absolute inset-y-0 right-0 flex w-full flex-col bg-ds-superficie shadow-[-12px_0_40px_rgba(0,0,0,0.2)] outline-none" style={{ maxWidth: largura }}>
      <div className="flex flex-col gap-2 border-b border-ds-borda px-5 pt-6 pb-5 sm:px-7 sm:pt-7">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate ds-mono text-ds-texto-2">{sobretitulo}</span>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-m-2 rounded-md p-2 text-ds-texto hover:bg-ds-muted ds-foco"><X className="size-5" /></button>
        </div>
        <h2 id={tituloId} className="ds-h3 text-ds-texto">{titulo}</h2>
        {subtitulo ? <p className="ds-body-s text-ds-texto-2">{subtitulo}</p> : null}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
      {acoes ? <div className="flex gap-2.5 border-t border-ds-borda px-5 py-5 sm:px-7">{acoes}</div> : null}
    </div>
  </div>;
}

/* ─── Aviso flutuante (toast) ───────────────────────────────────────────── */

export function useAviso(duracao = 6000) {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    if (!texto) return;
    const t = window.setTimeout(() => setTexto(''), duracao);
    return () => window.clearTimeout(t);
  }, [texto, duracao]);
  return [texto, setTexto] as const;
}

export function Aviso({ texto, onFechar }: { texto: string; onFechar: () => void }) {
  if (!texto) return null;
  return <output className="fixed inset-x-4 bottom-4 z-[90] flex items-start gap-3 rounded-lg bg-ds-inverso p-4 ds-body-s text-ds-texto-inv shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm">
    <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-ds-amarelo" />
    <span className="min-w-0 flex-1">{texto}</span>
    <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="-m-1 rounded p-1 text-ds-texto-inv-2 hover:text-ds-texto-inv"><X className="size-4" /></button>
  </output>;
}

/* ─── Moldura dos portais ───────────────────────────────────────────────── */

export type ItemDeMenu<T extends string> = { id: T; rotulo: string; icone: ReactNode; selo?: number };

function ItemMenu({ ativo, icone, rotulo, selo, onClick }: { ativo: boolean; icone: ReactNode; rotulo: string; selo?: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-current={ativo ? 'page' : undefined} className={cn('flex w-full items-center gap-3 rounded-md py-2.5 pr-3 pl-3.5 text-left font-ds-sans text-sm leading-5 font-medium transition-colors ds-foco [&_svg]:size-[18px] [&_svg]:shrink-0', ativo ? 'border-l-2 border-ds-amarelo bg-ds-inverso-2 text-ds-texto-inv [&_svg]:text-ds-amarelo' : 'text-ds-texto-inv-2 hover:bg-ds-inverso-2 hover:text-ds-texto-inv')}>
    {icone}<span className="min-w-0 flex-1 truncate">{rotulo}</span>
    {selo ? <span className="rounded-full bg-ds-amarelo px-1.5 py-px ds-caption font-medium text-ds-texto">{selo}</span> : null}
  </button>;
}

export function PortalShell<T extends string>({ area, itens, ativo, onNavegar, usuario, onUsuario, children, rodapeMenu }: {
  area: string;
  itens: ItemDeMenu<T>[];
  ativo: T | null;
  onNavegar: (id: T) => void;
  usuario: { nome: string; detalhe: string };
  /** Clique no nome do usuário (abre o perfil/cadastro quando existe). */
  onUsuario?: () => void;
  children: ReactNode;
  /** Itens extras abaixo da navegação (ex.: link para o site). */
  rodapeMenu?: ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => {
    if (!menuAberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [menuAberto]);

  const navegar = (id: T) => { setMenuAberto(false); onNavegar(id); window.scrollTo({ top: 0 }); };

  const menu = <div className="flex h-full flex-col gap-8 px-4 pt-7 pb-6">
    <a href="/" aria-label="Space Light Engenharia — site" className="w-fit"><Logo cor="claro" /></a>
    <span className="ds-caps text-ds-amarelo">{area}</span>
    <nav aria-label={`Navegação · ${area}`} className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {itens.map((item) => <ItemMenu key={item.id} ativo={item.id === ativo} icone={item.icone} rotulo={item.rotulo} selo={item.selo} onClick={() => navegar(item.id)} />)}
      {rodapeMenu}
    </nav>
    <div className="flex items-center gap-3 border-t border-ds-borda-inv pt-4">
      <Avatar nome={usuario.nome} />
      {onUsuario
        ? <button type="button" onClick={() => { setMenuAberto(false); onUsuario(); }} className="min-w-0 flex-1 text-left ds-foco rounded"><span className="block truncate ds-body-s font-medium text-ds-texto-inv">{usuario.nome}</span><span className="block truncate ds-caption text-ds-texto-inv-2">{usuario.detalhe}</span></button>
        : <div className="min-w-0 flex-1"><span className="block truncate ds-body-s font-medium text-ds-texto-inv">{usuario.nome}</span><span className="block truncate ds-caption text-ds-texto-inv-2">{usuario.detalhe}</span></div>}
      <form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sair" title="Sair" className="rounded p-1 text-ds-texto-inv-2 hover:text-ds-amarelo ds-foco"><LogOut className="size-[18px]" /></button></form>
    </div>
  </div>;

  return <div className="min-h-screen bg-ds-muted text-ds-texto lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
    <aside className="hidden bg-ds-inverso lg:block"><div className="sticky top-0 h-screen">{menu}</div></aside>

    <header className="sticky top-0 z-50 flex items-center gap-2.5 bg-ds-inverso px-4 py-3 lg:hidden">
      <Simbolo />
      <div className="min-w-0 flex-1">
        <span className="block ds-caps text-ds-amarelo">{area}</span>
        <span className="block truncate font-ds-sans text-base leading-6 font-semibold text-ds-texto-inv">Olá, {usuario.nome.split(' ')[0]}</span>
      </div>
      <button type="button" onClick={() => setMenuAberto(true)} aria-label="Abrir menu" aria-expanded={menuAberto} className="rounded-md p-2 text-ds-texto-inv ds-foco"><Menu className="size-6" /></button>
    </header>

    {menuAberto ? <div className="fixed inset-0 z-[70] lg:hidden">
      <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-y-0 left-0 w-[min(300px,85vw)] bg-ds-inverso">
        <button type="button" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" className="absolute top-4 right-3 rounded-md p-2 text-ds-texto-inv-2 hover:text-ds-texto-inv"><X className="size-5" /></button>
        {menu}
      </div>
    </div> : null}

    <main className="min-w-0 px-4 pt-6 pb-12 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
  </div>;
}
