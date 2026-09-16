import type { MetadataRoute } from 'next';

import { NORMAS } from '@/lib/site-novo/normas';
import { SITE_BASE, rotas } from '@/lib/site-novo/rotas';
import { SITE_URL } from '@/lib/site-url';

/**
 * Só as páginas que fazem sentido aparecer em busca. O resto do site é portal
 * com login ou página aberta por token de uma turma específica.
 *
 * As páginas do site entram quando ele está na raiz (`SITE_BASE = ''`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  const siteNovo: MetadataRoute.Sitemap =
    SITE_BASE === ''
      ? [
          {
            url: `${SITE_URL}${rotas.contato}`,
            lastModified: agora,
            changeFrequency: 'yearly',
            priority: 0.8,
          },
          ...NORMAS.filter((norma) => norma.pagina).map((norma) => ({
            url: `${SITE_URL}${rotas.norma(norma.slug)}`,
            lastModified: agora,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
          })),
        ]
      : [];
  return [
    {
      url: SITE_URL,
      lastModified: agora,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...siteNovo,
    {
      url: `${SITE_URL}/instrutor/cadastro`,
      lastModified: agora,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
