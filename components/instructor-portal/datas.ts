import type { CompanyTraining } from '@/lib/company-types';

export function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isoFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** "sex, 18 set 2026" */
export function formatDate(value: string) {
  const date = dateFromIso(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace(/\./g, '');
}

/** Carimbos do banco vêm como "2026-09-04 00:59:32" (UTC), não como data pura. */
export function formatMoment(value: string) {
  const date = new Date(
    value.includes('T') ? value : `${value.replace(' ', 'T')}Z`,
  );
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * O dia deste instrutor nesta turma: o primeiro ainda aberto, ou o último que
 * ele deu. É sobre ele que iniciar e encerrar agem, no servidor também.
 */
export function meuDia(training: CompanyTraining, instructorId: string) {
  const dias = training.sessions ?? [];
  const meus = dias.filter((dia) => dia.instructor_id === instructorId);
  const atual =
    meus.find((dia) => dia.status !== 'completed') ??
    meus[meus.length - 1] ??
    null;
  const ultimoPendente =
    Boolean(atual) &&
    dias.every((dia) => dia.id === atual!.id || dia.status === 'completed');
  return { dias, meus, atual, ultimoPendente };
}

export function janelaDoDia(
  session: { start_time: string; end_time: string } | null,
) {
  if (!session) return '';
  const inicio = (session.start_time ?? '').trim();
  const fim = (session.end_time ?? '').trim();
  if (inicio && fim) return `${inicio} às ${fim}`;
  return inicio || fim || '';
}
