import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/ds/base';
import { botao } from '@/components/site-novo/botao';
import { DesktopNav } from '@/components/site-novo/desktop-nav';
import { MobileMenu } from '@/components/site-novo/mobile-menu';
import { rotas } from '@/lib/site-novo/rotas';

/**
 * Cabeçalho do Figma ("Site / Header · Tema escuro"): fundo preto, logo claro,
 * navegação ao centro e, à direita, Entrar e Solicitar proposta. A classe
 * `dark` vira os tokens do site para a versão escura dentro dele.
 */
export function SiteHeader() {
  return (
    <header className="dark sticky top-0 z-40 border-b border-ds-borda-inv bg-ds-inverso text-ds-texto-inv">
      <div className="mx-auto flex h-header max-w-[90rem] items-center justify-between gap-4 px-5 md:px-10 xl:px-[120px]">
        <Link href={rotas.inicio} aria-label="Space Light Engenharia — página inicial" className="doc-focus shrink-0">
          <Logo cor="claro" className="h-9 lg:h-11" prioridade />
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-3 lg:gap-6">
          <Link href={rotas.portal} className="doc-focus hidden items-center gap-2 font-ds-sans text-sm leading-5 font-medium text-ds-texto-inv hover:text-ds-amarelo xl:inline-flex">
            <Lock className="size-4" aria-hidden="true" />Entrar
          </Link>
          {/* No celular o Figma deixa só logo e menu; a proposta fica no menu aberto. */}
          <Link href={rotas.contato} className={botao({ className: 'max-sm:hidden' })}>
            Solicitar proposta
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
