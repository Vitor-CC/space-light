import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `output: 'standalone'` é usado apenas para auto-hospedagem (VPS/Docker).
  // Na Vercel ele não é necessário e quebra o passo de tracing (.nft.json),
  // então o desativamos quando rodando na Vercel (que define VERCEL=1).
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  serverExternalPackages: ['better-sqlite3', '@libsql/client'],
};

export default nextConfig;
