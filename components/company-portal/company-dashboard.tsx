'use client';

import { CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Clock3, GraduationCap, TriangleAlert, UserRound } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState, formatDate, formatWindow, isoFromDate } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import { Botao, botaoClasses, Cartao, Indicador } from '@/components/ds/base';
import type { CompanyDashboardData, CompanyTraining, TrainingSession } from '@/lib/company-types';
import { cn } from '@/lib/utils';

type Navigate = (section: CompanySection, trainingId?: string) => void;
type DiaNaAgenda = { training: CompanyTraining; session: TrainingSession };

/** Último dia da turma: é ele que diz se ela já venceu. */
function ultimoDia(training: CompanyTraining) {
  const dias = training.sessions ?? [];
  return dias.reduce((maior, dia) => (dia.session_date > maior ? dia.session_date : maior), training.training_date);
}

const ordemDoDia = (a: DiaNaAgenda, b: DiaNaAgenda) =>
  a.session.session_date.localeCompare(b.session.session_date) || a.session.start_time.localeCompare(b.session.start_time);

/** Uma turma num dia: clicar abre a turma na tela de Turmas. */
function DiaDaAgenda({ item, navigate, destaque = false }: { item: DiaNaAgenda; navigate: Navigate; destaque?: boolean }) {
  const { training, session } = item;
  const dias = training.sessions ?? [];
  const janela = formatWindow(session);
  return <button type="button" onClick={() => navigate('trainings', training.id)}
    className={cn('flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-ds-borda-forte', destaque ? 'border-transparent ds-degrade' : 'border-ds-borda bg-ds-superficie')}>
    <span className={cn('flex shrink-0 items-center justify-center rounded-md px-2 py-1 ds-caps', destaque ? 'bg-ds-inverso text-ds-amarelo' : 'bg-ds-muted text-ds-texto')}>{training.nr}</span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate ds-body-s font-semibold">{training.internal_label || training.title}</strong>
      <span className={cn('mt-0.5 block truncate ds-caption font-medium', destaque ? 'text-ds-texto' : 'text-ds-amarelo-texto')}>{training.client_name}</span>
      <span className={cn('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ds-caption [&_svg]:size-3.5', destaque ? 'text-ds-texto' : 'text-ds-texto-2')}>
        <span className="inline-flex items-center gap-1.5"><CalendarDays />{formatDate(session.session_date)}</span>
        {dias.length > 1 ? <span>dia {session.day_number} de {dias.length}</span> : null}
        {janela ? <span className="inline-flex items-center gap-1.5"><Clock3 />{janela}</span> : null}
        <span className={cn('inline-flex items-center gap-1.5', !session.instructor_name && 'font-medium text-ds-perigo')}><UserRound />{session.instructor_name || 'sem instrutor'}</span>
      </span>
    </span>
    <ChevronRight className="mt-1 size-4 shrink-0" />
  </button>;
}

function Pendencia({ quantidade, singular, plural, tom, onClick }: { quantidade: number; singular: string; plural: string; tom: 'grave' | 'atencao'; onClick: () => void }) {
  if (quantidade === 0) return null;
  const grave = tom === 'grave';
  const cor = grave ? 'text-ds-perigo' : 'text-ds-atencao';
  return <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-lg p-4 text-left transition-opacity hover:opacity-85', grave ? 'bg-ds-perigo-suave' : 'bg-ds-atencao-suave')}>
    <TriangleAlert className={cn('size-5 shrink-0', cor)} />
    <span className={cn('min-w-0 flex-1 ds-body-s font-semibold', cor)}>{quantidade} {quantidade === 1 ? singular : plural}</span>
    <ChevronRight className={cn('size-5 shrink-0', cor)} />
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
      certificados: data.trainings.filter((training) => training.status === 'completed' && !training.certificate_generated_at).length,
      solicitacoes: data.requests.filter((pedido) => pedido.status === 'open').length,
      clientes: data.clients.filter((client) => client.status === 'pending').length,
      instrutores: data.instructors.filter((item) => item.status === 'pending').length,
    };
  }, [data.trainings, data.files, data.clients, data.instructors, data.requests, hoje]);
  const totalPendencias = Object.values(pendencias).reduce((a, b) => a + b, 0);

  return <div className="flex flex-col gap-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="ds-caps text-ds-texto-2">{formatDate(hoje)}</span>
        <h2 className="ds-h4">{doDia.length === 0 ? 'Nenhuma turma hoje' : doDia.length === 1 ? '1 turma hoje' : `${doDia.length} turmas hoje`}</h2>
      </div>
      <Botao onClick={() => navigate('trainings')}><CalendarPlus />Nova turma</Botao>
    </div>

    {doDia.length ? <div className="grid gap-3 md:grid-cols-2">{doDia.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} destaque />)}</div> : null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador rotulo="Clientes" valor={data.clients.length} apoio={`${data.clients.filter((c) => c.status === 'active').length} com acesso ativo`} onClick={() => navigate('clients')} />
      <Indicador rotulo="Turmas" valor={data.trainings.length} apoio={`${data.trainings.filter((t) => t.status !== 'completed').length} em aberto`} onClick={() => navigate('trainings')} />
      <Indicador rotulo="Documentos" valor={data.files.length} apoio="fotos, listas e certificados" onClick={() => navigate('files')} />
      <Indicador rotulo="Participantes" valor={data.participants.length} apoio="em todas as turmas" onClick={() => navigate('participants')} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3"><h2 className="ds-h4">Próximos dias</h2><button type="button" onClick={() => navigate('trainings')} className={botaoClasses('link', 'M')}>Ver turmas <ChevronRight /></button></div>
        {proximos.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} />)}
        {proximos.length === 0 ? <EmptyState icon={GraduationCap} title="Agenda livre" text="Nenhum dia de turma marcado daqui pra frente." /> : null}
        {passados.length ? <>
          <h2 className="mt-4 ds-h4">O que aconteceu</h2>
          {passados.map((item) => <DiaDaAgenda key={item.session.id} item={item} navigate={navigate} />)}
        </> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="ds-h4">Pendências</h2>
        {totalPendencias === 0
          ? <Cartao className="flex items-center gap-4 p-5"><CheckCircle2 className="size-6 shrink-0 text-ds-sucesso" /><div><strong className="block ds-body-s font-semibold">Nada pendente</strong><span className="block ds-caption text-ds-texto-2">Instrutores escalados, listas enviadas, certificados emitidos e cadastros em dia.</span></div></Cartao>
          : <>
            <Pendencia quantidade={pendencias.semInstrutor} singular="turma sem instrutor escalado" plural="turmas sem instrutor escalado" tom="grave" onClick={() => navigate('trainings')} />
            <Pendencia quantidade={pendencias.atrasadas} singular="turma com dia vencido sem encerrar" plural="turmas com dia vencido sem encerrar" tom="grave" onClick={() => navigate('trainings')} />
            <Pendencia quantidade={pendencias.semLista} singular="turma sem lista de presença enviada" plural="turmas sem lista de presença enviada" tom="atencao" onClick={() => navigate('files')} />
            <Pendencia quantidade={pendencias.certificados} singular="turma concluída aguardando certificados" plural="turmas concluídas aguardando certificados" tom="atencao" onClick={() => navigate('certificates')} />
            <Pendencia quantidade={pendencias.solicitacoes} singular="solicitação de turma em aberto" plural="solicitações de turma em aberto" tom="atencao" onClick={() => navigate('requests')} />
            <Pendencia quantidade={pendencias.clientes} singular="cliente aguardando aprovação" plural="clientes aguardando aprovação" tom="atencao" onClick={() => navigate('clients')} />
            <Pendencia quantidade={pendencias.instrutores} singular="instrutor aguardando aprovação" plural="instrutores aguardando aprovação" tom="atencao" onClick={() => navigate('instructors')} />
          </>}
      </section>
    </div>
  </div>;
}
