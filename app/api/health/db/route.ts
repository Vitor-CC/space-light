import { NextResponse } from 'next/server';

import { getD1 } from '@/db';
import { ensurePortalSchema } from '@/db/company-repository';

export const dynamic = 'force-dynamic';

// Endpoint de diagnóstico temporário: verifica a conexão com o banco (Turso em
// produção) e a criação do schema, retornando o erro em texto claro quando falha.
// Pode ser removido depois que a publicação estiver estável.
export async function GET() {
  const engine = process.env.TURSO_DATABASE_URL ? 'turso' : 'sqlite-local';

  // 1) Testa a conexão bruta com um SELECT trivial (não depende do schema).
  try {
    const ping = await getD1().prepare('SELECT 1 AS ok').first<{ ok: number }>();
    if (!ping || ping.ok !== 1) {
      return NextResponse.json(
        { ok: false, engine, step: 'connection', message: 'SELECT 1 não retornou o esperado.' },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        engine,
        step: 'connection',
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  // 2) Testa a criação do schema (o lote de CREATE TABLE).
  try {
    await ensurePortalSchema();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        engine,
        step: 'schema',
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, engine });
}
