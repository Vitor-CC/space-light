/**
 * Monta o link do WhatsApp com a mensagem pronta. O envio em si é feito por
 * quem clica: disparo automático exigiria a API oficial do WhatsApp Business
 * (conta verificada, modelos aprovados e custo por mensagem).
 */

/** Normaliza para o formato que o wa.me espera: 55 + DDD + número, só dígitos. */
export function whatsappNumber(phone: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return digits;
  return null;
}

export function trainingScheduleMessage(input: {
  instructorName: string;
  nr: string;
  title: string;
  clientName: string;
  dateLabel: string;
  duration: string;
  location: string;
}): string {
  const firstName = input.instructorName.trim().split(/\s+/)[0] || '';
  // Sem emoji de propósito: dependem da fonte do aparelho e viram "?" em
  // alguns aparelhos e no WhatsApp Web.
  return [
    `Olá${firstName ? `, ${firstName}` : ''}! Aqui é da Space Light Engenharia.`,
    '',
    `Você foi escalado para o treinamento *${input.nr} - ${input.title}*.`,
    '',
    `Data: ${input.dateLabel}`,
    `Carga horária: ${input.duration}`,
    `Local: ${input.location}`,
    `Cliente: ${input.clientName}`,
    '',
    'Pode confirmar a sua disponibilidade?',
  ].join('\n');
}

export function whatsappLink(phone: string, message: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
