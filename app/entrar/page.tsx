import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ClientLogin } from '@/components/client-portal/client-login';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrar no portal | Space Light Engenharia',
  description: 'Acesso aos portais do cliente, do instrutor e da equipe Space Light.',
  robots: { index: false, follow: false },
};

const perfis = { cliente: 'client', instrutor: 'instructor', empresa: 'company' } as const;

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ status?: string; perfil?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(portalPathForRole(user.role));
  const { status, perfil } = await searchParams;
  const portal = perfil && perfil in perfis ? perfis[perfil as keyof typeof perfis] : 'client';
  return <ClientLogin status={status} portal={portal} />;
}
