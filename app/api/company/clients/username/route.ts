import { NextResponse } from 'next/server';

import { setClientUsername } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A Space define (ou troca) o nome de usuário com que a empresa entra no portal. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { clientId, username } = (await request.json()) as { clientId?: string; username?: string };
  if (!clientId) return NextResponse.json({ error: 'Cliente não informado.' }, { status: 400 });
  try {
    return NextResponse.json(await setClientUsername({ clientId, username: username ?? '', byUserId: user.id }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar o nome de usuário.' },
      { status: 400 },
    );
  }
}
