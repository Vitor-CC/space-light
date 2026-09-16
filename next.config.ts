import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `output: 'standalone'` é usado apenas para auto-hospedagem (VPS/Docker).
  // Na Vercel ele não é necessário e quebra o passo de tracing (.nft.json),
  // então o desativamos quando rodando na Vercel (que define VERCEL=1).
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  serverExternalPackages: ['better-sqlite3', '@libsql/client', 'sharp'],
  // O site novo viveu em /v2 antes de assumir a raiz: link antigo não quebra.
  async redirects() {
    return [
      { source: '/v2', destination: '/', permanent: true },
      { source: '/v2/:caminho*', destination: '/:caminho*', permanent: true },
    ];
  },
};

export default nextConfig;
