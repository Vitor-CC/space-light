import { ClientLogin } from '@/components/client-portal/client-login';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(portalPathForRole(user.role));
  const { status } = await searchParams;
  return <ClientLogin status={status} portal="client" />;
}
