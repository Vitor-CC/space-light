'use client';

import { Building2, CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Clock3, FileUp, GraduationCap, TriangleAlert, UserRound, UsersRound } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState, formatDate, formatWindow, isoFromDate } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyTraining, TrainingSession } from '@/lib/company-types';

type Navigate = (section: CompanySection, trainingId?: string) => void;
type DiaNaAgenda = { training: CompanyTraining; session: TrainingSession };

/** Último dia da turma: é ele que diz se ela já venceu. */
function ultimoDia(training: CompanyTraining) {
  const dias = training.sessions ?? [];
  return dias.reduce((maior, dia) => (dia.session_date > maior ? dia.session_date : maior), training.training_date);
}

const ordemDoDia = (a: DiaNaAgenda, b: DiaNaAgenda) =>
  a.session.session_date.localeCompare(b.session.session_date) || a.session.start_time.localeCompare(b.session.start_time);

function Metric({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: typeof Building2; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-36 items-center justify-between bg-white p-6 text-left transition hover:bg-[#fff8e8]"><div><strong className="font-heading text-4xl font-black tracking-[-0.015em]">{value}</strong><span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#777]">{label}</span></div><span className="flex size-11 items-center justify-center bg-black text-[#f2ad19] transition group-hover:bg-[#f2ad19] group-hover:text-black"><Icon className="size-5" /></span></button>;
}

/** Uma turma num dia: clicar abre a turma na aba Turmas. */
function DiaDaAgenda({ item, navigate, destaque = false }: { item: DiaNaAgenda; navigate: Navigate; destaque?: boolean }) {
  const { training, session } = item;
  const dias = training.sessions ?? [];
  const janela = formatWindow(session);
  return <button type="button" onClick={() => navigate('trainings', training.id)}
    className={`flex w-full items-start gap-4 border border-black/10 p-4 text-left transition hover:bg-[#fff8e8] ${destaque ? 'bg-white' : 'bg-white'}`}>
    <span className={`flex shrink-0 items-center justify-center font-heading font-black ${destaque ? 'size-12 bg-black text-sm text-[#f2ad19]' : 'size-10 bg-[#171716] text-xs text-[#f2ad19]'}`}>{training.nr}</span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-sm font-extrabold uppercase tracking-[0.04em]">{training.internal_label || training.title}</strong>
      <span className="mt-1 block truncate text-xs font-bold text-[#8a6107]">{training.client_name}</span>
      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666]">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(session.session_date)}</span>
        {dias.length > 1 ? <span>dia {session.day_number} de {dias.length}</span> : null}
        {janela ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{janela}</span> : null}
        <span className={`inline-flex items-center gap-1.5 ${session.instructor_name ? '' : 'font-bold text-[#b62525]'}`}>
          <UserRound className="size-3.5" />{session.instructor_name || 'sem instrutor'}
        </span>
      </span>
    </span>
    <ChevronRight className="mt-1 size-4 shrink-0 text-black/30" />
  </button>;
}

function Pendencia({ quantidade, singular, plural, tom, onClick }: { quantidade: number; singular: string; plural: string; tom: 'grave' | 'atencao'; onClick: () => void }) {
  if (quantidade === 0) return null;
  const grave = tom === 'grave';
  return <button type="button" onClick={onClick}
    className={`flex w-full items-center gap-4 border-l-4 p-4 text-left transition ${grave ? 'border-[#b62525] bg-[#fff5f5] hover:bg-[#ffecec]' : 'border-[#f2ad19] bg-[#fff8e8] hover:bg-[#fff1d4]'}`}>
    <TriangleAlert className={`size-5 shrink-0 ${grave ? 'text-[#b62525]' : 'text-[#8a6107]'}`} />
    <span className={`min-w-0 flex-1 text-sm font-extrabold uppercase tracking-[0.04em] ${grave ? 'text-[#b62525]' : 'text-[#8a6107]'}`}>
      {quantidade} {quantidade === 1 ? singular : plural}
    </span>
    <ChevronRight className={`size-5 shrink-0 ${grave ? 'text-[#b62525]' : 'text-[#8a6107]'}`} />
  </button>;
}

export function CompanyDashboard({ data, navigate }: { data: CompanyDashboardData; navigate: Navigate }) {
  const hoje = isoFromDate(new Date());

  // Um item por DIA de turma: a agenda fala de dias, não de turmas.
  const dias = useMemo(() => {
    const lista: DiaNaAgenda[] = [];
    for (const training of data.trainings) {
      for (const session of training.sessions ?? []) lista.push({ training, session });
    }
    return lista;
  }, [data.trainings]);

  const doDia = useMemo(() => dias.filter((item) => item.session.session_date === hoje).sort(ordemDoDia), [dias, hoje]);
  const proximos = useMemo(() => dias.filter((item) => item.session.session_date > hoje).sort(ordemDoDia).slice(0, 6), [dias, hoje]);
  const passados = useMemo(() => dias.filter((item) => item.session.session_date < hoje).sort((a, b) => ordemDoDia(b, a)).slice(0, 5), [dias, hoje]);

  const pendencias = useMemo(() => {
    const abertas = data.trainings.filter((training) => training.status !== 'completed');
    const comLista = new Set(data.files.filter((file) => file.kind === 'attendance').map((file) => file.training_id));
    return {
      semInstrutor: abertas.filter((training) => (training.sessions ?? []).some((dia) => !dia.instructor_id)).length,
      atrasadas: abertas.filter((training) => ultimoDia(training) < hoje).length,
      semLista: data.trainings.filter((training) => ultimoDia(training) < hoje && !comLista.has(training.id)).length,
      clientes: data.clients.filter((client) => client.status === 'pending').length,
      instrutores: data.instructors.filter((item) => item.status === 'pending').length,
    };
  }, [data.trainings, data.files, data.clients, data.instructors, hoje]);

  const totalPendencias = pendencias.semInstrutor + pendencias.atrasadas + pendencias.semLista + pendencias.clientes + pendencias.instrutores;

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow text-[#8a6107]">{formatDate(hoje)}</span>
        <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">{doDia.length === 0 ? 'Nenhuma turma hoje' : doDia.length === 1 ? '1 turma hoje' : `${doDia.length} turmas hoje`}</h2>
      </div>
      <button type="button" onClick={() => navigate('trainings')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><CalendarPlus className="size-4" />Novo treinamento</button>
    </div>

    {doDia.length ? <div className="grid gap-px bg-black/10 md:grid-cols-2">{doDia.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} destaque />)}</div> : null}

    <div className="grid gap-px bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Clientes ativos" value={data.clients.length} icon={Building2} onClick={() => navigate('clients')} />
      <Metric label="Treinamentos" value={data.trainings.length} icon={GraduationCap} onClick={() => navigate('trainings')} />
      <Metric label="Documentos" value={data.files.length} icon={FileUp} onClick={() => navigate('files')} />
      <Metric label="Participantes" value={data.participants.length} icon={UsersRound} onClick={() => navigate('participants')} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><span className="eyebrow text-[#8a6107]">Agenda</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">O que vem</h2></div>
          <button type="button" onClick={() => navigate('trainings')} className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">Ver agenda</button>
        </div>
        <div className="space-y-3">
          {proximos.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} />)}
          {proximos.length === 0 ? <EmptyState icon={GraduationCap} title="Agenda livre" text="Nenhum dia de turma marcado daqui pra frente." /> : null}
        </div>

        {passados.length ? <>
          <h2 className="mb-4 mt-7 text-2xl font-extrabold uppercase tracking-[0.03em]">O que aconteceu</h2>
          <div className="space-y-3">{passados.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} />)}</div>
        </> : null}
      </section>

      <section>
        <div className="mb-4"><span className="eyebrow text-[#8a6107]">Pendências</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">O que precisa acontecer</h2></div>
        {totalPendencias === 0
          ? <div className="flex items-center gap-4 border border-black/10 bg-white p-6"><CheckCircle2 className="size-6 shrink-0 text-[#17642d]" /><div><strong className="block text-sm font-extrabold uppercase tracking-[0.04em]">Nada pendente</strong><span className="mt-1 block text-xs text-[#666]">Instrutores escalados, listas enviadas e cadastros em dia.</span></div></div>
          : <div className="space-y-3">
            <Pendencia quantidade={pendencias.semInstrutor} singular="turma sem instrutor escalado" plural="turmas sem instrutor escalado" tom="grave" onClick={() => navigate('trainings')} />
            <Pendencia quantidade={pendencias.atrasadas} singular="turma com dia vencido sem encerrar" plural="turmas com dia vencido sem encerrar" tom="grave" onClick={() => navigate('trainings')} />
            <Pendencia quantidade={pendencias.semLista} singular="turma sem lista de presença enviada" plural="turmas sem lista de presença enviada" tom="atencao" onClick={() => navigate('files')} />
            <Pendencia quantidade={pendencias.clientes} singular="cliente aguardando aprovação" plural="clientes aguardando aprovação" tom="atencao" onClick={() => navigate('clients')} />
            <Pendencia quantidade={pendencias.instrutores} singular="instrutor aguardando aprovação" plural="instrutores aguardando aprovação" tom="atencao" onClick={() => navigate('instructors')} />
          </div>}
      </section>
    </div>
  </div>;
}
