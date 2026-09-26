import { NextResponse } from 'next/server';

import { isOwnerByEmailOrFlag, updateEmployeeJobTitle } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** Cargo do funcionário: o dono edita qualquer um; cada pessoa, o próprio. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const { jobTitle } = (await request.json().catch(() => ({}))) as { jobTitle?: string };
  try {
    await updateEmployeeJobTitle({ userId: id, jobTitle: jobTitle ?? '', byUserId: user.id, byOwner: isOwnerByEmailOrFlag(user.email, user.is_owner) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar o cargo.' }, { status: 400 });
  }
}
