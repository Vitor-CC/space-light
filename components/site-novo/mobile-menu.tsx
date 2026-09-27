'use client';

import { ArrowRight, ChevronDown, ChevronRight, Lock, Menu, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/components/ds/base';
import { botao } from '@/components/site-novo/botao';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS, NORMA_MAIS_APLICADA } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

const linha = 'doc-focus flex items-center border-b border-ds-borda-inv py-[18px] ds-h4';
const bloco = 'doc-focus flex flex-col gap-0.5 rounded-lg px-3 py-2.5';

/**
 * Menu abaixo de 1280, no desenho do Figma ("Menu aberto · Mobile"): painel
 * preto com as normas em blocos (a NR 23 em amarelo), as páginas e, embaixo,
 * proposta, portal e WhatsApp. No tablet o painel ocupa a lateral.
 */
export function MobileMenu() {
  const [aberto, setAberto] = useState(false);
  const [normasAbertas, setNormasAbertas] = useState(true);
  const fechar = () => setAberto(false);

  return <Sheet open={aberto} onOpenChange={setAberto}>
    <SheetTrigger aria-label="Abrir menu" className="doc-focus flex size-10 items-center justify-center rounded-md border border-ds-borda-inv text-ds-texto-inv xl:hidden">
      <Menu className="size-[22px]" aria-hidden="true" />
    </SheetTrigger>
    <SheetContent side="right" showCloseButton={false} className="dark gap-0 overflow-y-auto border-0 bg-ds-inverso text-ds-texto-inv shadow-none data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-md">
      <div className="flex h-header shrink-0 items-center justify-between border-b border-ds-borda-inv px-5">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Link href={rotas.inicio} onClick={fechar} aria-label="Space Light Engenharia — página inicial" className="doc-focus">
          <Logo cor="claro" className="h-9" />
        </Link>
        <button type="button" onClick={fechar} aria-label="Fechar menu" className="doc-focus flex rounded-md bg-ds-amarelo p-2 text-ds-texto">
          <X className="size-[22px]" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col px-5 pt-3">
        <div className="border-b border-ds-borda-inv pb-3">
          <button type="button" aria-expanded={normasAbertas} aria-controls="menu-normas" onClick={() => setNormasAbertas((atual) => !atual)} className={cn('doc-focus flex w-full items-center py-4 text-left ds-h4', normasAbertas && 'text-ds-amarelo')}>
            <span className="flex-1">Treinamentos</span>
            <ChevronDown className={cn('size-5 transition-transform', normasAbertas && 'rotate-180')} aria-hidden="true" />
          </button>
          {normasAbertas ? <ul id="menu-normas" className="grid grid-cols-2 gap-2">
            {NORMAS.map((norma) => {
              const destaque = norma.slug === NORMA_MAIS_APLICADA;
              return <li key={norma.slug}>
                <Link href={rotas.norma(norma.slug)} onClick={fechar} className={cn(bloco, destaque ? 'bg-ds-amarelo text-ds-texto' : 'bg-ds-inverso-2')}>
                  <span className={cn('font-ds-display text-base leading-6 font-extrabold', !destaque && 'text-ds-amarelo')}>{norma.codigo}</span>
                  <span className={cn('ds-caption', !destaque && 'text-ds-texto-inv-2')}>{norma.rotulo}</span>
                </Link>
              </li>;
            })}
            <li>
              <Link href={rotas.contato} onClick={fechar} className={cn(bloco, 'bg-ds-inverso-2')}>
                <span aria-hidden="true" className="font-ds-display text-base leading-6 font-extrabold text-ds-amarelo">+</span>
                <span className="ds-caption text-ds-texto-inv-2">Outras NRs</span>
              </Link>
            </li>
          </ul> : null}
        </div>
        <Link href={rotas.comoTrabalhamos} onClick={fechar} className={linha}><span className="flex-1">Como trabalhamos</span><ChevronRight className="size-5" aria-hidden="true" /></Link>
        <Link href={rotas.portalCliente} onClick={fechar} className={linha}><span className="flex-1">Portal do cliente</span><ChevronRight className="size-5" aria-hidden="true" /></Link>
        <Link href={rotas.contato} onClick={fechar} className={linha}><span className="flex-1">Contato</span><ChevronRight className="size-5" aria-hidden="true" /></Link>
      </nav>

      <div className="flex flex-col gap-2.5 px-5 pt-4 pb-[34px]">
        <Link href={rotas.contato} onClick={fechar} className={botao({ tamanho: 'lg', className: 'w-full' })}>Solicitar proposta<ArrowRight className="size-5" aria-hidden="true" /></Link>
        <Link href={rotas.portal} onClick={fechar} className={botao({ variante: 'inverso', tamanho: 'lg', className: 'w-full' })}>Entrar no portal<Lock className="size-5" aria-hidden="true" /></Link>
        <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className="doc-focus flex items-center justify-center gap-2 pt-2 ds-body-s text-ds-texto-inv-2 hover:text-ds-texto-inv">
          <MessageCircle className="size-4" aria-hidden="true" />WhatsApp {WHATSAPP.numero}
        </a>
      </div>
    </SheetContent>
  </Sheet>;
}
