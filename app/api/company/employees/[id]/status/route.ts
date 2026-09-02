import { NextResponse } from 'next/server';

import { isOwnerByEmailOrFlag, setEmployeeActive } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (
    !user ||
    user.role !== 'admin' ||
    user.must_reset ||
    !isOwnerByEmailOrFlag(user.email, user.is_owner)
  ) {
    return NextResponse.json({ error: 'Acesso restrito ao dono da conta.' }, { status: 403 });
  }
  const { id } = await params;
  const input = (await request.json()) as { active?: boolean };
  try {
    await setEmployeeActive({ userId: id, active: Boolean(input.active), byUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar o funcionário.' },
      { status: 400 },
    );
  }
}
