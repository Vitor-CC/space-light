import Image from 'next/image';
import Link from 'next/link';

import { botao } from '@/components/site-novo/botao';
import { DesktopNav } from '@/components/site-novo/desktop-nav';
import { MobileMenu } from '@/components/site-novo/mobile-menu';
import { rotas } from '@/lib/site-novo/rotas';

/**
 * No desktop o cabeçalho segue a grade do documento: o logo ocupa a coluna de
 * margem e a navegação começa no fio vertical que desce pela página.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-doc-rule-strong bg-doc-paper text-doc-ink">
      <div className="doc-shell">
        <div className="flex h-header items-center justify-between gap-3 lg:grid lg:grid-cols-[var(--doc-margin-width)_minmax(0,1fr)] lg:gap-0">
          <Link
            href={rotas.inicio}
            aria-label="Space Light Engenharia — página inicial"
            className="doc-focus shrink-0 self-center"
          >
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt=""
              width={260}
              height={49}
              loading="eager"
              className="h-6 w-auto lg:h-7"
            />
          </Link>

          <div className="flex items-center gap-2 lg:h-full lg:justify-between lg:border-l lg:border-doc-rule-strong lg:pl-5">
            <DesktopNav />
            <div className="flex items-center gap-2">
              <Link
                href={rotas.portal}
                className={botao({
                  variante: 'contorno',
                  className: 'hidden lg:inline-flex',
                })}
              >
                Entrar no portal
              </Link>
              <Link href={rotas.contato} className={botao()}>
                <span className="sm:hidden">Proposta</span>
                <span className="max-sm:hidden">Solicitar proposta</span>
              </Link>
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
