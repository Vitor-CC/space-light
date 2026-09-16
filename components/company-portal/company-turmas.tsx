'use client';

import { ptBR } from 'date-fns/locale';
import { CalendarPlus, ChevronRight, Loader2, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import {
  dateFromIso,
  diasSemInstrutor,
  digitos,
  formatDate,
  formatWindow,
  instrutoresDaTurma,
  isoFromDate,
  nomeDaTurma,
  type DadosDaGestao,
  type Notify,
  type Reload,
} from '@/components/company-portal/company-ui';
import {
  Abas,
  Cabecalho,
  SeloDeEstado,
  Vazio,
  areaDeTexto,
  botao,
  botaoIcone,
  botaoTexto,
  campo,
  mono,
  rotulo,
} from '@/components/portal/kit';
import { Calendar } from '@/components/ui/calendar';
import type { CompanyTraining, TrainingSession } from '@/lib/company-types';
import { dataDoDia, proximoDiaDaTurma } from '@/lib/dias-da-turma';
import { createMockTraining, type NovoDia } from '@/lib/mock-company-database';
import { nrInfo } from '@/lib/nr-catalog';
import { cn } from '@/lib/utils';

export const NORMAS = [
  'NR 05',
  'NR 06',
  'NR 10',
  'NR 11',
  'NR 12',
  'NR 18',
  'NR 20',
  'NR 23',
  'NR 33',
  'NR 34',
  'NR 35',
];

type Filtro = 'scheduled' | 'in_progress' | 'completed' | 'todas';

// ---------------------------------------------------------------------------
// Linhas de turma (usadas na lista, no Hoje e na ficha do cliente)
// ---------------------------------------------------------------------------

export function TabelaDeTurmas({
  turmas,
  abrir,
  vazio,
}: {
  turmas: CompanyTraining[];
  abrir: (id: string) => void;
  vazio: React.ReactNode;
}) {
  const hoje = isoFromDate(new Date());
  if (turmas.length === 0) return <>{vazio}</>;
  return (
    <ul className="border-t border-doc-ink">
      <li
        aria-hidden="true"
        className="hidden border-b border-doc-rule-strong py-2 font-doc-mono text-xs text-doc-ink-muted lg:grid lg:grid-cols-[8.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem_1rem] lg:gap-x-4"
      >
        <span>Próximo dia</span>
        <span>Turma</span>
        <span>Cliente</span>
        <span>Instrutor</span>
        <span>Situação</span>
        <span />
      </li>
      {turmas.map((training) => {
        const dia = proximoDiaDaTurma(training);
        const data = dataDoDia(training);
        const total = (training.sessions ?? []).length;
        const atrasada = training.status !== 'completed' && data < hoje;
        const semInstrutor =
          training.status !== 'completed' ? diasSemInstrutor(training) : 0;
        const instrutores = instrutoresDaTurma(training);
        return (
          <li key={training.id} className="border-b border-doc-rule-strong">
            <button
              type="button"
              onClick={() => abrir(training.id)}
              className="doc-focus grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 text-left hover:bg-doc-sheet lg:grid-cols-[8.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem_1rem] lg:items-center"
            >
              <span
                className={cn(mono, 'text-sm', atrasada && 'text-doc-error')}
              >
                {formatDate(data)}
                {total > 1 && dia ? (
                  <span className="ml-2 text-xs text-doc-ink-muted lg:ml-0 lg:block">
                    dia {dia.day_number} de {total}
                  </span>
                ) : null}
                {atrasada ? (
                  <span className="ml-2 text-xs lg:ml-0 lg:block">
                    atrasada
                  </span>
                ) : null}
              </span>
              <span className="col-span-2 min-w-0 lg:col-span-1">
                <span className="block font-semibold">
                  <span className="font-doc-mono text-doc-mark">
                    {training.nr}
                  </span>{' '}
                  {nomeDaTurma(training)}
                </span>
                <span className={cn(mono, 'block text-xs text-doc-ink-muted')}>
                  {training.code} · {training.participant_count} inscrito(s)
                </span>
              </span>
              <span className="col-span-2 truncate text-sm lg:col-span-1">
                {training.client_name}
              </span>
              <span
                className={cn(
                  'col-span-2 truncate text-sm lg:col-span-1',
                  semInstrutor > 0
                    ? 'font-semibold text-doc-error'
                    : 'text-doc-ink-muted',
                )}
              >
                {semInstrutor > 0
                  ? `${semInstrutor} dia(s) sem instrutor`
                  : instrutores.join(', ') || '—'}
              </span>
              <span className="row-start-1 justify-self-end lg:row-start-auto lg:justify-self-start">
                <SeloDeEstado status={training.status} />
              </span>
              <ChevronRight
                className="hidden size-4 text-doc-ink-muted lg:block"
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Lista de turmas
// ---------------------------------------------------------------------------

export function ListaDeTurmas({
  data,
  abrir,
  criar,
  filtroInicial,
}: {
  data: DadosDaGestao;
  abrir: (id: string) => void;
  criar: () => void;
  filtroInicial?: { semInstrutor?: boolean };
}) {
  const [filtro, setFiltro] = useState<Filtro>('scheduled');
  const [busca, setBusca] = useState('');
  const [soSemInstrutor, setSoSemInstrutor] = useState(
    Boolean(filtroInicial?.semInstrutor),
  );
  const [visao, setVisao] = useState<'lista' | 'calendario'>('lista');

  const alvo = busca.trim().toLowerCase();
  const casaBusca = (training: CompanyTraining) =>
    !alvo ||
    `${training.title} ${training.internal_label} ${training.nr} ${training.client_name} ${training.code}`
      .toLowerCase()
      .includes(alvo);
  const contagem = (status: Filtro) =>
    status === 'todas'
      ? data.trainings.length
      : data.trainings.filter((item) => item.status === status).length;

  const turmas = data.trainings
    .filter((training) => filtro === 'todas' || training.status === filtro)
    .filter(casaBusca)
    .filter(
      (training) =>
        !soSemInstrutor ||
        (training.status !== 'completed' && diasSemInstrutor(training) > 0),
    )
    // Concluídas: mais recentes primeiro. Em aberto: o dia mais próximo primeiro.
    .sort((a, b) =>
      filtro === 'completed'
        ? dataDoDia(b).localeCompare(dataDoDia(a))
        : dataDoDia(a).localeCompare(dataDoDia(b)),
    );

  return (
    <div className="space-y-6">
      <Cabecalho
        titulo="Turmas"
        acoes={
          <button type="button" onClick={criar} className={botao()}>
            <Plus className="size-4" aria-hidden="true" />
            Nova turma
          </button>
        }
      />
      <div className="flex flex-wrap gap-5">
        {(['lista', 'calendario'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setVisao(opcao)}
            aria-pressed={visao === opcao}
            className={cn(
              'doc-focus border-b-2 pb-1 text-sm font-semibold',
              visao === opcao
                ? 'border-sl-gold'
                : 'border-transparent text-doc-ink-muted hover:text-doc-ink',
            )}
          >
            {opcao === 'lista' ? 'Lista' : 'Calendário'}
          </button>
        ))}
      </div>

      {visao === 'calendario' ? (
        <Calendario data={data} abrir={abrir} />
      ) : (
        <Abas
          rotuloDaLista="Turmas por situação"
          ativa={filtro}
          aoMudar={setFiltro}
          abas={[
            {
              id: 'scheduled',
              rotulo: 'Programadas',
              contagem: contagem('scheduled'),
            },
            {
              id: 'in_progress',
              rotulo: 'Em execução',
              contagem: contagem('in_progress'),
            },
            {
              id: 'completed',
              rotulo: 'Concluídas',
              contagem: contagem('completed'),
            },
            { id: 'todas', rotulo: 'Todas', contagem: contagem('todas') },
          ]}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex-1">
              <span className="sr-only">Buscar turma</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, cliente, NR ou código"
                className={campo}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={soSemInstrutor}
                onChange={(e) => setSoSemInstrutor(e.target.checked)}
                className="doc-focus size-4 accent-sl-black"
              />
              Só com dia sem instrutor
            </label>
          </div>
          <TabelaDeTurmas
            turmas={turmas}
            abrir={abrir}
            vazio={
              <Vazio
                titulo="Nenhuma turma aqui"
                texto={
                  alvo || soSemInstrutor
                    ? 'Ajuste a busca ou o filtro.'
                    : 'Crie uma turma em Nova turma.'
                }
              />
            }
          />
        </Abas>
      )}
    </div>
  );
}

/** Calendário dos dias de turma em aberto; contorno vermelho = falta instrutor. */
function Calendario({
  data,
  abrir,
}: {
  data: DadosDaGestao;
  abrir: (id: string) => void;
}) {
  const [selecionada, setSelecionada] = useState<Date | undefined>(new Date());
  const porData = useMemo(() => {
    const mapa = new Map<
      string,
      { training: CompanyTraining; session: TrainingSession }[]
    >();
    for (const training of data.trainings) {
      if (training.status === 'completed') continue;
      for (const session of training.sessions ?? []) {
        const lista = mapa.get(session.session_date);
        if (lista) lista.push({ training, session });
        else mapa.set(session.session_date, [{ training, session }]);
      }
    }
    return mapa;
  }, [data.trainings]);
  const comTreino = useMemo(
    () => [...porData.keys()].map(dateFromIso),
    [porData],
  );
  const semEscala = useMemo(
    () =>
      [...porData.entries()]
        .filter(([, itens]) =>
          itens.some((item) => !item.session.instructor_id),
        )
        .map(([iso]) => dateFromIso(iso)),
    [porData],
  );
  const iso = selecionada ? isoFromDate(selecionada) : '';
  const doDia = porData.get(iso) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div>
        <Calendar
          mode="single"
          selected={selecionada}
          onSelect={setSelecionada}
          locale={ptBR}
          modifiers={{ treino: comTreino, semEscala }}
          modifiersClassNames={{
            treino: 'bg-doc-ink text-doc-paper font-bold',
            semEscala: 'ring-2 ring-doc-error ring-inset',
          }}
          className="w-full border border-doc-rule-strong bg-doc-sheet [--cell-size:--spacing(11)]"
        />
        <p className="mt-3 flex flex-wrap gap-4 font-doc-mono text-xs text-doc-ink-muted">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="size-3 bg-doc-ink" />
            Dia de turma
          </span>
          <span className="inline-flex items-center gap-2">
            <i
              aria-hidden="true"
              className="size-3 border-2 border-doc-error"
            />
            Falta instrutor
          </span>
        </p>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">
          {selecionada ? formatDate(iso) : 'Escolha uma data'}{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {doDia.length}
          </span>
        </h2>
        {doDia.length === 0 ? (
          <Vazio titulo="Nenhuma turma nesta data" />
        ) : (
          <ul className="border-t border-doc-ink">
            {doDia.map(({ training, session }) => (
              <li key={session.id} className="border-b border-doc-rule-strong">
                <button
                  type="button"
                  onClick={() => abrir(training.id)}
                  className="doc-focus flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-doc-sheet"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      <span className="font-doc-mono text-doc-mark">
                        {training.nr}
                      </span>{' '}
                      {nomeDaTurma(training)}
                    </span>
                    <span className="block text-sm text-doc-ink-muted">
                      {training.client_name} · dia {session.day_number} de{' '}
                      {training.sessions.length}
                      {formatWindow(session)
                        ? ` · ${formatWindow(session)}`
                        : ''}
                    </span>
                    <span
                      className={cn(
                        'block text-sm',
                        session.instructor_name
                          ? 'text-doc-ink-muted'
                          : 'font-semibold text-doc-error',
                      )}
                    >
                      {session.instructor_name ?? 'Sem instrutor'}
                    </span>
                  </span>
                  <SeloDeEstado status={session.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

type Draft = {
  clientId: string;
  nr: string;
  title: string;
  internalLabel: string;
  days: NovoDia[];
  contentProgram: string;
  duration: string;
  location: string;
};

function diaVazio(instructorId: string | null = null): NovoDia {
  return { date: '', startTime: '08:00', endTime: '18:00', instructorId };
}

export function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: DadosDaGestao['clients'];
  value: string;
  onChange: (id: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const alvo = busca.trim().toLowerCase();
  const alvoDigitos = digitos(busca);
  const filtrados = useMemo(() => {
    if (!alvo) return clients;
    return clients.filter(
      (client) =>
        `${client.name} ${client.legal_name}`.toLowerCase().includes(alvo) ||
        (alvoDigitos.length > 0 &&
          digitos(client.document).includes(alvoDigitos)),
    );
  }, [clients, alvo, alvoDigitos]);
  const escolhido = clients.find((client) => client.id === value);

  return (
    <div>
      <label htmlFor="cliente-busca" className={rotulo}>
        Cliente
      </label>
      <input
        id="cliente-busca"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou CNPJ"
        className={campo}
      />
      <select
        aria-label="Cliente do treinamento"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={Math.min(6, Math.max(3, filtrados.length))}
        className={cn(campo, 'mt-2 h-auto py-1')}
      >
        {filtrados.map((client) => (
          <option key={client.id} value={client.id} className="px-2 py-1.5">
            {client.name} · {client.document}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-sm text-doc-ink-muted">
        {filtrados.length === 0
          ? 'Nenhum cliente com esse nome ou CNPJ.'
          : escolhido
            ? `Selecionado: ${escolhido.legal_name}`
            : 'Escolha um cliente na lista.'}
      </p>
    </div>
  );
}

export function CriarTurma({
  data,
  reload,
  notify,
  voltar,
  aoCriar,
}: {
  data: DadosDaGestao;
  reload: Reload;
  notify: Notify;
  voltar: () => void;
  aoCriar: (id: string) => void;
}) {
  const instrutores = data.instructors.filter(
    (item) => item.status === 'active',
  );
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    clientId: data.clients[0]?.id || '',
    nr: 'NR 23',
    title: '',
    internalLabel: '',
    days: [diaVazio()],
    contentProgram: nrInfo('NR 23')?.content ?? '',
    duration: '8 horas',
    location: '',
  });

  function changeNr(nr: string) {
    setDraft((current) => {
      const previous = nrInfo(current.nr)?.content ?? '';
      const custom =
        current.contentProgram.trim() !== '' &&
        current.contentProgram !== previous;
      return {
        ...current,
        nr,
        contentProgram: custom
          ? current.contentProgram
          : (nrInfo(nr)?.content ?? ''),
      };
    });
  }
  function setDia(index: number, campos: Partial<NovoDia>) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((dia, i) =>
        i === index ? { ...dia, ...campos } : dia,
      ),
    }));
  }
  function addDia() {
    // O dia novo repete o horário e o instrutor do anterior: é o caso comum.
    setDraft((current) => {
      const ultimo = current.days[current.days.length - 1];
      return {
        ...current,
        days: [
          ...current.days,
          {
            date: '',
            startTime: ultimo?.startTime ?? '08:00',
            endTime: ultimo?.endTime ?? '18:00',
            instructorId: ultimo?.instructorId ?? null,
          },
        ],
      };
    });
  }
  function removeDia(index: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.filter((_, i) => i !== index),
    }));
  }

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      const result = await createMockTraining(draft);
      notify('Turma criada com QR Code próprio.');
      await reload();
      aoCriar(result.id);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao criar treinamento.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Cabecalho
        voltar={{ rotulo: 'Turmas', aoVoltar: voltar }}
        titulo="Nova turma"
      />
      <form onSubmit={save} className="grid max-w-3xl gap-6">
        {data.clients.length === 0 ? (
          <Vazio titulo="Cadastre um cliente antes de criar a turma" />
        ) : (
          <ClientPicker
            clients={data.clients}
            value={draft.clientId}
            onChange={(id) => setDraft({ ...draft, clientId: id })}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
          <label>
            <span className={rotulo}>Norma</span>
            <select
              value={draft.nr}
              onChange={(e) => changeNr(e.target.value)}
              className={campo}
            >
              {NORMAS.map((nr) => (
                <option key={nr}>{nr}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>Título no certificado</span>
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Ex.: Brigada de Incêndio - Intermediário"
              className={campo}
            />
          </label>
        </div>
        <label>
          <span className={rotulo}>Identificação interna (opcional)</span>
          <input
            value={draft.internalLabel}
            onChange={(e) =>
              setDraft({ ...draft, internalLabel: e.target.value })
            }
            placeholder="Ex.: Turma A - manhã"
            aria-describedby="nova-identificacao"
            className={campo}
          />
          <span
            id="nova-identificacao"
            className="mt-1.5 block text-sm text-doc-ink-muted"
          >
            Não sai em documento.
          </span>
        </label>

        <fieldset className="border-t border-doc-ink pt-4">
          <legend className="pr-2 font-semibold">Dias</legend>
          <ol className="space-y-3">
            {draft.days.map((dia, index) => (
              <li
                key={index}
                className="grid gap-2 border-b border-doc-rule-strong pb-3 sm:grid-cols-[3.5rem_1fr_7rem_7rem_auto] sm:items-center"
              >
                <span
                  className={cn(mono, 'text-sm font-semibold text-doc-mark')}
                >
                  Dia {index + 1}
                </span>
                <input
                  required
                  type="date"
                  aria-label={`Data do dia ${index + 1}`}
                  value={dia.date}
                  onChange={(e) => setDia(index, { date: e.target.value })}
                  className={cn(campo, mono)}
                />
                <input
                  type="time"
                  aria-label={`Início do dia ${index + 1}`}
                  value={dia.startTime}
                  onChange={(e) => setDia(index, { startTime: e.target.value })}
                  className={cn(campo, mono)}
                />
                <input
                  type="time"
                  aria-label={`Fim do dia ${index + 1}`}
                  value={dia.endTime}
                  onChange={(e) => setDia(index, { endTime: e.target.value })}
                  className={cn(campo, mono)}
                />
                {draft.days.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeDia(index)}
                    aria-label={`Remover o dia ${index + 1}`}
                    className={botaoIcone}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="hidden sm:block sm:w-10" />
                )}
                <select
                  aria-label={`Instrutor do dia ${index + 1}`}
                  value={dia.instructorId ?? ''}
                  onChange={(e) =>
                    setDia(index, { instructorId: e.target.value || null })
                  }
                  className={cn(campo, 'sm:col-span-4 sm:col-start-2')}
                >
                  <option value="">Sem instrutor — escalar depois</option>
                  {instrutores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.specialties}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={addDia}
            className={cn(botaoTexto, 'mt-3')}
          >
            <Plus className="size-4" aria-hidden="true" />
            Adicionar dia
          </button>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={rotulo}>Carga horária</span>
            <input
              required
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Endereço do treinamento</span>
            <input
              required
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Rua, número, bairro e cidade"
              className={campo}
            />
          </label>
        </div>
        <label>
          <span className={rotulo}>Conteúdo programático (sai na lista)</span>
          <textarea
            rows={5}
            value={draft.contentProgram}
            onChange={(e) =>
              setDraft({ ...draft, contentProgram: e.target.value })
            }
            className={areaDeTexto}
          />
        </label>

        <div>
          <button
            disabled={data.clients.length === 0 || salvando}
            type="submit"
            className={botao({
              tamanho: 'lg',
              className: 'w-full disabled:opacity-60 sm:w-auto',
            })}
          >
            {salvando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarPlus className="size-4" aria-hidden="true" />
            )}
            Criar turma
          </button>
        </div>
      </form>
    </div>
  );
}
