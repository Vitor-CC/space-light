import { ClientPortal } from '@/components/client-portal/client-portal';
import { getClientPortalData } from '@/db/company-repository';
import { requireUser } from '@/lib/app-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage() {
  const user = await requireUser();
  if (user.must_reset) redirect('/definir-senha');
  if (user.role === 'admin') redirect('/empresa');
  if (user.role === 'instructor') redirect('/instrutor');
  if (!user.client_id) redirect('/cliente/login?status=pending');
  const data = await getClientPortalData(user.client_id);
  if (!data) redirect('/cliente/login?status=pending');
  return <ClientPortal data={data} user={{ name: user.name, email: user.email }} />;
}
