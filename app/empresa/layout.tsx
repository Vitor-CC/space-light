import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestão Space Light | Área da Empresa',
  description: 'Painel interno para gestão de clientes, treinamentos, arquivos e participantes.',
  robots: { index: false, follow: false },
};

export default function CompanyAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
