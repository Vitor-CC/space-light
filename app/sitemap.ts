import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site-url';

/**
 * Só as páginas que fazem sentido aparecer em busca. O resto do site é portal
 * com login ou página aberta por token de uma turma específica.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: SITE_URL, lastModified: agora, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/instrutor/cadastro`, lastModified: agora, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
