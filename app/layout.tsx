import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans, Montserrat } from 'next/font/google';

import { SITE_URL } from '@/lib/site-url';
import './globals.css';

// Design System 2026 (Figma): Montserrat nos títulos, botões e rótulos em
// caixa alta; IBM Plex Sans no texto corrido e na interface.
const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

// Archivo ExtraBold: só o código grande do card de norma ("NR 23").
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

// Monoespaçada: código de turma, numeração e dado de tabela — nunca parágrafo.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
      <body
        className={`${montserrat.variable} ${plexSans.variable} ${plexMono.variable} ${archivo.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
