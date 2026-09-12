'use client';

import { CalendarDays, CheckCircle2, Clock3, MapPin, UserRound } from 'lucide-react';

import type { CompanyTraining, TrainingSession } from '@/lib/company-types';

export type CompanySection = 'dashboard' | 'clients' | 'instructors' | 'trainings' | 'files' | 'participants' | 'team' | 'audit';

export const fieldClass = 'h-12 rounded-none border-black/16 bg-white px-3 text-sm focus-visible:ring-[#f2ad19]/40';
export const inputClass = 'h-12 w-full rounded-none border border-black/16 bg-white px-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30';
export const selectClass = 'h-12 w-full border border-black/16 bg-white px-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30';
export const labelClass = 'mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em]';

export const sectionCopy: Record<CompanySection, { title: string; description: string }> = {
  dashboard: { title: 'Central de gestão', description: 'Acompanhe toda a operação dos treinamentos em um só fluxo.' },
  clients: { title: 'Clientes', description: 'Cadastros corporativos, responsáveis e treinamentos vinculados.' },
  instructors: { title: 'Instrutores', description: 'Cadastros profissionais, aprovações e turmas atribuídas.' },
  trainings: { title: 'Treinamentos', description: 'Agenda por dia, escala de instrutores e criação de novas turmas.' },
  files: { title: 'Arquivos', description: 'Fotos da aula, documentos da turma e envio em lote, cada um no seu lugar.' },
  participants: { title: 'QR e participantes', description: 'Compartilhe o formulário e acompanhe as inscrições.' },
  team: { title: 'Funcionários', description: 'Crie e gerencie os acessos da equipe Space Light. Exclusivo do dono da conta.' },
  audit: { title: 'Atividade', description: 'Histórico de ações da equipe: quem fez o quê e quando.' },
};

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

export function StatusTag({ status }: { status: string }) {
  const completed = status === 'completed';
  const running = status === 'in_progress';
  const tom = completed ? 'bg-[#daf2df] text-[#17642d]' : running ? 'bg-[#e7eef9] text-[#31598e]' : 'bg-[#f2ad19]/18 text-[#785303]';
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${tom}`}><CheckCircle2 className="size-3.5" />{trainingStatusLabel(status)}</span>;
}

/**
 * Sub-abas de uma seção. Existe porque "criar" e "consultar" na mesma tela
 * disputavam espaço e nenhuma das duas cabia direito.
 */
export function SubTabs<T extends string>({ tabs, active, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void; label: string }) {
  return <div role="tablist" aria-label={label} className="flex gap-px overflow-x-auto bg-black/10">
    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)} className={`inline-flex shrink-0 items-center gap-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition ${active === tab.id ? 'bg-black text-[#f2ad19]' : 'bg-white text-[#666] hover:bg-[#fff8e8] hover:text-black'}`}>
      {tab.label}
      {tab.count === undefined ? null : <span className={`min-w-6 px-1.5 py-0.5 text-[10px] tabular-nums ${active === tab.id ? 'bg-[#f2ad19] text-black' : 'bg-black/8 text-[#777]'}`}>{tab.count}</span>}
    </button>)}
  </div>;
}

export function SectionHeading({ section }: { section: CompanySection }) {
  const copy = sectionCopy[section];
  return <div className="border-b border-black/12 pb-7"><span className="eyebrow text-[#8a6107]">Área da Empresa</span><h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[0.01em] md:text-5xl md:tracking-normal">{copy.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#666] md:text-base">{copy.description}</p></div>;
}

export function EmptyState({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-black/20 bg-white p-8 text-center"><span className="flex size-12 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><Icon className="size-5" /></span><strong className="mt-5 text-sm uppercase tracking-[0.08em]">{title}</strong><p className="mt-2 max-w-md text-xs leading-relaxed text-[#777]">{text}</p></div>;
}

/** Uma linha por dia do treinamento: data, horário e quem foi escalado. */
export function SessionLine({ session, total }: { session: TrainingSession; total: number }) {
  const janela = formatWindow(session);
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-black/10 py-1.5 pl-3 text-xs">
    <strong className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107]">Dia {session.day_number}{total > 1 ? `/${total}` : ''}</strong>
    <span className="inline-flex items-center gap-1.5 text-[#444]"><CalendarDays className="size-3.5" />{formatDate(session.session_date)}</span>
    {janela ? <span className="inline-flex items-center gap-1.5 text-[#666]"><Clock3 className="size-3.5" />{janela}</span> : null}
    <span className={`inline-flex items-center gap-1.5 ${session.instructor_name ? 'text-[#666]' : 'font-bold text-[#b62525]'}`}><UserRound className="size-3.5" />{session.instructor_name || 'Sem instrutor'}</span>
    {session.status === 'completed' ? <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#17642d]">Encerrado</span> : session.status === 'in_progress' ? <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#31598e]">Em aula</span> : null}
  </div>;
}

export function TrainingSummary({ training }: { training: CompanyTraining }) {
  const dias = training.sessions ?? [];
  const semInstrutor = dias.filter((dia) => !dia.instructor_id).length;
  return <article className="border border-black/10 bg-white p-5 md:p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black font-heading text-sm font-black text-[#f2ad19]">{training.nr}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusTag status={training.status} /><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">{training.code}</span></div><h3 className="mt-3 text-base font-extrabold uppercase leading-tight tracking-[0.06em]">{training.internal_label || training.title}</h3><p className="mt-2 text-xs font-bold text-[#8a6107]">{training.client_name}</p>{training.internal_label ? <p className="mt-1 text-xs text-[#777]">{training.title}</p> : null}<p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#666]"><MapPin className="size-3.5" />{training.location}</p></div></div>
    <div className="mt-4 space-y-1">{dias.map((dia) => <SessionLine key={dia.id} session={dia} total={dias.length} />)}</div>
    {semInstrutor > 0 ? <p className="mt-3 border-l-4 border-[#b62525] bg-[#fff5f5] px-3 py-2 text-[11px] font-bold text-[#b62525]">{semInstrutor === 1 ? '1 dia ainda sem instrutor escalado.' : `${semInstrutor} dias ainda sem instrutor escalado.`}</p> : null}
    <div className="mt-5 grid grid-cols-3 gap-px bg-black/8 text-center">{([[training.participant_count, 'Inscritos'], [training.file_count, 'Arquivos'], [dias.length || 1, dias.length === 1 ? 'Dia' : 'Dias']] as const).map(([value, label]) => <div key={label} className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{value}</strong><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#888]">{label}</span></div>)}</div>
    <div className="mt-4 flex flex-wrap gap-4"><a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] hover:text-black">Lista de presença (PDF) →</a><a href={`/certificado/${training.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] hover:text-black">Certificados (PDF) →</a></div></article>;
}

export function AccessCredentials({ eyebrow, note, email, password, onDismiss }: { eyebrow: string; note: string; email: string; password: string; onDismiss: () => void }) {
  return <div className="border-l-4 border-[#f2ad19] bg-black p-5 text-white"><span className="eyebrow text-[#f2ad19]">{eyebrow}</span><p className="mt-3 text-sm text-white/60">{note}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="border border-white/15 p-3"><span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/40">E-mail</span><strong className="mt-1 block break-all text-sm">{email}</strong></div><div className="border border-white/15 p-3"><span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/40">Senha temporária</span><strong className="mt-1 block break-all font-mono text-sm text-[#f2ad19]">{password}</strong></div></div><button type="button" onClick={onDismiss} className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/50 hover:text-white">Já salvei estes dados</button></div>;
}

/** Check-ins do aluno na turma. Verde só com todos os dias: é quem recebe certificado. */
export function PresencaBadge({ present, total }: { present: number; total: number }) {
  const completo = total > 0 && present >= total;
  return <span title={completo ? 'Presença em todos os dias: recebe certificado' : 'Falta check-in em algum dia: ainda sem certificado'} className={`inline-flex items-center whitespace-nowrap px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${completo ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#fff8e8] text-[#8a6107]'}`}>{present}/{total} {total === 1 ? 'dia' : 'dias'}</span>;
}
