import type { Metadata } from 'next';

import { SiteFooter } from '@/components/site-novo/site-footer';
import { SiteHeader } from '@/components/site-novo/site-header';

export const metadata: Metadata = {
  title: {
    default: 'Space Light Engenharia | Treinamentos em Normas Regulamentadoras',
    template: '%s | Space Light Engenharia',
  },
  // Site novo em construção, convivendo com o atual: fica fora do Google até
  // a troca de rota, para não competir com as páginas que estão no ar.
  robots: { index: false, follow: false },
};

export default function SiteNovoLayout({ children }: LayoutProps<'/v2'>) {
  return (
    <div className="flex min-h-dvh flex-col bg-doc-paper text-doc-ink">
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
    </div>
  );
}
