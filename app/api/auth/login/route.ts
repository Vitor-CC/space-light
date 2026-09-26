import { redirectInterno } from '@/lib/safe-redirect';

import { getAuthEnvironment } from '@/db';
import {
  bootstrapAdmin,
  findClientUserByUsername,
  findUserByEmail,
  recordLogin,
} from '@/db/company-repository';
import {
  createSessionToken,
  LONG_SESSION_DURATION_SECONDS,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/password-auth';
import { portalPathForRole } from '@/lib/app-auth';

function destination(request: Request, path: string) {
  return redirectInterno(request, path);
}

export async function POST(request: Request) {
  const form = await request.formData();
  // "login" é o nome de usuário na porta da empresa e o e-mail nas outras duas.
  const email = String(form.get('login') ?? form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const manterConectado = form.get('manter') === '1';
  const requestedPath = String(form.get('loginPath') ?? '');
  const loginPath = requestedPath === '/instrutor/login' || requestedPath === '/empresa/login'
    ? requestedPath
    : '/cliente/login';
  const back = (status: string) => `${loginPath}?status=${status}`;
  if (!email || !password) return destination(request, back('invalid'));

  // Empresa entra só pelo nome de usuário, e só pela porta dela. Nas outras
  // portas (por e-mail), conta de empresa é tratada como inexistente.
  const portaDaEmpresa = loginPath === '/cliente/login';
  let user = portaDaEmpresa
    ? await findClientUserByUsername(email)
    : await findUserByEmail(email);
  if (!portaDaEmpresa && user?.role === 'client') user = null;
  const initial = getAuthEnvironment();
  if (!user && !portaDaEmpresa && email === initial.initialAdminEmail) {
    const matches = await verifyPassword(
      password,
      initial.initialAdminPasswordHash,
      initial.initialAdminPasswordSalt,
    );
    if (matches) {
      try {
        user = await bootstrapAdmin({
          email,
          passwordHash: initial.initialAdminPasswordHash,
          passwordSalt: initial.initialAdminPasswordSalt,
        });
      } catch {
        user = await findUserByEmail(email);
      }
    }
  }

  if (!user) return destination(request, back('invalid'));
  if (!user.active) return destination(request, back('pending'));
  if (!(await verifyPassword(password, user.password_hash, user.password_salt))) {
    return destination(request, back('invalid'));
  }

  await recordLogin(user.id);
  const path = user.must_reset
    ? '/definir-senha'
    : portalPathForRole(user.role);
  const response = destination(request, path);
  response.cookies.set(
    SESSION_COOKIE,
    manterConectado
      ? await createSessionToken(user.id, LONG_SESSION_DURATION_SECONDS)
      : await createSessionToken(user.id),
    manterConectado
      ? { ...sessionCookieOptions, maxAge: LONG_SESSION_DURATION_SECONDS }
      : sessionCookieOptions,
  );
  return response;
}
