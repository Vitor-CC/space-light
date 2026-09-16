import type { Metadata } from 'next';

import { SiteFooter } from '@/components/site-novo/site-footer';
import { SiteHeader } from '@/components/site-novo/site-header';
import { Surgir } from '@/components/site-novo/surgir';

export const metadata: Metadata = {
  title: {
    default: 'Space Light Engenharia | Treinamentos em Normas Regulamentadoras',
    template: '%s | Space Light Engenharia',
  },
};

export default function SiteNovoLayout({ children }: { children: React.ReactNode }) {
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
