import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Área do Cliente | Space Light Engenharia',
  description:
    'Acesso corporativo aos treinamentos, fotos, documentos e certificados da Space Light Engenharia.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientAreaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
