import { NextResponse } from 'next/server';

import { isOwnerByEmailOrFlag, listAuditLogs } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function GET() {
  const user = await getCurrentUser();
  if (
    !user ||
    user.role !== 'admin' ||
    user.must_reset ||
    !isOwnerByEmailOrFlag(user.email, user.is_owner)
  ) {
    return NextResponse.json({ error: 'Acesso restrito ao dono da conta.' }, { status: 403 });
  }
  return NextResponse.json({ entries: await listAuditLogs(80) });
}
