'use client';

import { CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react';

import { campoClasses, rotuloClasses, selectClasses, Tag, TopoDePagina, Vazio, type Tom } from '@/components/ds/base';
import { Abas } from '@/components/ds/interativo';
import type { CompanyTraining, TrainingSession } from '@/lib/company-types';
import { cn } from '@/lib/utils';

export type CompanySection = 'dashboard' | 'clients' | 'instructors' | 'trainings' | 'certificates' | 'files' | 'participants' | 'requests' | 'settings' | 'team' | 'audit';

// Classes de campo do Design System 2026, com os nomes antigos para as telas que já as usam.
export const fieldClass = campoClasses;
export const inputClass = campoClasses;
export const selectClass = selectClasses;
export const labelClass = cn(rotuloClasses, 'mb-2');

export const sectionCopy: Record<CompanySection, { title: string; description: string }> = {
  dashboard: { title: 'Painel', description: 'O dia da operação: turmas de hoje, agenda e o que está pendente.' },
  clients: { title: 'Clientes', description: 'Cadastros corporativos, acessos ao portal e endereços para o atestado.' },
  instructors: { title: 'Instrutores', description: 'Cadastros, documentos obrigatórios, aprovações e disponibilidade.' },
  trainings: { title: 'Turmas', description: 'Todas as turmas de todos os clientes, do agendamento ao certificado.' },
  certificates: { title: 'Certificados', description: 'Turmas concluídas, certificados emitidos e os que aguardam emissão.' },
  files: { title: 'Documentação', description: 'Fotos da aula, documentos da turma e envio em lote.' },
  participants: { title: 'QR e participantes', description: 'Formulário do QR, lista de presença de cada dia e busca de alunos.' },
  requests: { title: 'Solicitações', description: 'Pedidos de nova turma feitos pelos clientes no portal.' },
  settings: { title: 'Configurações', description: 'Seu perfil, os acessos da equipe e o histórico de atividade.' },
  team: { title: 'Funcionários', description: 'Acessos da equipe Space Light. Exclusivo do dono da conta.' },
  audit: { title: 'Atividade', description: 'Histórico de ações da equipe: quem fez o quê e quando.' },
};

/** Data local no formato das colunas do banco (YYYY-MM-DD), sem passar por UTC. */
export function isoFromDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDate(value: string) {
  if (!value) return 'Sem data';
  const dateValue = value.length === 10 ? `${value}T12:00:00Z` : value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateValue));
}

/** Data curta para a agenda, onde o mês já está no cabeçalho do calendário. */
export function formatDayMonth(value: string) {
  if (!value) return '—';
  const dateValue = value.length === 10 ? `${value}T12:00:00Z` : value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(dateValue));
}

/** "08:00 às 18:00" — vazio quando o horário não foi preenchido. */
export function formatWindow(session: { start_time: string; end_time: string }) {
  const inicio = (session.start_time ?? '').trim();
  const fim = (session.end_time ?? '').trim();
  if (inicio && fim) return `${inicio} às ${fim}`;
  return inicio || fim || '';
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function trainingStatusLabel(status: string) {
  if (status === 'completed') return 'Concluído';
  if (status === 'in_progress') return 'Em andamento';
  return 'Agendado';
}

export function tomDoStatus(status: string): Tom {
  if (status === 'completed') return 'sucesso';
  if (status === 'in_progress') return 'atencao';
  return 'info';
}

export function StatusTag({ status }: { status: string }) {
  return <Tag tom={tomDoStatus(status)}>{trainingStatusLabel(status)}</Tag>;
}

/**
 * Sub-abas de uma seção. Existe porque "criar" e "consultar" na mesma tela
 * disputavam espaço e nenhuma das duas cabia direito.
 */
export function SubTabs<T extends string>({ tabs, active, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void; label: string }) {
  return <Abas rotulo={label} ativa={active} onChange={onChange} abas={tabs.map((tab) => ({ id: tab.id, rotulo: tab.label, contador: tab.count }))} />;
}

export function SectionHeading({ section }: { section: CompanySection }) {
  const copy = sectionCopy[section];
  return <TopoDePagina titulo={copy.title} subtitulo={copy.description} />;
}

export function EmptyState({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <Vazio icone={<Icon />} titulo={title} texto={text} />;
}

/** Uma linha por dia do treinamento: data, horário e quem foi escalado. */
export function SessionLine({ session, total }: { session: TrainingSession; total: number }) {
  const janela = formatWindow(session);
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-ds-borda py-1.5 pl-3 ds-caption text-ds-texto-2 [&_svg]:size-3.5">
    <strong className="font-semibold text-ds-texto">Dia {session.day_number}{total > 1 ? `/${total}` : ''}</strong>
    <span className="inline-flex items-center gap-1.5"><CalendarDays />{formatDate(session.session_date)}</span>
    {janela ? <span className="inline-flex items-center gap-1.5"><Clock3 />{janela}</span> : null}
    <span className={cn('inline-flex items-center gap-1.5', !session.instructor_name && 'font-medium text-ds-perigo')}><UserRound />{session.instructor_name || 'Sem instrutor'}</span>
    {session.status === 'completed' ? <Tag tom="sucesso">Encerrado</Tag> : session.status === 'in_progress' ? <Tag tom="atencao">Em aula</Tag> : null}
  </div>;
}

export function TrainingSummary({ training }: { training: CompanyTraining }) {
  const dias = training.sessions ?? [];
  const semInstrutor = dias.filter((dia) => !dia.instructor_id).length;
  return <article className="flex flex-col gap-3 rounded-lg border border-ds-borda bg-ds-superficie p-5">
    <div className="flex flex-wrap items-center gap-2"><StatusTag status={training.status} /><span className="ds-mono text-ds-texto-2">{training.code}</span></div>
    <div><h3 className="ds-h4">{training.nr} · {training.internal_label || training.title}</h3><p className="ds-body-s font-medium text-ds-amarelo-texto">{training.client_name}</p>{training.internal_label ? <p className="ds-caption text-ds-texto-2">{training.title}</p> : null}<p className="mt-1 inline-flex items-center gap-1.5 ds-caption text-ds-texto-2"><MapPin className="size-3.5" />{training.location}</p></div>
    <div className="flex flex-col gap-1">{dias.map((dia) => <SessionLine key={dia.id} session={dia} total={dias.length} />)}</div>
    {semInstrutor > 0 ? <p className="rounded-md bg-ds-perigo-suave px-3 py-2 ds-caption font-medium text-ds-perigo">{semInstrutor === 1 ? '1 dia ainda sem instrutor escalado.' : `${semInstrutor} dias ainda sem instrutor escalado.`}</p> : null}
    <div className="grid grid-cols-3 gap-2 text-center">{([[training.participant_count, 'Inscritos'], [training.file_count, 'Arquivos'], [dias.length || 1, dias.length === 1 ? 'Dia' : 'Dias']] as const).map(([value, label]) => <div key={label} className="rounded-md bg-ds-muted p-2.5"><strong className="block ds-h4">{value}</strong><span className="ds-caption text-ds-texto-2">{label}</span></div>)}</div>
    <div className="flex flex-wrap gap-4"><a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className="ds-body-s font-medium text-ds-amarelo-texto hover:underline underline-offset-4">Lista de presença (PDF)</a><a href={`/certificado/${training.id}`} target="_blank" rel="noopener" className="ds-body-s font-medium text-ds-amarelo-texto hover:underline underline-offset-4">Certificados (PDF)</a></div>
  </article>;
}

export function AccessCredentials({ eyebrow, note, email, password, onDismiss, loginLabel = 'E-mail' }: { eyebrow: string; note: string; email: string; password: string; onDismiss: () => void; loginLabel?: string }) {
  return <div className="flex flex-col gap-3 rounded-lg bg-ds-inverso p-5 text-ds-texto-inv">
    <span className="ds-caps text-ds-amarelo">{eyebrow}</span>
    <p className="ds-body-s text-ds-texto-inv-2">{note}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-ds-borda-inv p-3"><span className="block ds-caption text-ds-texto-inv-2">{loginLabel}</span><strong className="mt-0.5 block break-all ds-body-s font-medium">{email}</strong></div>
      <div className="rounded-md border border-ds-borda-inv p-3"><span className="block ds-caption text-ds-texto-inv-2">Senha temporária</span><strong className="mt-0.5 block break-all ds-mono text-ds-amarelo">{password}</strong></div>
    </div>
    <button type="button" onClick={onDismiss} className="w-fit ds-body-s font-medium text-ds-texto-inv-2 hover:text-ds-texto-inv">Já salvei estes dados</button>
  </div>;
}

/** Check-ins do aluno na turma. Verde só com todos os dias: é quem recebe certificado. */
export function PresencaBadge({ present, total }: { present: number; total: number }) {
  const completo = total > 0 && present >= total;
  return <span title={completo ? 'Presença em todos os dias: recebe certificado' : 'Falta check-in em algum dia: ainda sem certificado'}><Tag tom={completo ? 'sucesso' : 'sinal'}>{present}/{total} {total === 1 ? 'dia' : 'dias'}</Tag></span>;
}
