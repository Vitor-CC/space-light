'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { botao } from '@/components/site-novo/botao';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';

const linhaDeLista = 'border-b border-doc-rule-strong';
const linkDeLista =
  'doc-focus flex min-h-12 items-center py-3 text-base font-semibold';

/** Menu abaixo de 1024: painel de tela cheia com o índice do site. */
export function MobileMenu() {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="doc-focus flex size-10 items-center justify-center border border-doc-rule-strong text-doc-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="doc-ui gap-0 overflow-y-auto border-doc-rule-strong bg-doc-paper text-doc-ink shadow-none data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <div className="flex h-header shrink-0 items-center justify-between border-b border-doc-rule-strong px-5">
          <SheetTitle className="font-doc-mono text-xs font-normal text-doc-ink-muted">
            Menu
          </SheetTitle>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="doc-focus flex size-10 items-center justify-center border border-doc-rule-strong"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navegação principal" className="px-5 pb-10">
          <p className="pt-6 pb-2 font-doc-mono text-xs text-doc-ink-muted">
            Treinamentos
          </p>
          <ul className="border-t border-doc-rule-strong">
            {NORMAS.map((norma) => (
              <li key={norma.slug} className={linhaDeLista}>
                <Link
                  href={rotas.norma(norma.slug)}
                  onClick={fechar}
                  className="doc-focus flex items-baseline gap-4 py-3"
                >
                  <span className="w-14 shrink-0 font-doc-mono text-sm font-semibold text-doc-mark">
                    {norma.codigo}
                  </span>
                  <span className="text-sm font-semibold">{norma.nome}</span>
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-8 border-t border-doc-rule-strong">
            <li className={linhaDeLista}>
              <Link
                href={rotas.comoTrabalhamos}
                onClick={fechar}
                className={linkDeLista}
              >
                Como trabalhamos
              </Link>
            </li>
            <li className={linhaDeLista}>
              <Link
                href={rotas.contato}
                onClick={fechar}
                className={linkDeLista}
              >
                Contato
              </Link>
            </li>
            <li className={linhaDeLista}>
              <Link
                href={rotas.portal}
                onClick={fechar}
                className={linkDeLista}
              >
                Entrar no portal
              </Link>
            </li>
          </ul>

          <Link
            href={rotas.contato}
            onClick={fechar}
            className={botao({ tamanho: 'lg', className: 'mt-8 w-full' })}
          >
            Solicitar proposta
          </Link>
          <a
            href={WHATSAPP.link}
            target="_blank"
            rel="noreferrer"
            className="doc-focus mt-4 flex min-h-12 items-center justify-center text-sm font-semibold underline decoration-sl-gold decoration-2 underline-offset-4"
          >
            Falar no WhatsApp
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
