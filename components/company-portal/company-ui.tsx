'use client';

import { CalendarDays, CheckCircle2, MapPin } from 'lucide-react';

import type { CompanyTraining } from '@/lib/company-types';

export type CompanySection = 'dashboard' | 'clients' | 'instructors' | 'trainings' | 'files' | 'participants' | 'certificates' | 'team' | 'audit';

export const fieldClass = 'h-12 rounded-none border-black/16 bg-white px-3 text-sm focus-visible:ring-[#f2ad19]/40';
export const inputClass = 'h-12 w-full rounded-none border border-black/16 bg-white px-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30';
export const selectClass = 'h-12 w-full border border-black/16 bg-white px-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30';

export const sectionCopy: Record<CompanySection, { title: string; description: string }> = {
  dashboard: { title: 'Central de gestão', description: 'Acompanhe toda a operação dos treinamentos em um só fluxo.' },
  clients: { title: 'Clientes', description: 'Cadastros corporativos, responsáveis e treinamentos vinculados.' },
  instructors: { title: 'Instrutores', description: 'Cadastros profissionais, aprovações e turmas atribuídas.' },
  trainings: { title: 'Treinamentos', description: 'Crie turmas e organize a entrega para cada cliente.' },
  files: { title: 'Arquivos', description: 'Envie fotos e documentos em lote para o cliente e treinamento corretos.' },
  participants: { title: 'QR e participantes', description: 'Compartilhe o formulário e acompanhe as inscrições.' },
  certificates: { title: 'Certificados', description: 'Acompanhe os lotes desde a presença até a liberação ao cliente.' },
  team: { title: 'Funcionários', description: 'Crie e gerencie os acessos da equipe Space Light. Exclusivo do dono da conta.' },
  audit: { title: 'Atividade', description: 'Histórico de ações da equipe: quem fez o quê e quando.' },
};

export function formatDate(value: string) {
  if (!value) return 'Sem data';
  const dateValue = value.length === 10 ? `${value}T12:00:00Z` : value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateValue));
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
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.11em] ${completed ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#785303]'}`}><CheckCircle2 className="size-3.5" />{trainingStatusLabel(status)}</span>;
}

export function SectionHeading({ section }: { section: CompanySection }) {
  const copy = sectionCopy[section];
  return <div className="border-b border-black/12 pb-7"><span className="eyebrow text-[#8a6107]">Área da Empresa</span><h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.055em] md:text-5xl">{copy.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#666] md:text-base">{copy.description}</p></div>;
}

export function EmptyState({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-black/20 bg-white p-8 text-center"><span className="flex size-12 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><Icon className="size-5" /></span><strong className="mt-5 text-sm uppercase">{title}</strong><p className="mt-2 max-w-md text-xs leading-relaxed text-[#777]">{text}</p></div>;
}

export function TrainingSummary({ training }: { training: CompanyTraining }) {
  return <article className="border border-black/10 bg-white p-5 md:p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black font-heading text-sm font-black text-[#f2ad19]">{training.nr}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusTag status={training.status} /><span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#999]">{training.code}</span></div><h3 className="mt-3 text-base font-extrabold uppercase leading-tight tracking-[-0.025em]">{training.title}</h3><p className="mt-2 text-xs font-bold text-[#8a6107]">{training.client_name}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#666]"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(training.training_date)}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{training.location}</span></div></div></div><div className="mt-5 grid grid-cols-3 gap-px bg-black/8 text-center">{[[training.participant_count, 'Inscritos'], [training.file_count, 'Arquivos'], [training.participant_limit, 'Vagas']].map(([value, label]) => <div key={label} className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{value}</strong><span className="text-[8px] font-bold uppercase tracking-[0.09em] text-[#888]">{label}</span></div>)}</div></article>;
}
