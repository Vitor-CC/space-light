'use client';

import { ptBR } from 'date-fns/locale';
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { TabelaDeTurmas } from '@/components/company-portal/company-turmas';
import {
  AccessCredentials,
  dateFromIso,
  formatDate,
  isoFromDate,
  nomeDaTurma,
  type DadosDaGestao,
  type Notify,
  type Reload,
} from '@/components/company-portal/company-ui';
import {
  Cabecalho,
  Carregando,
  Confirmar,
  Dados,
  Vazio,
  botao,
  botaoPerigo,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import { Calendar } from '@/components/ui/calendar';
import { registroValido } from '@/lib/certificate-config';
import type {
  CompanyInstructor,
  CompanyTraining,
  TrainingSession,
} from '@/lib/company-types';
import {
  INSTRUCTOR_DOCUMENT_STATUS,
  REQUIRED_INSTRUCTOR_DOCUMENTS,
} from '@/lib/instructor-documents';
import {
  approveInstructor,
  createInstructor,
  deleteInstructor,
  resetUserPassword,
  reviewInstructorDocument,
  updateInstructor,
} from '@/lib/mock-company-database';
import { cn } from '@/lib/utils';

export type DocumentoDeInstrutor = {
  id: string;
  instructorId: string;
  category: string;
  name: string;
  status: string;
  size: number;
  createdAt: string;
};
export type FiltroDeInstrutor =
  | 'todos'
  | 'pending'
  | 'active'
  | 'sem_registro'
  | 'documentos';

/** Turmas em que o instrutor tem ao menos um dia. */
function turmasDo(data: DadosDaGestao, instructorId: string) {
  return data.trainings.filter((training) =>
    (training.sessions ?? []).some((dia) => dia.instructor_id === instructorId),
  );
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export function ListaDeInstrutores({
  data,
  documentos,
  abrir,
  cadastrar,
  filtroInicial = 'todos',
}: {
  data: DadosDaGestao;
  documentos: DocumentoDeInstrutor[] | null;
  abrir: (id: string) => void;
  cadastrar: () => void;
  filtroInicial?: FiltroDeInstrutor;
}) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeInstrutor>(filtroInicial);
  const [visao, setVisao] = useState<'lista' | 'disponibilidade'>('lista');
  const alvo = busca.trim().toLowerCase();
  const pendentesDe = (id: string) =>
    (documentos ?? []).filter(
      (doc) => doc.instructorId === id && doc.status === 'pending',
    ).length;
  const instrutores = data.instructors.filter((item) => {
    if (
      alvo &&
      !`${item.name} ${item.document} ${item.specialties} ${item.email}`
        .toLowerCase()
        .includes(alvo)
    )
      return false;
    if (filtro === 'sem_registro')
      return !registroValido(item.professional_registry);
    if (filtro === 'documentos') return pendentesDe(item.id) > 0;
    if (filtro === 'todos') return true;
    return item.status === filtro;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5">
        {(['lista', 'disponibilidade'] as const).map((opcao) => (
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
            {opcao === 'lista' ? 'Lista' : 'Disponibilidade por data'}
          </button>
        ))}
      </div>
      {visao === 'disponibilidade' ? (
        <DisponibilidadePorData data={data} abrir={abrir} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Buscar instrutor</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nome, CPF, e-mail ou especialidade"
                className={campo}
              />
            </label>
            <label className="sm:w-64">
              <span className="sr-only">Filtrar instrutores</span>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as FiltroDeInstrutor)}
                className={campo}
              >
                <option value="todos">Todos</option>
                <option value="active">Ativos</option>
                <option value="pending">Aguardando aprovação</option>
                <option value="documentos">Com documento para conferir</option>
                <option value="sem_registro">Sem registro MTE/RE</option>
              </select>
            </label>
            <button
              type="button"
              onClick={cadastrar}
              className={botao({ tamanho: 'lg' })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Cadastrar instrutor
            </button>
          </div>
          {instrutores.length === 0 ? (
            <Vazio
              titulo="Nenhum instrutor encontrado"
              texto="Ajuste a busca ou cadastre um instrutor."
            />
          ) : (
            <ul className="border-t border-doc-ink">
              {instrutores.map((instructor) => {
                const pendentes = pendentesDe(instructor.id);
                const faltas = [
                  !registroValido(instructor.professional_registry) &&
                    'sem registro',
                  pendentes > 0 && `${pendentes} documento(s) para conferir`,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li
                    key={instructor.id}
                    className="border-b border-doc-rule-strong"
                  >
                    <button
                      type="button"
                      onClick={() => abrir(instructor.id)}
                      className="doc-focus grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 text-left hover:bg-doc-sheet md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5rem_minmax(0,1fr)_1rem] md:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {instructor.name}
                        </span>
                        <span className="block truncate text-sm text-doc-ink-muted">
                          {instructor.base_city || 'Sem cidade base'}
                        </span>
                      </span>
                      <span className="truncate text-sm text-doc-mark">
                        {instructor.specialties}
                      </span>
                      <span
                        className={cn(
                          mono,
                          'text-xs text-doc-ink-muted md:text-sm',
                        )}
                      >
                        {turmasDo(data, instructor.id).length} turma(s)
                      </span>
                      <span className="text-sm">
                        <span
                          className={
                            instructor.status === 'pending'
                              ? 'font-semibold text-doc-mark'
                              : ''
                          }
                        >
                          {instructor.status === 'pending'
                            ? 'Aguardando aprovação'
                            : 'Ativo'}
                        </span>
                        {faltas ? (
                          <span className="block text-doc-error">{faltas}</span>
                        ) : null}
                      </span>
                      <ChevronRight
                        className="hidden size-4 text-doc-ink-muted md:block"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------

type DadosInstrutor = {
  name: string;
  document: string;
  email: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
};

export function FichaDoInstrutor({
  data,
  instructor,
  documentos,
  voltar,
  abrirTurma,
  reload,
  recarregarDocumentos,
  notify,
}: {
  data: DadosDaGestao;
  instructor: CompanyInstructor;
  documentos: DocumentoDeInstrutor[] | null;
  voltar: () => void;
  abrirTurma: (id: string) => void;
  reload: Reload;
  recarregarDocumentos: () => Promise<void>;
  notify: Notify;
}) {
  const [resetAccess, setResetAccess] = useState<{
    email: string;
    temporaryPassword: string;
    active: boolean;
  } | null>(null);
  const [confirmando, setConfirmando] = useState<
    '' | 'aprovar' | 'senha' | 'excluir'
  >('');
  const pendente = instructor.status === 'pending';
  const semRegistro = !registroValido(instructor.professional_registry);
  const meus = (documentos ?? []).filter(
    (item) => item.instructorId === instructor.id,
  );
  const aprovados = REQUIRED_INSTRUCTOR_DOCUMENTS.filter((r) =>
    meus.some(
      (doc) => doc.category === r.category && doc.status === 'approved',
    ),
  ).length;
  const faltam = REQUIRED_INSTRUCTOR_DOCUMENTS.length - aprovados;
  const disponibilidade = data.instructorAvailability
    .filter((item) => item.instructor_id === instructor.id)
    .sort((a, b) => a.available_date.localeCompare(b.available_date));
  const turmas = turmasDo(data, instructor.id);

  async function decidir(documentId: string, status: 'approved' | 'rejected') {
    try {
      const result = await reviewInstructorDocument(documentId, status);
      notify(
        result.activated
          ? 'Documento aprovado. Os três estão em ordem: o acesso do instrutor foi liberado.'
          : status === 'approved'
            ? 'Documento aprovado.'
            : 'Documento recusado.',
      );
      await recarregarDocumentos();
      if (result.activated) await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao avaliar o documento.',
      );
    }
  }
  // Liberar na mão continua possível; com documento faltando, pede confirmação.
  async function aprovar() {
    setConfirmando('');
    try {
      await approveInstructor(instructor.id);
      notify('Acesso do instrutor liberado.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao aprovar instrutor.',
      );
    }
  }
  async function remover() {
    try {
      await deleteInstructor(instructor.id);
      notify('Instrutor excluído.');
      await reload();
      voltar();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao excluir o instrutor.',
      );
    }
  }
  async function redefinir() {
    setConfirmando('');
    try {
      setResetAccess(await resetUserPassword({ instructorId: instructor.id }));
      notify('Senha temporária gerada.');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao redefinir a senha.',
      );
    }
  }

  return (
    <div className="space-y-10">
      <Cabecalho
        voltar={{ rotulo: 'Instrutores', aoVoltar: voltar }}
        titulo={instructor.name}
        meta={
          <>
            <span className={mono}>{instructor.document}</span>
            <span>{pendente ? 'Aguardando aprovação' : 'Ativo'}</span>
            <span>
              {aprovados} de {REQUIRED_INSTRUCTOR_DOCUMENTS.length} documentos
              aprovados
            </span>
          </>
        }
        acoes={
          <>
            {pendente ? (
              <button
                type="button"
                onClick={() =>
                  faltam > 0 ? setConfirmando('aprovar') : void aprovar()
                }
                className={botao()}
              >
                <Check className="size-4" aria-hidden="true" />
                Aprovar acesso
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirmando('senha')}
              className={botao({ variante: 'contorno' })}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Redefinir senha
            </button>
          </>
        }
      />
      {confirmando === 'aprovar' ? (
        <Confirmar
          titulo="Liberar o acesso mesmo assim?"
          texto={`${faltam === 1 ? 'Falta 1 documento aprovado' : `Faltam ${faltam} documentos aprovados`}.`}
          confirmar="Liberar acesso"
          aoConfirmar={() => void aprovar()}
          aoCancelar={() => setConfirmando('')}
        />
      ) : null}
      {confirmando === 'senha' ? (
        <Confirmar
          titulo={`Gerar senha temporária para ${instructor.name}?`}
          texto="A senha atual deixa de funcionar na hora."
          confirmar="Gerar senha"
          aoConfirmar={() => void redefinir()}
          aoCancelar={() => setConfirmando('')}
        />
      ) : null}
      {resetAccess ? (
        <AccessCredentials
          eyebrow={`Nova senha de ${instructor.name}`}
          note={
            resetAccess.active
              ? 'Aparece só agora. No próximo acesso, o instrutor cria uma senha nova.'
              : 'Aparece só agora. O acesso ainda está inativo: aprove o instrutor para ele entrar.'
          }
          email={resetAccess.email}
          password={resetAccess.temporaryPassword}
          onDismiss={() => setResetAccess(null)}
        />
      ) : null}
      {semRegistro ? (
        <p className="border-l-4 border-doc-error py-1 pl-4 text-sm">
          <strong>Registro MTE/RE em branco ou zerado.</strong> Os documentos
          deste instrutor saem só com a assinatura da responsável técnica.
        </p>
      ) : null}

      <DadosDoInstrutor
        instructor={instructor}
        reload={reload}
        notify={notify}
      />

      <section className="space-y-3">
        <h2 className={tituloBloco}>Documentos obrigatórios</h2>
        {documentos === null ? (
          <Carregando linhas={3} />
        ) : (
          <ul className="border-t border-doc-ink">
            {REQUIRED_INSTRUCTOR_DOCUMENTS.map((required) => {
              const enviado = meus.find(
                (doc) => doc.category === required.category,
              );
              const situacao = enviado
                ? INSTRUCTOR_DOCUMENT_STATUS[enviado.status]
                : null;
              return (
                <li
                  key={required.category}
                  className="flex flex-col gap-3 border-b border-doc-rule-strong py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-semibold">
                    {required.label}{' '}
                    <span
                      className={cn(
                        mono,
                        'ml-1 text-xs',
                        situacao?.tone === 'bad'
                          ? 'text-doc-error'
                          : situacao?.tone === 'ok'
                            ? 'text-doc-ink'
                            : 'text-doc-mark',
                      )}
                    >
                      {situacao?.label ?? 'Não enviado'}
                    </span>
                  </p>
                  {enviado ? (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/instructor-documents/${enviado.id}`}
                        target="_blank"
                        rel="noopener"
                        className={botao({ variante: 'contorno' })}
                      >
                        Ver
                      </a>
                      {enviado.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => void decidir(enviado.id, 'approved')}
                          className={botao()}
                        >
                          Aprovar
                        </button>
                      ) : null}
                      {enviado.status !== 'rejected' ? (
                        <button
                          type="button"
                          onClick={() => void decidir(enviado.id, 'rejected')}
                          className={botaoPerigo}
                        >
                          Recusar
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-doc-ink-muted">
                      Aguardando o instrutor
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={tituloBloco}>
          Disponibilidade informada{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {disponibilidade.length}
          </span>
        </h2>
        {disponibilidade.length === 0 ? (
          <p className="text-sm text-doc-ink-muted">Nenhuma data informada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {disponibilidade.map((item) => (
              <li
                key={item.id}
                title={item.note || undefined}
                className={cn(
                  mono,
                  'border border-doc-rule-strong px-2 py-1 text-xs',
                )}
              >
                {formatDate(item.available_date)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className={tituloBloco}>
          Turmas{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {turmas.length}
          </span>
        </h2>
        <TabelaDeTurmas
          turmas={[...turmas].sort((a, b) =>
            b.training_date.localeCompare(a.training_date),
          )}
          abrir={abrirTurma}
          vazio={<Vazio titulo="Nenhuma turma atribuída" />}
        />
      </section>

      <section className="border-t border-doc-rule-strong pt-6">
        {confirmando === 'excluir' ? (
          <Confirmar
            perigo
            titulo={`Excluir ${instructor.name}?`}
            texto="O acesso dele é removido e os dias em que estava escalado ficam sem instrutor. Não dá para desfazer."
            confirmar="Excluir instrutor"
            aoConfirmar={() => void remover()}
            aoCancelar={() => setConfirmando('')}
          />
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando('excluir')}
            className={botaoPerigo}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir instrutor
          </button>
        )}
      </section>
    </div>
  );
}

function DadosDoInstrutor({
  instructor,
  reload,
  notify,
}: {
  instructor: CompanyInstructor;
  reload: Reload;
  notify: Notify;
}) {
  const inicial = (): DadosInstrutor => ({
    name: instructor.name,
    document: instructor.document,
    email: instructor.email,
    phone: instructor.phone ?? '',
    professionalRegistry: instructor.professional_registry ?? '',
    specialties: instructor.specialties ?? '',
    baseCity: instructor.base_city ?? '',
  });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosInstrutor>(inicial);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trocouEmail =
      draft.email.trim().toLowerCase() !== instructor.email.toLowerCase();
    if (
      trocouEmail &&
      !window.confirm(
        `O e-mail é o login do instrutor. Depois de salvar, ${instructor.name} passa a entrar com ${draft.email.trim()}. Continuar?`,
      )
    )
      return;
    setSalvando(true);
    try {
      await updateInstructor(instructor.id, draft);
      notify(
        trocouEmail
          ? 'Dados salvos. Avise o instrutor do novo e-mail de acesso.'
          : 'Dados do instrutor salvos.',
      );
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar os dados do instrutor.',
      );
    } finally {
      setSalvando(false);
    }
  }

  const campoDoInstrutor = (
    chave: keyof DadosInstrutor,
    texto: string,
    extra: { type?: string; required?: boolean; largo?: boolean } = {},
  ) => (
    <label key={chave} className={extra.largo ? 'sm:col-span-2' : ''}>
      <span className={rotulo}>{texto}</span>
      <input
        type={extra.type ?? 'text'}
        required={extra.required ?? false}
        value={draft[chave]}
        onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })}
        className={campo}
      />
    </label>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={tituloBloco}>Dados</h2>
        {editando ? null : (
          <button
            type="button"
            onClick={() => {
              setDraft(inicial());
              setEditando(true);
            }}
            className={botao({ variante: 'contorno' })}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </button>
        )}
      </div>
      {editando ? (
        <form onSubmit={salvar} className="grid max-w-3xl gap-5 sm:grid-cols-2">
          {campoDoInstrutor('name', 'Nome completo', { required: true })}
          {campoDoInstrutor('document', 'CPF', { required: true })}
          {campoDoInstrutor('email', 'E-mail (login)', {
            type: 'email',
            required: true,
          })}
          {campoDoInstrutor('phone', 'Telefone / WhatsApp')}
          {campoDoInstrutor('professionalRegistry', 'Registro MTE / RE')}
          {campoDoInstrutor('baseCity', 'Cidade base')}
          {campoDoInstrutor('specialties', 'Especialidades / NRs', {
            largo: true,
          })}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className={botao({ variante: 'contorno' })}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <Dados
          itens={[
            ['E-mail (login)', instructor.email],
            ['Telefone', instructor.phone || '—'],
            [
              'Registro MTE/RE',
              instructor.professional_registry || 'Não informado',
            ],
            ['Cidade base', instructor.base_city || '—'],
            ['Especialidades', instructor.specialties || '—'],
          ]}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quem está disponível em cada data
// ---------------------------------------------------------------------------

function DisponibilidadePorData({
  data,
  abrir,
}: {
  data: DadosDaGestao;
  abrir: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const byDate = useMemo(() => {
    const map = new Map<string, typeof data.instructorAvailability>();
    for (const item of data.instructorAvailability) {
      const current = map.get(item.available_date) ?? [];
      current.push(item);
      map.set(item.available_date, current);
    }
    return map;
  }, [data.instructorAvailability]);
  // Todos os dias de cada turma, não só o primeiro.
  const diasPorData = useMemo(() => {
    const map = new Map<
      string,
      { training: CompanyTraining; session: TrainingSession; total: number }[]
    >();
    for (const training of data.trainings) {
      const dias = training.sessions ?? [];
      for (const session of dias) {
        const current = map.get(session.session_date) ?? [];
        current.push({ training, session, total: dias.length });
        map.set(session.session_date, current);
      }
    }
    return map;
  }, [data.trainings]);
  const instructorById = useMemo(
    () =>
      new Map(
        data.instructors.map((instructor) => [instructor.id, instructor]),
      ),
    [data.instructors],
  );
  const hoje = isoFromDate(new Date());
  const selectedIso = selected ? isoFromDate(selected) : '';
  const disponiveis = selectedIso ? (byDate.get(selectedIso) ?? []) : [];
  const marcadas = selectedIso ? (diasPorData.get(selectedIso) ?? []) : [];
  const proximas = [...byDate.entries()]
    .filter(([iso]) => iso >= hoje)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 6);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ptBR}
          modifiers={{
            available: [...byDate.keys()].map(dateFromIso),
            training: [...diasPorData.keys()].map(dateFromIso),
          }}
          modifiersClassNames={{
            available: 'ring-2 ring-sl-gold ring-inset font-bold',
            training: 'bg-doc-ink text-doc-paper font-bold',
          }}
          className="w-full border border-doc-rule-strong bg-doc-sheet [--cell-size:--spacing(11)]"
        />
        <p className="mt-3 flex flex-wrap gap-4 font-doc-mono text-xs text-doc-ink-muted">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="size-3 border-2 border-sl-gold" />
            Instrutor disponível
          </span>
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="size-3 bg-doc-ink" />
            Turma marcada
          </span>
        </p>
      </div>
      <section className="min-w-0 space-y-4">
        {!selected ? (
          <>
            <h2 className="font-semibold">
              Próximas datas com disponibilidade
            </h2>
            {proximas.length === 0 ? (
              <Vazio titulo="Nenhum instrutor informou disponibilidade" />
            ) : (
              <ul className="border-t border-doc-ink">
                {proximas.map(([iso, itens]) => (
                  <li key={iso} className="border-b border-doc-rule-strong">
                    <button
                      type="button"
                      onClick={() => setSelected(dateFromIso(iso))}
                      className="doc-focus flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-doc-sheet"
                    >
                      <span className={mono}>{formatDate(iso)}</span>
                      <span className="text-sm text-doc-ink-muted">
                        {itens.length} instrutor{itens.length > 1 ? 'es' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{formatDate(selectedIso)}</h2>
              <button
                type="button"
                onClick={() => setSelected(undefined)}
                className={botaoTexto}
              >
                Ver próximas datas
              </button>
            </div>
            {marcadas.length ? (
              <div>
                <p className="font-doc-mono text-xs text-doc-ink-muted">
                  Já marcado neste dia
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {marcadas.map(({ training, session, total }) => (
                    <li key={session.id}>
                      <strong>{training.nr}</strong> · {nomeDaTurma(training)}
                      {total > 1
                        ? ` (dia ${session.day_number} de ${total})`
                        : ''}{' '}
                      — {training.client_name}{' '}
                      <span className="text-doc-ink-muted">
                        ({session.instructor_name ?? 'sem instrutor'})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {disponiveis.length === 0 ? (
              <Vazio titulo="Ninguém disponível nesta data" />
            ) : (
              <ul className="border-t border-doc-ink">
                {disponiveis.map((item) => {
                  const instructor = instructorById.get(item.instructor_id);
                  return (
                    <li
                      key={item.id}
                      className="border-b border-doc-rule-strong"
                    >
                      <button
                        type="button"
                        onClick={() => abrir(item.instructor_id)}
                        className="doc-focus block w-full py-3 text-left hover:bg-doc-sheet"
                      >
                        <span className="block font-semibold">
                          {item.instructor_name}
                        </span>
                        {instructor?.specialties ? (
                          <span className="block text-sm text-doc-mark">
                            {instructor.specialties}
                          </span>
                        ) : null}
                        <span className="block text-sm text-doc-ink-muted">
                          {[item.note, instructor?.phone]
                            .filter(Boolean)
                            .join(' · ') || 'Disponível para novas turmas'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------

const emptyDraft: DadosInstrutor = {
  name: '',
  document: '',
  email: '',
  phone: '',
  professionalRegistry: '',
  specialties: '',
  baseCity: '',
};

export function CadastrarInstrutor({
  reload,
  notify,
  voltar,
}: {
  reload: Reload;
  notify: Notify;
  voltar: () => void;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      setCriado(await createInstructor(draft));
      setDraft(emptyDraft);
      notify('Instrutor cadastrado e acesso temporário gerado.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao cadastrar instrutor.',
      );
    } finally {
      setSalvando(false);
    }
  }

  const campoNovo = (
    chave: keyof DadosInstrutor,
    texto: string,
    extra: { type?: string; largo?: boolean } = {},
  ) => (
    <label key={chave} className={extra.largo ? 'sm:col-span-2' : ''}>
      <span className={rotulo}>{texto}</span>
      <input
        type={extra.type ?? 'text'}
        required
        value={draft[chave]}
        onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })}
        className={campo}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <Cabecalho
        voltar={{ rotulo: 'Instrutores', aoVoltar: voltar }}
        titulo="Cadastrar instrutor"
      />
      {criado ? (
        <AccessCredentials
          eyebrow="Envie ao instrutor"
          note="A senha temporária aparece só agora. O instrutor troca no primeiro acesso."
          email={criado.email}
          password={criado.temporaryPassword}
          onDismiss={() => setCriado(null)}
        />
      ) : null}
      <form onSubmit={save} className="grid max-w-3xl gap-5 sm:grid-cols-2">
        {campoNovo('name', 'Nome completo')}
        {campoNovo('document', 'CPF')}
        {campoNovo('email', 'E-mail', { type: 'email' })}
        {campoNovo('phone', 'Telefone / WhatsApp', { type: 'tel' })}
        {campoNovo('professionalRegistry', 'Registro MTE / RE')}
        {campoNovo('baseCity', 'Cidade base')}
        {campoNovo('specialties', 'Especialidades / NRs', { largo: true })}
        <p className="text-sm text-doc-ink-muted sm:col-span-2">
          Sem registro MTE/RE (ou zerado), os documentos saem só com a
          assinatura da responsável técnica.
        </p>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={salvando}
            className={botao({
              tamanho: 'lg',
              className: 'disabled:opacity-60',
            })}
          >
            {salvando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Salvar e gerar acesso
          </button>
        </div>
      </form>
    </div>
  );
}
