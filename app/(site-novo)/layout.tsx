import type { Metadata } from 'next';

import { CascaDoSite } from '@/components/site-novo/casca';

export const metadata: Metadata = {
  title: {
    default: 'Space Light Engenharia | Treinamentos em Normas Regulamentadoras',
    template: '%s | Space Light Engenharia',
  },
};

export default function SiteNovoLayout({ children }: { children: React.ReactNode }) {
  return <CascaDoSite>{children}</CascaDoSite>;
}
