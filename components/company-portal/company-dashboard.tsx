'use client';

import { ArrowRight, CircleCheck, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BuscaEquipe, LinhaPendencia, nomeCurto, paradosHaMaisDe2Dias, pendenciasDaEquipe, SinoEquipe } from '@/components/company-portal/company-topo';
import type { NavegarEquipe } from '@/components/company-portal/company-topo';
import { isoFromDate } from '@/components/company-portal/company-ui';
import { BarraSuperior, Botao, botaoClasses, Indicador, Tag } from '@/components/ds/base';
import type { CompanyDashboardData, CompanyTraining, TrainingSession } from '@/lib/company-types';
import { cn } from '@/lib/utils';

type DiaDeTurma = { training: CompanyTraining; session: TrainingSession };

const ordemDoDia = (a: DiaDeTurma, b: DiaDeTurma) =>
  a.session.session_date.localeCompare(b.session.session_date) || a.session.start_time.localeCompare(b.session.start_time);

/** Data ISO → Date ao meio-dia local (evita virar o dia no fuso). */
const dataLocal = (iso: string) => new Date(`${iso}T12:00:00`);
const somarDias = (iso: string, n: number) => { const d = dataLocal(iso); d.setDate(d.getDate() + n); return isoFromDate(d); };

/** "Sábado, 26 de setembro" */
function dataPorExtenso(iso: string) {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dataLocal(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "SÁB 26" */
function rotuloDoDia(iso: string) {
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dataLocal(iso)).replace('.', '').slice(0, 3);
  return `${semana} ${iso.slice(8, 10)}`.toUpperCase();
}

const mesDe = (iso: string) => iso.slice(0, 7);
const nomeDoMes = (iso: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dataLocal(iso));

function situacaoDoDia(session: TrainingSession) {
  if (session.status === 'in_progress') return { texto: 'Em andamento', tom: 'info' as const };
  if (session.status === 'completed') return { texto: 'Concluída', tom: 'sucesso' as const };
  return { texto: 'Agendada', tom: 'neutro' as const };
}

/** Cartão branco do corpo do Painel, com o cabeçalho do Figma (título H4 e ação). */
function Bloco({ titulo, acao, children, className }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={cn('flex flex-col overflow-hidden rounded-lg bg-ds-superficie', className)}>
    <div className="flex items-center justify-between gap-3 border-b border-ds-borda px-5 py-4">
      <h2 className="ds-h4 text-ds-texto">{titulo}</h2>
      {acao}
    </div>
    {children}
  </section>;
}

export function CompanyDashboard({ data, navigate }: { data: CompanyDashboardData; navigate: NavegarEquipe }) {
  // Lido uma vez ao abrir o Painel: a tela não muda de dia sozinha.
  const [agora] = useState(() => Date.now());
  const hoje = isoFromDate(new Date(agora));

  // A agenda fala de dias, não de turmas: um item por dia de turma.
  const dias = useMemo(() => {
    const lista: DiaDeTurma[] = [];
    for (const training of data.trainings) for (const session of training.sessions ?? []) lista.push({ training, session });
    return lista.sort(ordemDoDia);
  }, [data.trainings]);

  const presentesPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of data.attendance) mapa.set(a.session_id, (mapa.get(a.session_id) ?? 0) + 1);
    return mapa;
  }, [data.attendance]);

  const numeros = useMemo(() => {
    const mes = mesDe(hoje);
    const anterior = mesDe(somarDias(`${mes}-01`, -1));
    const turmasDoMes = (m: string) => data.trainings.filter((t) => (t.sessions ?? []).some((s) => mesDe(s.session_date) === m) || (!(t.sessions ?? []).length && mesDe(t.training_date) === m));
    const doMes = turmasDoMes(mes);
    const pessoas = (turmas: CompanyTraining[]) => turmas.reduce((soma, t) => soma + t.participant_count, 0);
    const participantes = pessoas(doMes);
    const antes = pessoas(turmasDoMes(anterior));
    const variacao = antes > 0 ? Math.round(((participantes - antes) / antes) * 100) : null;

    const concluidas = doMes.filter((t) => t.status === 'completed').length;
    const andamento = doMes.filter((t) => t.status === 'in_progress').length;
    const agendadas = doMes.length - concluidas - andamento;

    const aEmitir = data.trainings.filter((t) => t.status === 'completed' && !t.certificate_generated_at);
    const pedidos = [...data.requests.filter((r) => r.status === 'open'), ...data.siteLeads.filter((l) => l.status === 'open'), ...data.documentRequests.filter((r) => r.status === 'open')];
    const paradas = paradosHaMaisDe2Dias(pedidos, agora);

    return {
      turmas: { valor: doMes.length, apoio: [`${concluidas} ${concluidas === 1 ? 'concluída' : 'concluídas'}`, andamento ? `${andamento} em andamento` : '', `${agendadas} ${agendadas === 1 ? 'agendada' : 'agendadas'}`].filter(Boolean).join(' · ') },
      participantes: { valor: participantes, apoio: variacao === null ? `sem turmas em ${nomeDoMes(`${anterior}-01`)}` : `${variacao >= 0 ? '+' : ''}${variacao}% sobre ${nomeDoMes(`${anterior}-01`)}` },
      certificados: { valor: `${aEmitir.length} ${aEmitir.length === 1 ? 'turma' : 'turmas'}`, apoio: aEmitir.length ? `${pessoas(aEmitir)} participantes aguardando` : 'nada aguardando emissão' },
      solicitacoes: { valor: pedidos.length, apoio: paradas ? `${paradas} sem resposta há 2 dias` : pedidos.length ? 'todas com menos de 2 dias' : 'nenhuma em aberto' },
    };
  }, [data, hoje, agora]);

  const doDia = useMemo(() => dias.filter((d) => d.session.session_date === hoje), [dias, hoje]);
  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const iso = somarDias(hoje, i);
    return { iso, itens: dias.filter((d) => d.session.session_date === iso) };
  }), [dias, hoje]);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  return <div className="flex flex-col gap-5">
    <BarraSuperior
      titulo="Painel"
      subtitulo={`${dataPorExtenso(hoje)} · visão da operação de hoje`}
      acoes={<Botao onClick={() => navigate('trainings', undefined, 'criar')}>Nova turma<Plus /></Botao>}
      busca={<BuscaEquipe data={data} navegar={navigate} />}
      notificacoes={<SinoEquipe pendencias={pendencias} navegar={navigate} />}
    />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador rotulo="Turmas este mês" valor={numeros.turmas.valor} apoio={numeros.turmas.apoio} onClick={() => navigate('trainings')} />
      <Indicador rotulo="Participantes no mês" valor={numeros.participantes.valor} apoio={numeros.participantes.apoio} onClick={() => navigate('participants')} />
      <Indicador rotulo="Certificados a emitir" valor={numeros.certificados.valor} apoio={numeros.certificados.apoio} onClick={() => navigate('certificates')} />
      <Indicador rotulo="Solicitações novas" valor={numeros.solicitacoes.valor} apoio={numeros.solicitacoes.apoio} onClick={() => navigate('requests')} />
    </div>

    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Bloco titulo={`Turmas de hoje · ${doDia.length}`} acao={<button type="button" onClick={() => navigate('trainings', undefined, 'agenda')} className={botaoClasses('link', 'M', 'min-h-0 px-0 py-1')}>Ver agenda<ArrowRight /></button>}>
          {doDia.length ? doDia.map(({ training, session }) => {
            const situacao = situacaoDoDia(session);
            const comecou = session.status !== 'scheduled';
            const presentes = presentesPorDia.get(session.id) ?? 0;
            const instrutor = nomeCurto(session.instructor_name);
            return <button key={session.id} type="button" onClick={() => navigate('trainings', training.id)} className="flex w-full items-center gap-3.5 border-b border-ds-borda px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-ds-muted ds-foco">
              <span aria-hidden className={cn('h-10 w-1 shrink-0 rounded-[2px]', session.status === 'in_progress' ? 'bg-ds-amarelo' : 'bg-ds-borda')} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate ds-body-m font-semibold text-ds-texto">{training.nr} · {training.internal_label || training.title} · {training.client_name}</span>
                <span className="truncate ds-caption text-ds-texto-2">{instrutor ? `Instrutor: ${instrutor}` : <span className="font-medium text-ds-perigo">Sem instrutor</span>}{training.location ? ` · ${training.location}` : ''}</span>
              </span>
              <span className="hidden shrink-0 ds-body-s whitespace-nowrap text-ds-texto-2 sm:block">
                {comecou ? `${presentes} de ${training.participant_count} presentes` : session.start_time ? `Começa às ${session.start_time}` : 'Horário a definir'}
              </span>
              <Tag tom={situacao.tom} className="shrink-0">{situacao.texto}</Tag>
            </button>;
          }) : <p className="px-5 py-4 ds-body-s text-ds-texto-2">Nenhuma turma hoje.</p>}
        </Bloco>

        <Bloco titulo="Próximos 7 dias">
          <div className="overflow-x-auto">
            <div className="grid min-h-[320px] min-w-[672px] grid-cols-7">
              {semana.map(({ iso, itens }, i) => <div key={iso} className={cn('flex min-w-0 flex-col gap-2 border-ds-borda px-2.5 py-3', i < 6 && 'border-r', i === 0 && 'bg-ds-amarelo-suave')}>
                <span className={cn('ds-caps whitespace-nowrap', i === 0 ? 'text-ds-texto' : 'text-ds-texto-2')}>{rotuloDoDia(iso)}</span>
                {itens.map(({ training, session }) => {
                  const sem = !session.instructor_id;
                  return <button key={session.id} type="button" onClick={() => navigate('trainings', training.id)} title={`${training.nr} · ${training.internal_label || training.title} · ${training.client_name}`}
                    className={cn('flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-sm px-2 py-1.5 text-left ds-caption transition-opacity hover:opacity-85 ds-foco', sem ? 'bg-ds-perigo-suave text-ds-perigo' : 'bg-ds-inverso')}>
                    <span className={cn('max-w-full truncate', !sem && 'text-ds-amarelo')}>{training.nr}</span>
                    <span className={cn('max-w-full truncate', !sem && 'text-ds-texto-inv')}>{sem ? 'Sem instrutor' : (session.instructor_name ?? '').split(/\s+/)[0]}</span>
                  </button>;
                })}
              </div>)}
            </div>
          </div>
        </Bloco>
      </div>

      <Bloco titulo={`Pendências · ${pendencias.length}`} className="w-full shrink-0 lg:w-[360px]">
        {pendencias.length
          ? pendencias.map((p) => <LinhaPendencia key={p.id} item={p} onClick={() => navigate(...p.ir)} />)
          : <div className="flex items-center gap-3 px-5 py-4"><CircleCheck className="size-5 shrink-0 text-ds-sucesso" /><span className="ds-body-s text-ds-texto-2">Nada pendente: instrutores escalados, listas enviadas e certificados emitidos.</span></div>}
      </Bloco>
    </div>
  </div>;
}
