import { NextResponse } from 'next/server';

import { buscarAvaliacoesDoGoogle } from '@/lib/site-novo/avaliacoes-google';

// Cada chamada consulta o Google na hora: as regras dele não deixam guardar
// as avaliações. O limite por IP protege a conta de quem ficar chamando a rota.
export const dynamic = 'force-dynamic';

const JANELA_MS = 60_000;
const LIMITE_POR_JANELA = 6;
const chamadas = new Map<string, number[]>();

export async function GET(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'sem-ip';
  const agora = Date.now();
  const recentes = (chamadas.get(ip) ?? []).filter((instante) => agora - instante < JANELA_MS);
  if (recentes.length >= LIMITE_POR_JANELA) {
    return new NextResponse(null, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }
  recentes.push(agora);
  chamadas.set(ip, recentes);
  if (chamadas.size > 10_000) chamadas.clear();

  const avaliacoes = await buscarAvaliacoesDoGoogle();
  if (!avaliacoes) return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(avaliacoes, { headers: { 'Cache-Control': 'no-store' } });
}
