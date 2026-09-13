import type { TrainingSession } from '@/lib/company-types';

/**
 * A data de uma turma nas telas é a do DIA em questão, não a do 1º dia: numa
 * turma de 3 dias, quem olha no dia 2 precisa ver a data do dia 2.
 */
type ComDias = { training_date: string; sessions?: TrainingSession[] };

/** Próximo dia ainda não encerrado; se todos foram, o último. */
export function proximoDiaDaTurma(training: ComDias) {
  const dias = training.sessions ?? [];
  return dias.find((dia) => dia.status !== 'completed') ?? dias[dias.length - 1] ?? null;
}

/** Data a mostrar da turma: a do próximo dia a dar. */
export function dataDoDia(training: ComDias) {
  return proximoDiaDaTurma(training)?.session_date ?? training.training_date;
}

/** " · dia 2 de 3" em turma de vários dias; vazio em turma de um dia. */
export function rotuloDiaDaTurma(training: ComDias) {
  const dias = training.sessions ?? [];
  const dia = proximoDiaDaTurma(training);
  return dias.length > 1 && dia ? ` · dia ${dia.day_number} de ${dias.length}` : '';
}

/** Dia do check-in no formulário público: o de hoje; senão o próximo; senão o último. */
export function diaDoCheckin(training: ComDias, hoje: string) {
  const dias = training.sessions ?? [];
  return dias.find((dia) => dia.session_date === hoje)
    ?? dias.find((dia) => dia.session_date > hoje)
    ?? dias[dias.length - 1]
    ?? null;
}
