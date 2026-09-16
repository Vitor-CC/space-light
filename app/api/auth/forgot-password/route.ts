import { redirectInterno } from '@/lib/safe-redirect';

import {
  createPasswordResetToken,
  findClientUsersByEmail,
  findUserByEmail,
} from '@/db/company-repository';
import { isMailerConfigured, sendPasswordResetEmail } from '@/lib/mailer';
import {
  RESET_TOKEN_TTL_MINUTES,
  generateResetToken,
  hashResetToken,
} from '@/lib/password-auth';

function baseUrl(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const portal = String(form.get('portal') ?? '');
  const back = `/esqueci-senha${portal ? `?portal=${encodeURIComponent(portal)}&` : '?'}status=`;

  if (!email) {
    return redirectInterno(request, `${back}invalid`);
  }
  if (!isMailerConfigured()) {
    return redirectInterno(request, `${back}unavailable`);
  }

  // A resposta é sempre a mesma, exista ou não a conta: dizer "este e-mail não
  // existe" entregaria a estranhos quem é cliente da Space.
  const done = redirectInterno(request, `${back}sent`);

  try {
    // No portal do cliente o mesmo e-mail pode responder por várias unidades:
    // vai um link por conta, cada um dizendo o nome de usuário.
    const contas =
      portal === 'cliente'
        ? await findClientUsersByEmail(email)
        : [await findUserByEmail(email)].filter((user) => user?.active);

    for (const user of contas) {
      if (!user) continue;
      const token = generateResetToken();
      const issued = await createPasswordResetToken({
        userId: user.id,
        tokenHash: await hashResetToken(token),
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      });
      if (!issued) continue; // pediu demais em pouco tempo

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        usuario: user.role === 'client' ? user.username : null,
        link: `${baseUrl(request)}/redefinir-senha?token=${encodeURIComponent(token)}`,
        minutes: RESET_TOKEN_TTL_MINUTES,
      });
    }
  } catch (error) {
    console.error('[forgot-password]', error);
  }
  return done;
}
