'use client';

import { Award, Building2, CalendarPlus, ChevronRight, FileUp, GraduationCap, Images, QrCode, UploadCloud, UsersRound } from 'lucide-react';

import { EmptyState, TrainingSummary } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData } from '@/lib/company-types';

function Metric({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: typeof Building2; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-36 items-center justify-between bg-white p-6 text-left transition hover:bg-[#fff8e8]"><div><strong className="font-heading text-4xl font-black tracking-[-0.05em]">{value}</strong><span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#777]">{label}</span></div><span className="flex size-11 items-center justify-center bg-black text-[#f2ad19] transition group-hover:bg-[#f2ad19] group-hover:text-black"><Icon className="size-5" /></span></button>;
}

export function CompanyDashboard({ data, navigate }: { data: CompanyDashboardData; navigate: (section: CompanySection) => void }) {
  const nextTraining = [...data.trainings].filter((item) => item.status !== 'completed').sort((a, b) => a.training_date.localeCompare(b.training_date))[0];
  const completed = data.trainings.filter((item) => item.status === 'completed').length;
  const photos = data.files.filter((item) => item.kind === 'photo').length;
  const flow = [
    ['01', 'Cliente', `${data.clients.length} cadastros`, Building2, 'clients' as const],
    ['02', 'Treinamento', `${data.trainings.length} turmas`, GraduationCap, 'trainings' as const],
    ['03', 'QR público', `${data.trainings.length} links`, QrCode, 'participants' as const],
    ['04', 'Participantes', `${data.participants.length} inscritos`, UsersRound, 'participants' as const],
    ['05', 'Arquivos', `${photos} fotos`, Images, 'files' as const],
    ['06', 'Certificados', `${completed} lotes`, Award, 'certificates' as const],
  ];
  return <div className="space-y-7">
    <div className="relative overflow-hidden bg-black p-7 text-white md:p-10"><div className="hero-grid absolute inset-0 opacity-25" /><div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><span className="eyebrow text-[#f2ad19]">Operação Space Light</span><h2 className="mt-4 max-w-3xl text-3xl font-black uppercase leading-[0.94] tracking-[-0.055em] md:text-5xl">Do cadastro do cliente à entrega dos certificados.</h2><p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/60">Cada item fica ligado ao cliente e ao treinamento certo, evitando arquivos soltos e retrabalho.</p></div><button type="button" onClick={() => navigate('trainings')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-black hover:bg-[#ff9900]"><CalendarPlus className="size-4" />Novo treinamento</button></div></div>
    <div className="grid gap-px bg-black/10 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Clientes ativos" value={data.clients.length} icon={Building2} onClick={() => navigate('clients')} /><Metric label="Treinamentos" value={data.trainings.length} icon={GraduationCap} onClick={() => navigate('trainings')} /><Metric label="Arquivos" value={data.files.length} icon={FileUp} onClick={() => navigate('files')} /><Metric label="Participantes" value={data.participants.length} icon={UsersRound} onClick={() => navigate('participants')} /></div>
    <section><div className="mb-4"><span className="eyebrow text-[#8a6107]">Fluxo conectado</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-0.04em]">Como cada entrega avança</h2></div><div className="grid gap-px bg-black/10 md:grid-cols-3 xl:grid-cols-6">{flow.map(([number, label, value, Icon, section]) => <button type="button" key={String(label)} onClick={() => navigate(section as CompanySection)} className="group min-h-40 bg-white p-5 text-left hover:bg-[#fff8e8]"><div className="flex items-start justify-between"><span className="font-heading text-2xl font-black text-[#f2ad19]">{String(number)}</span><Icon className="size-4 text-black/25 group-hover:text-black" /></div><strong className="mt-9 block text-xs uppercase">{String(label)}</strong><span className="mt-2 block text-[10px] text-[#777]">{String(value)}</span></button>)}</div></section>
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow text-[#8a6107]">Agenda</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-0.04em]">Próximo treinamento</h2></div><button type="button" onClick={() => navigate('trainings')} className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a6107]">Ver todos</button></div>{nextTraining ? <TrainingSummary training={nextTraining} /> : <EmptyState icon={GraduationCap} title="Agenda livre" text="Cadastre um novo treinamento para iniciar o fluxo." />}</section><section className="flex min-h-72 flex-col justify-between bg-[#171716] p-7 text-white"><UploadCloud className="size-8 text-[#f2ad19]" /><div><span className="eyebrow text-[#f2ad19]">Envio rápido</span><h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.045em]">Fotos e documentos em lote</h2><p className="mt-4 text-sm leading-relaxed text-white/55">Arraste até 300 arquivos. Nesta simulação os metadados ficam no banco local; na Locaweb os arquivos irão para o armazenamento do servidor.</p></div><button type="button" onClick={() => navigate('files')} className="mt-7 inline-flex h-12 items-center justify-center gap-2 border border-white/20 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-white hover:text-black">Abrir central de arquivos <ChevronRight className="size-4" /></button></section></div>
  </div>;
}
