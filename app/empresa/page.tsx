import { CompanyPortal } from '@/components/company-portal/company-portal';
import { getCompanyDashboardData } from '@/db/company-repository';
import { requireAdmin } from '@/lib/app-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CompanyPortalPage() {
  const user = await requireAdmin();
  if (user.must_reset) redirect('/cliente/definir-senha');
  return <CompanyPortal initialData={await getCompanyDashboardData(user)} />;
}
