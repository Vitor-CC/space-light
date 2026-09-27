import type { Metadata } from 'next';

import { REDES, WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS, type NormaComPagina } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { SITE_URL } from '@/lib/site-url';

/*
 * Metadados e dados estruturados do site novo. Só entram dados conferíveis —
 * os mesmos da ficha que o site atual já publica: nada de endereço, CNPJ,
 * nota ou preço.
 */

export const NOME_DA_EMPRESA = 'Space Light Engenharia';

const ID_DA_ORGANIZACAO = `${SITE_URL}/#organizacao`;
const BRASIL = { '@type': 'Country', name: 'Brasil' } as const;

const absoluto = (caminho: string) => new URL(caminho, SITE_URL).href;

/** Imagem de compartilhamento 1200×630 gerada por scripts/gerar-imagens-og.mjs. */
export const imagemOg = (nome: 'home' | NormaComPagina['slug']) =>
  `/images/brand-v2/og/space-light-og-${nome}.jpg`;

/** A imagem da norma sai da foto dela; norma ainda sem foto usa a da home. */
export const imagemOgDaNorma = (norma: NormaComPagina) =>
  imagemOg(norma.pagina.figura ? norma.slug : 'home');

/**
 * Title, description, canônico e Open Graph de uma página. O `openGraph` do
 * filho substitui o do layout raiz inteiro (não mescla), então vai completo.
 * O canônico é por página: herdado, o `/` do layout raiz apontaria todas as
 * páginas para a home.
 */
export function metadadosDaPagina({
  titulo,
  descricao,
  caminho,
  imagem,
  alt,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
  imagem: string;
  alt: string;
}): Metadata {
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: NOME_DA_EMPRESA,
      url: caminho,
      title: titulo,
      description: descricao,
      images: [{ url: imagem, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: [imagem],
    },
  };
}

const provedor = {
  '@type': 'Organization',
  '@id': ID_DA_ORGANIZACAO,
  name: NOME_DA_EMPRESA,
  url: absoluto(rotas.inicio),
} as const;

export function dadosDaOrganizacao() {
  return {
    '@context': 'https://schema.org',
    ...provedor,
    logo: absoluto('/images/branding/space-light-logo-oficial.png'),
    image: absoluto(imagemOg('home')),
    description:
      'Treinamentos de Normas Regulamentadoras com teoria aplicada e prática supervisionada.',
    telephone: WHATSAPP.numero.replace(/[^\d+]/g, ''),
    sameAs: [REDES.instagram, REDES.facebook],
    areaServed: BRASIL,
    knowsAbout: NORMAS.map((norma) => `${norma.codigo} — ${norma.nome}`),
  };
}

/** `Service` da norma + a trilha da página (Início › Treinamentos › NR). */
export function dadosDaNorma(norma: NormaComPagina) {
  const url = absoluto(rotas.norma(norma.slug));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${url}#servico`,
        name: `Treinamento ${norma.codigo} — ${norma.nome}`,
        serviceType: 'Treinamento em Norma Regulamentadora',
        description: norma.pagina.exige,
        url,
        image: absoluto(imagemOgDaNorma(norma)),
        provider: provedor,
        areaServed: BRASIL,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          ['Início', rotas.inicio],
          ['Treinamentos', rotas.treinamentos],
          [norma.codigo, rotas.norma(norma.slug)],
        ].map(([name, caminho], indice) => ({
          '@type': 'ListItem',
          position: indice + 1,
          name,
          item: absoluto(caminho),
        })),
      },
    ],
  };
}
