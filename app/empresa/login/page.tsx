import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ClientLogin } from '@/components/client-portal/client-login';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Acesso da equipe | Área da Empresa',
  description: 'Entrada restrita à equipe da Space Light Engenharia.',
  robots: { index: false, follow: false },
};

export default async function CompanyLoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(portalPathForRole(user.role));
  const { status } = await searchParams;
  return <ClientLogin status={status} portal="company" />;
}
