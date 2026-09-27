'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { botao } from '@/components/site-novo/botao';
import { NORMAS, NORMA_MAIS_APLICADA } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

const itemNav =
  'doc-focus inline-flex h-10 items-center gap-1 whitespace-nowrap font-ds-sans text-sm leading-5 font-medium text-ds-texto-inv decoration-ds-amarelo decoration-2 underline-offset-[10px] hover:underline';

/**
 * Navegação a partir de 1280 (entre 1024 e 1280 os quatro itens, o Entrar e
 * o botão não cabem numa linha, e fica o menu do celular).
 *
 * "Treinamentos" abre o menu suspenso do Figma ("Header · Menu Treinamentos
 * aberto"): as normas em duas colunas e, à direita, o cartão preto para quem
 * não achou a NR. A página por trás escurece. Abre no clique e fecha no Esc,
 * no clique fora e ao escolher um destino.
 */
export function DesktopNav() {
  const [aberto, setAberto] = useState(false);
  const idDoPainel = useId();
  const gatilho = useRef<HTMLButtonElement>(null);
  const fechar = () => setAberto(false);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      gatilho.current?.focus();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  return <nav aria-label="Navegação principal" className="hidden xl:block">
    <ul className="flex items-center gap-9">
      <li>
        <button ref={gatilho} type="button" aria-expanded={aberto} aria-controls={idDoPainel} onClick={() => setAberto((atual) => !atual)} className={cn(itemNav, aberto && 'text-ds-amarelo hover:no-underline')}>
          Treinamentos
          <ChevronDown className={cn('size-4 transition-transform duration-150', aberto && 'rotate-180')} aria-hidden="true" />
        </button>
      </li>
      <li><Link href={rotas.comoTrabalhamos} className={itemNav}>Como trabalhamos</Link></li>
      <li><Link href={rotas.portalCliente} className={itemNav}>Portal do cliente</Link></li>
      <li><Link href={rotas.contato} className={itemNav}>Contato</Link></li>
    </ul>

    {aberto ? <>
      {/* A sobreposição fica fora do cabeçalho para escurecer a página e deixar o cabeçalho por cima. */}
      {createPortal(<div aria-hidden="true" onClick={fechar} className="fixed inset-0 z-30 bg-black/55" />, document.body)}
      <div id={idDoPainel} className="absolute inset-x-0 top-full">
        <div className="mx-auto max-w-[1440px] px-10 pt-[5px] xl:px-[120px]">
          <div className="flex overflow-hidden rounded-xl bg-ds-superficie text-ds-texto shadow-[0_24px_48px_-8px_rgba(0,0,0,0.3)]">
            <div className="flex min-w-0 flex-1 flex-col gap-4 px-8 py-7">
              <p className="ds-caps text-ds-texto-2">Treinamentos regulamentares</p>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 xl:grid-cols-3">
                {NORMAS.map((norma) => {
                  const destaque = norma.slug === NORMA_MAIS_APLICADA;
                  return <li key={norma.slug}>
                    <Link href={rotas.norma(norma.slug)} onClick={fechar} className="doc-focus group flex items-center gap-3.5 rounded-lg px-3.5 py-3 hover:bg-ds-muted">
                      <span className={cn('flex h-10 w-16 shrink-0 items-center justify-center rounded-md font-ds-display text-sm leading-5 font-extrabold whitespace-nowrap', destaque ? 'bg-ds-amarelo text-ds-texto' : 'bg-ds-inverso text-ds-amarelo')}>{norma.codigo}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="ds-body-s font-medium">{norma.menu.titulo}</span>
                        <span className="ds-caption text-ds-texto-2">{norma.menu.apoio}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                    </Link>
                  </li>;
                })}
              </ul>
            </div>
            <div className="flex w-[340px] shrink-0 flex-col justify-between gap-6 bg-ds-inverso p-7 text-ds-texto-inv">
              <div className="flex flex-col gap-2.5">
                <p className="ds-h4 text-ds-amarelo">Não achou sua NR?</p>
                <p className="ds-body-s text-ds-texto-inv-2">A Space Light atende outras Normas Regulamentadoras além destas. Conte o que a sua operação exige.</p>
                <Link href={rotas.laudos} onClick={fechar} className="doc-focus mt-2 inline-flex w-fit items-center gap-2 ds-body-s font-medium text-ds-amarelo hover:underline underline-offset-4">Laudos NR 13, 15 e 16<ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link href={rotas.contato} onClick={fechar} className={botao({ className: 'w-full' })}>Solicitar proposta<ArrowRight className="size-[18px]" aria-hidden="true" /></Link>
                <Link href={rotas.comoTrabalhamos} onClick={fechar} className={botao({ variante: 'inverso', className: 'w-full' })}>Ver como trabalhamos</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </> : null}
  </nav>;
}
