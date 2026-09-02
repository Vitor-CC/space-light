import { NextResponse } from 'next/server';

import { getInstructorDashboardData } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const data = await getInstructorDashboardData(user);
  if (!data) return NextResponse.json({ error: 'Cadastro de instrutor indisponível.' }, { status: 404 });
  return NextResponse.json(data);
}
