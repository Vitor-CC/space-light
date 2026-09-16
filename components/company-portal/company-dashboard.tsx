'use client';

import { Building2, CalendarPlus, ChevronRight, FileUp, GraduationCap, TriangleAlert, UploadCloud, UsersRound } from 'lucide-react';

import { EmptyState, TrainingSummary } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData } from '@/lib/company-types';
import { dataDoDia } from '@/lib/dias-da-turma';

function Metric({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: typeof Building2; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-36 items-center justify-between bg-white p-6 text-left transition hover:bg-[#fff8e8]"><div><strong className="font-heading text-4xl font-black tracking-[-0.015em]">{value}</strong><span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#777]">{label}</span></div><span className="flex size-11 items-center justify-center bg-black text-[#f2ad19] transition group-hover:bg-[#f2ad19] group-hover:text-black"><Icon className="size-5" /></span></button>;
}

export function CompanyDashboard({ data, navigate }: { data: CompanyDashboardData; navigate: (section: CompanySection) => void }) {
  const nextTraining = [...data.trainings].filter((item) => item.status !== 'completed').sort((a, b) => dataDoDia(a).localeCompare(dataDoDia(b)))[0];
  // Turmas com algum dia sem instrutor: é a pendência que trava a operação,
  // e por isso ocupa o lugar que o antigo painel de "fluxo" desperdiçava.
  const semEscala = data.trainings.filter(
    (item) => item.status !== 'completed' && (item.sessions ?? []).some((dia) => !dia.instructor_id),
  );
  return <div className="space-y-7">
    <div className="relative overflow-hidden bg-black p-7 text-white md:p-10"><div className="hero-grid absolute inset-0 opacity-25" /><div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><span className="eyebrow text-[#f2ad19]">Operação Space Light</span><h2 className="mt-4 max-w-3xl text-3xl font-black uppercase leading-[0.94] tracking-[0.02em] md:text-5xl md:tracking-normal">Do cadastro do cliente à entrega dos certificados.</h2><p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60">Cada item fica ligado ao cliente e ao treinamento certo, evitando arquivos soltos e retrabalho.</p></div><button type="button" onClick={() => navigate('trainings')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><CalendarPlus className="size-4" />Novo treinamento</button></div></div>
    <div className="grid gap-px bg-black/10 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Clientes ativos" value={data.clients.length} icon={Building2} onClick={() => navigate('clients')} /><Metric label="Treinamentos" value={data.trainings.length} icon={GraduationCap} onClick={() => navigate('trainings')} /><Metric label="Arquivos" value={data.files.length} icon={FileUp} onClick={() => navigate('files')} /><Metric label="Participantes" value={data.participants.length} icon={UsersRound} onClick={() => navigate('participants')} /></div>
    {semEscala.length ? <button type="button" onClick={() => navigate('trainings')} className="flex w-full items-center gap-4 border-l-4 border-[#b62525] bg-[#fff5f5] p-5 text-left hover:bg-[#ffecec]"><TriangleAlert className="size-6 shrink-0 text-[#b62525]" /><span className="min-w-0"><strong className="block text-sm font-extrabold uppercase tracking-[0.04em] text-[#b62525]">{semEscala.length === 1 ? '1 turma sem instrutor escalado' : `${semEscala.length} turmas sem instrutor escalado`}</strong><span className="mt-1 block truncate text-xs text-[#8a4141]">{semEscala.map((item) => `${item.nr} · ${item.client_name}`).join(' · ')}</span></span><ChevronRight className="ml-auto size-5 shrink-0 text-[#b62525]" /></button> : null}
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow text-[#8a6107]">Agenda</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Próximo treinamento</h2></div><button type="button" onClick={() => navigate('trainings')} className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">Ver todos</button></div>{nextTraining ? <TrainingSummary training={nextTraining} /> : <EmptyState icon={GraduationCap} title="Agenda livre" text="Cadastre um novo treinamento para iniciar o fluxo." />}</section><section className="flex min-h-72 flex-col justify-between bg-[#171716] p-7 text-white"><UploadCloud className="size-8 text-[#f2ad19]" /><div><span className="eyebrow text-[#f2ad19]">Envio rápido</span><h2 className="mt-4 text-3xl font-black uppercase tracking-[0.02em]">Fotos e documentos em lote</h2><p className="mt-4 text-sm leading-relaxed text-white/55">Arraste até 300 arquivos e vincule cada um ao cliente e treinamento corretos.</p></div><button type="button" onClick={() => navigate('files')} className="mt-7 inline-flex h-12 items-center justify-center gap-2 border border-white/20 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-white hover:text-black">Abrir central de arquivos <ChevronRight className="size-4" /></button></section></div>
  </div>;
}
