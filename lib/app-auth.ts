import { redirect } from 'next/navigation';

import { findUserById } from '@/db/company-repository';
import { getSessionUserId } from '@/lib/password-auth';

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  return user?.active ? user : null;
}

export async function requireUser(loginPath = '/cliente/login') {
  const user = await getCurrentUser();
  if (!user) redirect(`${loginPath}?status=login`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser('/empresa/login');
  if (user.role !== 'admin') redirect(portalPathForRole(user.role));
  return user;
}

export async function requireInstructor() {
  const user = await requireUser('/instrutor/login');
  if (user.role !== 'instructor') redirect(portalPathForRole(user.role));
  return user;
}

export function portalPathForRole(role: StoredUserRole) {
  if (role === 'admin') return '/empresa';
  if (role === 'instructor') return '/instrutor';
  return '/cliente';
}

type StoredUserRole = 'admin' | 'client' | 'instructor';
