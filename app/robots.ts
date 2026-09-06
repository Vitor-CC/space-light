import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site-url';

/**
 * O site não tinha robots.txt (dava 404), então tudo ficava liberado —
 * inclusive o portal interno e as páginas de token. Aqui só o que é público
 * fica aberto ao Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // O "$" fixa o fim do caminho: libera /cliente/cadastro sem liberar
        // o portal em /cliente.
        allow: ['/', '/cliente/cadastro', '/instrutor/cadastro'],
        disallow: [
          '/api/',
          '/empresa',
          '/cliente$',
          '/cliente/login',
          '/instrutor$',
          '/instrutor/login',
          '/entrar',
          '/definir-senha',
          '/esqueci-senha',
          '/redefinir-senha',
          // Páginas de uso interno, abertas por link ou QR de uma turma só.
          '/participar/',
          '/certificado/',
          '/lista-presenca/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
