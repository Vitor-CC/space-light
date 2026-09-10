/**
 * Envio de e-mail via Resend (API HTTP, sem dependência extra).
 *
 * Variáveis necessárias na Vercel:
 *   RESEND_API_KEY  — chave da conta Resend
 *   MAIL_FROM       — remetente verificado, ex.: "Space Light <nao-responda@mail.spacelightengenharia.com.br>"
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    throw new Error('O envio de e-mail ainda não foi configurado nesta instalação.');
  }
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar o e-mail (${response.status}). ${detail.slice(0, 200)}`);
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  link: string;
  minutes: number;
}) {
  const firstName = input.name.trim().split(/\s+/)[0] || '';
  const greeting = firstName ? `Olá, ${firstName}.` : 'Olá.';
  const text = [
    greeting,
    '',
    'Recebemos um pedido para redefinir a senha do seu acesso ao portal da Space Light Engenharia.',
    '',
    `Abra o link abaixo para criar uma nova senha (vale por ${input.minutes} minutos):`,
    input.link,
    '',
    'Se não foi você quem pediu, ignore esta mensagem: sua senha atual continua valendo.',
    '',
    'Space Light Engenharia',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f5f2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e3dd">
    <tr><td style="background:#0b0b0b;padding:22px 28px">
      <span style="color:#f2ad19;font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase">Space Light Engenharia</span>
    </td></tr>
    <tr><td style="padding:32px 28px">
      <h1 style="margin:0;font-size:22px;line-height:1.2;text-transform:uppercase;letter-spacing:-.02em">Redefinir sua senha</h1>
      <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#444">${escapeHtml(greeting)} Recebemos um pedido para redefinir a senha do seu acesso ao portal.</p>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#444">Clique no botão abaixo para criar uma nova senha. O link vale por <strong>${input.minutes} minutos</strong> e só pode ser usado uma vez.</p>
      <p style="margin:26px 0 0">
        <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#f2ad19;color:#0b0b0b;padding:15px 26px;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;text-decoration:none">Criar nova senha</a>
      </p>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#777">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all;color:#8a6107">${escapeHtml(input.link)}</span></p>
      <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #ececE6;font-size:12px;line-height:1.6;color:#777">Se não foi você quem pediu, pode ignorar esta mensagem — sua senha atual continua valendo.</p>
    </td></tr>
  </table>
</body></html>`;

  await sendEmail({
    to: input.to,
    subject: 'Redefinir a senha do portal Space Light',
    html,
    text,
  });
}

/** Cobrança automática do treinamento que o instrutor deixou em aberto. */
export async function sendTrainingReminderEmail(input: {
  to: string;
  name: string;
  nr: string;
  title: string;
  clientName: string;
  dateLabel: string;
  faltaLista: boolean;
  link: string;
}) {
  const firstName = input.name.trim().split(/\s+/)[0] || '';
  const greeting = firstName ? `Olá, ${firstName}.` : 'Olá.';
  const pendencia = input.faltaLista
    ? 'Falta enviar a foto da lista de presença assinada e encerrar a turma.'
    : 'Falta encerrar a turma para os certificados serem emitidos.';
  const turma = `${input.nr} - ${input.title} (${input.clientName}, ${input.dateLabel})`;

  const text = [
    greeting,
    '',
    `O treinamento ${turma} ainda está aberto no portal.`,
    '',
    pendencia,
    '',
    'Entre no portal do instrutor para concluir:',
    input.link,
    '',
    'Space Light Engenharia',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f5f2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e3dd">
    <tr><td style="background:#0b0b0b;padding:22px 28px">
      <span style="color:#f2ad19;font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase">Space Light Engenharia</span>
    </td></tr>
    <tr><td style="padding:32px 28px">
      <h1 style="margin:0;font-size:22px;line-height:1.2;text-transform:uppercase;letter-spacing:-.02em">Treinamento em aberto</h1>
      <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#444">${escapeHtml(greeting)}</p>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#444">O treinamento <strong>${escapeHtml(turma)}</strong> ainda está aberto no portal.</p>
      <p style="margin:14px 0 0;padding:14px 16px;border-left:4px solid #f2ad19;background:#fff8e8;font-size:14px;line-height:1.6;color:#444">${escapeHtml(pendencia)}</p>
      <p style="margin:26px 0 0">
        <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#f2ad19;color:#0b0b0b;padding:15px 26px;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;text-decoration:none">Abrir o portal do instrutor</a>
      </p>
    </td></tr>
  </table>
</body></html>`;

  await sendEmail({
    to: input.to,
    subject: `Treinamento em aberto: ${input.nr} - ${input.title}`,
    html,
    text,
  });
}
