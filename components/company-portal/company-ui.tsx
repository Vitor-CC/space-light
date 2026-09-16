'use client';

import { mono } from '@/components/portal/kit';
import type {
  CompanyDashboardData,
  CompanyTraining,
} from '@/lib/company-types';
import { cn } from '@/lib/utils';

export type Notify = (message: string) => void;
export type Reload = () => Promise<void>;
export type DadosDaGestao = CompanyDashboardData;

export function formatDate(value: string) {
  if (!value) return 'Sem data';
  const dateValue = value.length === 10 ? `${value}T12:00:00Z` : value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(dateValue))
    .replace(/\./g, '');
}

/** "08:00 às 18:00" — vazio quando o horário não foi preenchido. */
export function formatWindow(session: {
  start_time: string;
  end_time: string;
}) {
  const inicio = (session.start_time ?? '').trim();
  const fim = (session.end_time ?? '').trim();
  if (inicio && fim) return `${inicio} às ${fim}`;
  return inicio || fim || '';
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function isoFromDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12);
}

/** Só dígitos: o CNPJ é digitado com e sem pontuação, e as duas têm de achar. */
export function digitos(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

/** Nome da turma na lista: a identificação interna quando existe. */
export function nomeDaTurma(training: CompanyTraining) {
  return training.internal_label || training.title;
}

/** Instrutores escalados na turma, sem repetir. */
export function instrutoresDaTurma(training: CompanyTraining) {
  return [
    ...new Set(
      (training.sessions ?? [])
        .map((dia) => dia.instructor_name)
        .filter(Boolean),
    ),
  ] as string[];
}

export function diasSemInstrutor(training: CompanyTraining) {
  return (training.sessions ?? []).filter((dia) => !dia.instructor_id).length;
}

/** Senha temporária que só aparece uma vez. */
export function AccessCredentials({
  eyebrow,
  note,
  email,
  password,
  onDismiss,
  loginLabel = 'E-mail',
}: {
  eyebrow: string;
  note: string;
  email: string;
  password: string;
  onDismiss: () => void;
  loginLabel?: string;
}) {
  return (
    <section
      aria-label={eyebrow}
      className="border-l-4 border-sl-gold bg-sl-black p-5 text-sl-white"
    >
      <p className="font-semibold">{eyebrow}</p>
      <p className="mt-1 text-sm text-sl-white/75">{note}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="font-doc-mono text-xs text-sl-white/75">
            {loginLabel}
          </dt>
          <dd className="mt-1 font-semibold break-all">{email}</dd>
        </div>
        <div>
          <dt className="font-doc-mono text-xs text-sl-white/75">
            Senha temporária
          </dt>
          <dd className={cn(mono, 'mt-1 break-all text-sl-gold')}>
            {password}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onDismiss}
        className="doc-focus mt-4 text-sm font-semibold underline decoration-sl-gold decoration-2 underline-offset-4 [--doc-focus:var(--sl-gold)]"
      >
        Já anotei
      </button>
    </section>
  );
}

/** Dias com presença. Completo = recebe certificado. */
export function PresencaBadge({
  present,
  total,
}: {
  present: number;
  total: number;
}) {
  const completo = total > 0 && present >= total;
  return (
    <span
      className={cn(
        mono,
        'text-xs whitespace-nowrap',
        completo ? 'text-doc-ink' : 'text-doc-mark',
      )}
    >
      {present}/{total} {total === 1 ? 'dia' : 'dias'}
      <span className="sr-only">
        {completo ? ', presença completa' : ', presença incompleta'}
      </span>
    </span>
  );
}
