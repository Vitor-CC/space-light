import { NextResponse } from 'next/server';
import { getCompanyDashboardData } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  return NextResponse.json(await getCompanyDashboardData(user));
}
