import { NextResponse } from 'next/server';

import { createPasswordResetToken, findUserByEmail } from '@/db/company-repository';
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
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const portal = String(form.get('portal') ?? '');
  const back = `/esqueci-senha${portal ? `?portal=${encodeURIComponent(portal)}&` : '?'}status=`;

  if (!email) {
    return NextResponse.redirect(new URL(`${back}invalid`, request.url), 303);
  }
  if (!isMailerConfigured()) {
    return NextResponse.redirect(new URL(`${back}unavailable`, request.url), 303);
  }

  // A resposta é sempre a mesma, exista ou não a conta: dizer "este e-mail não
  // existe" entregaria a estranhos quem é cliente da Space.
  const done = NextResponse.redirect(new URL(`${back}sent`, request.url), 303);

  try {
    const user = await findUserByEmail(email);
    if (!user || !user.active) return done;

    const token = generateResetToken();
    const issued = await createPasswordResetToken({
      userId: user.id,
      tokenHash: await hashResetToken(token),
      ttlMinutes: RESET_TOKEN_TTL_MINUTES,
    });
    if (!issued) return done; // pediu demais em pouco tempo

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      link: `${baseUrl(request)}/redefinir-senha?token=${encodeURIComponent(token)}`,
      minutes: RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    console.error('[forgot-password]', error);
  }
  return done;
}
