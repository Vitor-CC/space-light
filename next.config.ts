import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `output: 'standalone'` é usado apenas para auto-hospedagem (VPS/Docker).
  // Na Vercel ele não é necessário e quebra o passo de tracing (.nft.json),
  // então o desativamos quando rodando na Vercel (que define VERCEL=1).
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  serverExternalPackages: ['better-sqlite3', '@libsql/client', 'sharp'],
  experimental: {
    // Desde o Next 16.3 o build reaproveita .next/cache/turbopack, e o VPS
    // compila sempre na mesma pasta. Em 26/09/2026 o cache devolveu o
    // globals.css do deploy anterior junto com os componentes novos, e a
    // produção ficou sem as cores do Design System. Build sempre do zero.
    turbopackFileSystemCacheForBuild: false,
  },
  // O site novo viveu em /v2 antes de assumir a raiz: link antigo não quebra.
  async redirects() {
    return [
      { source: '/v2', destination: '/', permanent: true },
      { source: '/v2/:caminho*', destination: '/:caminho*', permanent: true },
      // Página do site antigo que o Google ainda mostra; o site novo não tem "Sobre".
      { source: '/sobre', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
