import { NextResponse } from 'next/server';

import { approveInstructorAccess } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  await approveInstructorAccess(id, user.id);
  return NextResponse.json({ ok: true });
}
