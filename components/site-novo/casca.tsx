import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site-novo/site-footer';
import { SiteHeader } from '@/components/site-novo/site-header';
import { Surgir } from '@/components/site-novo/surgir';

/**
 * Cabeçalho, conteúdo e rodapé do site. Serve o layout do site e a página 404,
 * que o Next monta fora dele (endereço que não existe não passa pelo grupo).
 */
export function CascaDoSite({ children }: { children: ReactNode }) {
  return (
    <div className="doc-ui flex min-h-dvh flex-col bg-doc-paper text-doc-ink">
      <a
        href="#conteudo"
        className="doc-focus sr-only bg-sl-gold px-4 py-3 text-sm font-semibold text-sl-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Surgir />
    </div>
  );
}
