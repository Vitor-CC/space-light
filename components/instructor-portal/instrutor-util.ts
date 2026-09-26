import type { Tom } from '@/components/ds/base';
import type { CompanyTraining, TrainingSession } from '@/lib/company-types';

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(new Headers(init?.headers)) },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
}

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

export function formatDate(value: string) {
  const date = dateFromIso(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).format(date).replace('.', '');
}

/** Carimbos do banco vêm como "2026-09-04 00:59:32" (UTC), não como data pura. */
export function formatMoment(value: string) {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

/** "Sábado, 12 de setembro de 2026": maiúscula só na 1ª letra. */
export function longDate(iso: string) {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(dateFromIso(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Um dia de aula do instrutor: a turma, qual dia dela é e quantos dias ela tem. */
export type DiaDeAula = { training: CompanyTraining; session: TrainingSession; total: number };

/**
 * O dia deste instrutor nesta turma: o primeiro ainda aberto, ou o último que
 * ele deu. É sobre ele que iniciar, a chamada e encerrar agem, no servidor também.
 */
export function meuDia(training: CompanyTraining, instructorId: string) {
  const dias = training.sessions ?? [];
  const meus = dias.filter((dia) => dia.instructor_id === instructorId);
  const atual = meus.find((dia) => dia.status !== 'completed') ?? meus[meus.length - 1] ?? null;
  const ultimoPendente = Boolean(atual) && dias.every((dia) => dia.id === atual!.id || dia.status === 'completed');
  return { dias, meus, atual, ultimoPendente };
}

/** "Dia 2 de 3" — omitido quando a turma tem um dia só. */
export function rotuloDoDia(training: CompanyTraining, instructorId: string) {
  const { dias, atual } = meuDia(training, instructorId);
  if (!atual || dias.length < 2) return '';
  return `Dia ${atual.day_number} de ${dias.length}`;
}

export function janelaDoDia(session: { start_time: string; end_time: string } | null) {
  if (!session) return '';
  const inicio = (session.start_time ?? '').trim();
  const fim = (session.end_time ?? '').trim();
  if (inicio && fim) return `${inicio} – ${fim}`;
  return inicio || fim || '';
}

export function statusLabel(status: string) {
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'completed') return 'Concluída';
  return 'Agendada';
}

export function statusTom(status: string): Tom {
  if (status === 'in_progress') return 'sinal';
  if (status === 'completed') return 'sucesso';
  return 'info';
}
