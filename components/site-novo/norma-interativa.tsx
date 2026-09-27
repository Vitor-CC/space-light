'use client';

import { Calendar, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * As duas partes da página de norma que mudam no celular: "Para quem é", que o
 * Figma troca por um seletor Funções/Situações, e a grade de conteúdo, que
 * mostra seis linhas e um botão para ver o resto. No desktop aparece tudo.
 */

const LISTAS = [
  { chave: 'funcoes', titulo: 'Funções', icone: Users },
  { chave: 'situacoes', titulo: 'Situações', icone: Calendar },
] as const;

export function PublicoDaNorma({ funcoes, situacoes }: { funcoes: readonly string[]; situacoes: readonly string[] }) {
  const [aberta, setAberta] = useState<(typeof LISTAS)[number]['chave']>('funcoes');
  const itens = { funcoes, situacoes };
  return <>
    <div className="flex gap-1 rounded-lg bg-ds-superficie p-1 lg:hidden">
      {LISTAS.map((lista) => <button key={lista.chave} type="button" aria-pressed={aberta === lista.chave} onClick={() => setAberta(lista.chave)} className={cn('doc-focus flex-1 rounded-md px-3.5 py-[9px] ds-body-s font-medium transition-colors', aberta === lista.chave ? 'bg-ds-inverso text-ds-texto-inv shadow-[0_1px_1.5px_rgba(0,0,0,0.08)]' : 'text-ds-texto-2')}>{lista.titulo}</button>)}
    </div>
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {LISTAS.map((lista) => {
        const Icone = lista.icone;
        return <div key={lista.chave} className={cn('lg:flex lg:flex-col lg:gap-2 lg:rounded-md lg:bg-ds-superficie lg:p-8', aberta !== lista.chave && 'max-lg:hidden')}>
          <h3 className="hidden items-center gap-3 pb-3 font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:flex">
            <span aria-hidden="true" className="flex rounded-full bg-ds-inverso p-2.5 text-ds-amarelo"><Icone className="size-5" /></span>{lista.titulo}
          </h3>
          <ul>
            {itens[lista.chave].map((item) => <li key={item} className="flex items-start gap-2.5 border-b border-ds-borda py-2.5 ds-body-s lg:gap-3 lg:border-t lg:border-b-0 lg:py-3.5 lg:ds-body-m">
              <ChevronRight className="mt-0.5 size-4 shrink-0 lg:mt-[3px] lg:size-[18px]" aria-hidden="true" />{item}
            </li>)}
          </ul>
        </div>;
      })}
    </div>
  </>;
}

/**
 * Lista que no celular começa recolhida. As linhas que ficam escondidas levam
 * `max-lg:hidden max-lg:group-data-[aberta]/lista:flex`; o botão abre todas.
 */
export function ListaRecolhivel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return <div data-aberta={aberta ? '' : undefined} className="group/lista">
    {children}
    {aberta ? null : <button type="button" onClick={() => setAberta(true)} className="doc-focus flex w-full items-center justify-center gap-2 pt-3.5 pb-3 ds-body-s font-medium lg:hidden">
      {rotulo}<ChevronDown className="size-4" aria-hidden="true" />
    </button>}
  </div>;
}
