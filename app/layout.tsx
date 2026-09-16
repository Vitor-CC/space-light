import type { Metadata } from 'next';
import { Open_Sans, Work_Sans } from 'next/font/google';

import { SITE_URL } from '@/lib/site-url';
import './globals.css';

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  display: 'swap',
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Space Light Engenharia | Treinamentos em Segurança do Trabalho',
  description:
    'Treinamentos de Normas Regulamentadoras com teoria aplicada, prática supervisionada e conteúdo adaptado à realidade da sua empresa.',
  applicationName: 'Space Light Engenharia',
  // Sem canônico o Google trata www e sem-www como páginas diferentes.
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Space Light Engenharia | Segurança que sai do papel',
    description:
      'Treinamentos de NRs com teoria aplicada, prática supervisionada e conteúdo sob medida.',
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'Space Light Engenharia',
    images: [
      {
        url: '/og.png',
        width: 1672,
        height: 941,
        alt: 'Treinamento prático da Space Light Engenharia',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${workSans.variable} ${openSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
