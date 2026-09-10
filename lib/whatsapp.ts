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

/** "das 08:00 às 18:00" — vazio quando o horário não foi preenchido. */
export function scheduleWindow(startTime: string, endTime: string): string {
  const inicio = (startTime ?? '').trim();
  const fim = (endTime ?? '').trim();
  if (inicio && fim) return `das ${inicio} às ${fim}`;
  if (inicio) return `a partir das ${inicio}`;
  if (fim) return `até as ${fim}`;
  return '';
}

export function trainingScheduleMessage(input: {
  instructorName: string;
  nr: string;
  title: string;
  clientName: string;
  dateLabel: string;
  timeLabel?: string;
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
    `Data: ${input.dateLabel}${input.timeLabel ? `, ${input.timeLabel}` : ''}`,
    `Carga horária: ${input.duration}`,
    `Local: ${input.location}`,
    `Cliente: ${input.clientName}`,
    '',
    'Pode confirmar a sua disponibilidade?',
  ].join('\n');
}

/** Cobrança de quem terminou a aula e não fechou a turma no portal. */
export function trainingReminderMessage(input: {
  instructorName: string;
  nr: string;
  title: string;
  clientName: string;
  dateLabel: string;
  faltaLista: boolean;
}): string {
  const firstName = input.instructorName.trim().split(/\s+/)[0] || '';
  return [
    `Olá${firstName ? `, ${firstName}` : ''}! Aqui é da Space Light Engenharia.`,
    '',
    `O treinamento *${input.nr} - ${input.title}* (${input.clientName}, ${input.dateLabel}) ainda está aberto no portal.`,
    '',
    input.faltaLista
      ? 'Falta enviar a foto da lista de presença assinada e encerrar a turma.'
      : 'Falta encerrar a turma para os certificados serem emitidos.',
    '',
    'Pode entrar no portal do instrutor e concluir? Obrigado!',
  ].join('\n');
}

export function whatsappLink(phone: string, message: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
