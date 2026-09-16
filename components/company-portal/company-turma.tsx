'use client';

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';

import {
  PresencaBadge,
  formatDate,
  formatFileSize,
  isoFromDate,
  nomeDaTurma,
  type DadosDaGestao,
  type Notify,
  type Reload,
} from '@/components/company-portal/company-ui';
import {
  ClientPicker,
  NORMAS,
} from '@/components/company-portal/company-turmas';
import {
  Abas,
  Cabecalho,
  Confirmar,
  Dados,
  SeloDeEstado,
  Vazio,
  areaDeTexto,
  botao,
  botaoIcone,
  botaoPerigo,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import type {
  CompanyFile,
  CompanyInstructor,
  CompanyParticipant,
  CompanyTraining,
  TrainingSession,
} from '@/lib/company-types';
import { downloadFilesAsZip } from '@/lib/download-zip';
import {
  limparDigitacaoCpf,
  limparDigitacaoRg,
  problemaCpf,
  problemaRg,
} from '@/lib/documentos';
import {
  addParticipantByCompany,
  addTrainingDay,
  completeTrainingByCompany,
  deleteCompanyFile,
  deleteTraining,
  generateCertificates,
  removeParticipantByCompany,
  removeTrainingDay,
  renameTraining,
  setParticipantAttendance,
  updateParticipantByCompany,
  updateTrainingDay,
  updateTrainingDetails,
  uploadCompanyFiles,
  type DadosParticipante,
  type NovoDia,
} from '@/lib/mock-company-database';
import {
  scheduleWindow,
  trainingReminderMessage,
  trainingScheduleMessage,
  whatsappLink,
} from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type AbaDaTurma =
  | 'dados'
  | 'participantes'
  | 'presenca'
  | 'arquivos'
  | 'certificados';

/**
 * Tela da turma na gestão: tudo o que pertence à turma, em abas. As ações que
 * a gestão faz no lugar do instrutor ficam num bloco nomeado.
 */
export function TelaDaTurmaGestao({
  data,
  training,
  voltar,
  reload,
  notify,
  aoExcluir,
}: {
  data: DadosDaGestao;
  training: CompanyTraining;
  voltar: () => void;
  reload: Reload;
  notify: Notify;
  aoExcluir: () => void;
}) {
  const [aba, setAba] = useState<AbaDaTurma>('dados');
  const [encerrando, setEncerrando] = useState(false);
  const instrutores = data.instructors.filter(
    (item) => item.status === 'active',
  );
  const participantes = useMemo(
    () =>
      data.participants
        .filter((item) => item.training_id === training.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')),
    [data.participants, training.id],
  );
  const arquivos = data.files.filter(
    (file) => file.training_id === training.id,
  );
  const temLista = arquivos.some((file) => file.kind === 'attendance');
  const concluida = training.status === 'completed';
  const hoje = isoFromDate(new Date());
  const temDiaHoje = (training.sessions ?? []).some(
    (dia) => dia.session_date === hoje,
  );

  // Inscrição pelo QR só acontece com dia aberto: fora disso não há o que
  // atualizar. Antes o painel inteiro era recarregado a cada 5 s em qualquer turma.
  const acompanharAoVivo =
    !concluida &&
    (training.status === 'in_progress' || temDiaHoje) &&
    (aba === 'participantes' || aba === 'presenca');
  useEffect(() => {
    if (!acompanharAoVivo) return;
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [acompanharAoVivo, reload]);

  return (
    <div className="space-y-8">
      <Cabecalho
        voltar={{ rotulo: 'Turmas', aoVoltar: voltar }}
        titulo={
          <>
            <span className="font-doc-mono text-doc-mark">{training.nr}</span>{' '}
            {nomeDaTurma(training)}
          </>
        }
        meta={
          <>
            <span>{training.client_name}</span>
            <span className={mono}>{training.code}</span>
            <SeloDeEstado status={training.status} />
          </>
        }
        acoes={
          concluida ? null : (
            <button
              type="button"
              onClick={() => setEncerrando((valor) => !valor)}
              aria-expanded={encerrando}
              className={botao({ variante: 'contorno' })}
            >
              <Check className="size-4" aria-hidden="true" />
              Encerrar turma
            </button>
          )
        }
      />

      {encerrando && !concluida ? (
        <Encerramento
          training={training}
          participantes={participantes}
          arquivos={arquivos}
          temLista={temLista}
          reload={reload}
          notify={notify}
          fechar={() => setEncerrando(false)}
        />
      ) : null}

      <section
        aria-labelledby="acoes-instrutor"
        className="border-l-4 border-doc-rule-strong py-1 pl-4"
      >
        <h2 id="acoes-instrutor" className="font-semibold">
          Ações do instrutor
        </h2>
        <p className="text-sm text-doc-ink-muted">
          Você está agindo no lugar do instrutor. Fica registrado em seu nome.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={`/lista-presenca/${training.id}`}
            target="_blank"
            rel="noopener"
            className={botaoTexto}
          >
            <FileText className="size-4" aria-hidden="true" />
            Lista de presença (PDF)
          </a>
          <button
            type="button"
            onClick={() => setAba('participantes')}
            className={botaoTexto}
          >
            Editar participantes
          </button>
          <button
            type="button"
            onClick={() => setAba('presenca')}
            className={botaoTexto}
          >
            Marcar presença
          </button>
          <button
            type="button"
            onClick={() => setAba('arquivos')}
            className={botaoTexto}
          >
            Enviar fotos
          </button>
        </div>
      </section>

      <Abas
        rotuloDaLista="Partes da turma"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'dados', rotulo: 'Dados' },
          {
            id: 'participantes',
            rotulo: 'Participantes',
            contagem: participantes.length,
          },
          { id: 'presenca', rotulo: 'Presença' },
          { id: 'arquivos', rotulo: 'Arquivos', contagem: arquivos.length },
          { id: 'certificados', rotulo: 'Certificados' },
        ]}
      >
        {aba === 'dados' ? (
          <AbaDados
            data={data}
            training={training}
            instrutores={instrutores}
            temLista={temLista}
            reload={reload}
            notify={notify}
            aoExcluir={aoExcluir}
          />
        ) : null}
        {aba === 'participantes' ? (
          <AbaParticipantes
            training={training}
            participantes={participantes}
            reload={reload}
            notify={notify}
          />
        ) : null}
        {aba === 'presenca' ? (
          <AbaPresenca
            data={data}
            training={training}
            participantes={participantes}
            reload={reload}
            notify={notify}
          />
        ) : null}
        {aba === 'arquivos' ? (
          <AbaArquivos
            training={training}
            arquivos={arquivos}
            reload={reload}
            notify={notify}
          />
        ) : null}
        {aba === 'certificados' ? (
          <AbaCertificados
            training={training}
            participantes={participantes}
            arquivos={arquivos}
            reload={reload}
            notify={notify}
          />
        ) : null}
      </Abas>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encerramento: conferência e uma confirmação só
// ---------------------------------------------------------------------------

function Encerramento({
  training,
  participantes,
  arquivos,
  temLista,
  reload,
  notify,
  fechar,
}: {
  training: CompanyTraining;
  participantes: CompanyParticipant[];
  arquivos: CompanyFile[];
  temLista: boolean;
  reload: Reload;
  notify: Notify;
  fechar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const dias = training.sessions ?? [];
  const pendentes = dias.filter((dia) => dia.status !== 'completed').length;
  const completos = participantes.filter(
    (item) => item.days_total > 0 && item.days_present >= item.days_total,
  ).length;
  const fotos = arquivos.filter((file) => file.kind === 'photo').length;

  async function encerrar() {
    setOcupado(true);
    try {
      // Com a conferência na tela, quem confirma sem lista já viu o aviso:
      // vai direto com `semLista`, e a ressalva fica na auditoria como antes.
      let resultado = await completeTrainingByCompany(training.id, !temLista);
      if (resultado.needsConfirmation)
        resultado = await completeTrainingByCompany(training.id, true);
      if (resultado.needsConfirmation) return;
      notify(
        resultado.certificatePublished
          ? `Turma encerrada. ${resultado.certificates} certificado(s) emitidos e arquivados nos documentos.`
          : `Turma encerrada, mas os documentos não foram gerados: ${resultado.certificateProblem ?? 'motivo desconhecido'}.`,
      );
      fechar();
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao encerrar a turma.',
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Confirmar
      titulo="Encerrar a turma"
      perigo={!temLista}
      confirmar={`Encerrar e emitir ${completos} certificado(s)`}
      ocupado={ocupado}
      aoConfirmar={() => void encerrar()}
      aoCancelar={fechar}
      texto="Os dias em aberto são encerrados e os certificados saem para quem tem presença em todos os dias. Não dá para reabrir."
    >
      <Dados
        className="mt-4"
        itens={[
          ['Dias em aberto', `${pendentes} de ${dias.length}`],
          ['Participantes', String(participantes.length)],
          ['Com presença completa', String(completos)],
          ['Fotos da aula', String(fotos)],
          [
            'Lista assinada',
            temLista ? (
              'Enviada'
            ) : (
              <span key="lista" className="text-doc-error">
                Não enviada
              </span>
            ),
          ],
        ]}
      />
      {!temLista ? (
        <p className="mt-3 text-sm font-semibold text-doc-error">
          Sem a foto da lista assinada. Encerrar assim fica registrado em seu
          nome.
        </p>
      ) : null}
    </Confirmar>
  );
}

// ---------------------------------------------------------------------------
// Dados, dias e escala
// ---------------------------------------------------------------------------

type DadosTreinamento = {
  clientId: string;
  nr: string;
  title: string;
  duration: string;
  location: string;
  contentProgram: string;
};

function AbaDados({
  data,
  training,
  instrutores,
  temLista,
  reload,
  notify,
  aoExcluir,
}: {
  data: DadosDaGestao;
  training: CompanyTraining;
  instrutores: CompanyInstructor[];
  temLista: boolean;
  reload: Reload;
  notify: Notify;
  aoExcluir: () => void;
}) {
  const inicial = (): DadosTreinamento => ({
    clientId: training.client_id,
    nr: training.nr,
    title: training.title,
    duration: training.duration,
    location: training.location,
    contentProgram: training.content_program ?? '',
  });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosTreinamento>(inicial);
  const [identificacao, setIdentificacao] = useState(training.internal_label);
  const [excluindo, setExcluindo] = useState(false);
  const normas = NORMAS.includes(draft.nr) ? NORMAS : [draft.nr, ...NORMAS];
  const concluida = training.status === 'completed';

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await updateTrainingDetails(training.id, draft);
      notify(
        concluida
          ? 'Dados salvos. A turma já foi encerrada: gere os documentos de novo (aba Certificados) para refletir a mudança.'
          : 'Dados do treinamento salvos.',
      );
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar o treinamento.',
      );
    } finally {
      setSalvando(false);
    }
  }

  async function renomear() {
    if (identificacao.trim() === training.internal_label) return;
    try {
      await renameTraining(training.id, identificacao);
      notify(
        identificacao.trim()
          ? 'Identificação da turma salva.'
          : 'Identificação removida.',
      );
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao renomear a turma.',
      );
    }
  }

  async function remover() {
    try {
      await deleteTraining(training.id);
      notify('Treinamento excluído.');
      await reload();
      aoExcluir();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao excluir o treinamento.',
      );
    }
  }

  // Quem ainda deve alguma coisa: instrutor de dia não encerrado. Link montado
  // aqui mesmo, sem servidor.
  const devedores = [
    ...new Map(
      (training.sessions ?? [])
        .filter((dia) => dia.status !== 'completed' && dia.instructor_id)
        .map((dia) => [dia.instructor_id as string, dia]),
    ).values(),
  ].map((dia) => {
    const instrutor = data.instructors.find(
      (item) => item.id === dia.instructor_id,
    );
    const url = instrutor?.phone
      ? whatsappLink(
          instrutor.phone,
          trainingReminderMessage({
            instructorName: instrutor.name,
            nr: training.nr,
            title: training.title,
            clientName: training.client_name,
            dateLabel: formatDate(dia.session_date),
            faltaLista: !temLista,
          }),
        )
      : null;
    return { nome: instrutor?.name ?? 'Instrutor', url };
  });
  const cobraveis = devedores.filter((item) => item.url);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={tituloBloco}>Treinamento</h2>
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
          <form onSubmit={salvar} className="grid max-w-3xl gap-5">
            <ClientPicker
              clients={data.clients}
              value={draft.clientId}
              onChange={(id) => setDraft({ ...draft, clientId: id })}
            />
            <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
              <label>
                <span className={rotulo}>Norma</span>
                <select
                  value={draft.nr}
                  onChange={(e) => setDraft({ ...draft, nr: e.target.value })}
                  className={campo}
                >
                  {normas.map((nr) => (
                    <option key={nr}>{nr}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={rotulo}>Título no certificado</span>
                <input
                  required
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className={campo}
                />
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className={rotulo}>Carga horária</span>
                <input
                  required
                  value={draft.duration}
                  onChange={(e) =>
                    setDraft({ ...draft, duration: e.target.value })
                  }
                  className={campo}
                />
              </label>
              <label>
                <span className={rotulo}>Endereço do treinamento</span>
                <input
                  required
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                  className={campo}
                />
              </label>
            </div>
            <label>
              <span className={rotulo}>
                Conteúdo programático (sai na lista)
              </span>
              <textarea
                rows={4}
                value={draft.contentProgram}
                onChange={(e) =>
                  setDraft({ ...draft, contentProgram: e.target.value })
                }
                className={areaDeTexto}
              />
            </label>
            <div className="flex flex-wrap gap-2">
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
              ['Cliente', training.client_name],
              ['Norma', training.nr],
              ['Título no certificado', training.title],
              ['Carga horária', training.duration],
              ['Endereço', training.location],
              ['Inscritos', String(training.participant_count)],
            ]}
          />
        )}
        <label className="block max-w-xl">
          <span className={rotulo}>Identificação interna</span>
          <input
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            onBlur={() => void renomear()}
            placeholder="Ex.: Turma A - manhã"
            aria-describedby="identificacao-ajuda"
            className={campo}
          />
          <span
            id="identificacao-ajuda"
            className="mt-1.5 block text-sm text-doc-ink-muted"
          >
            Não sai em documento. Salva ao sair do campo.
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className={tituloBloco}>Dias e escala</h2>
        <ol className="border-t border-doc-ink">
          {(training.sessions ?? []).map((dia) => (
            <LinhaDoDia
              key={dia.id}
              training={training}
              session={dia}
              instructors={instrutores}
              reload={reload}
              notify={notify}
            />
          ))}
        </ol>
        <NovoDiaDaTurma
          training={training}
          instructors={instrutores}
          reload={reload}
          notify={notify}
        />
        {!concluida && devedores.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {cobraveis.map((item) => (
              <a
                key={item.nome}
                href={item.url as string}
                target="_blank"
                rel="noreferrer"
                className={botao({ variante: 'contorno' })}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {cobraveis.length > 1
                  ? `Cobrar ${item.nome.split(' ')[0]} no WhatsApp`
                  : 'Cobrar no WhatsApp'}
              </a>
            ))}
            {cobraveis.length === 0 ? (
              <p className="text-sm text-doc-ink-muted">
                Sem telefone no cadastro do instrutor não dá para cobrar pelo
                WhatsApp.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="border-t border-doc-rule-strong pt-6">
        {excluindo ? (
          <Confirmar
            perigo
            titulo={`Excluir "${training.nr} - ${training.title}"?`}
            texto="Saem junto todos os participantes e arquivos da turma. Não dá para desfazer."
            confirmar="Excluir turma"
            aoConfirmar={() => void remover()}
            aoCancelar={() => setExcluindo(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExcluindo(true)}
            className={botaoPerigo}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir turma
          </button>
        )}
      </section>
    </div>
  );
}

function LinhaDoDia({
  training,
  session,
  instructors,
  reload,
  notify,
}: {
  training: CompanyTraining;
  session: TrainingSession;
  instructors: CompanyInstructor[];
  reload: Reload;
  notify: Notify;
}) {
  const [salvando, setSalvando] = useState(false);
  const total = training.sessions.length;
  const encerrado = session.status === 'completed';

  async function salvar(campos: {
    instructorId?: string | null;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
  }) {
    setSalvando(true);
    try {
      await updateTrainingDay(training.id, {
        sessionId: session.id,
        ...campos,
      });
      notify(`Dia ${session.day_number} atualizado.`);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao atualizar o dia.',
      );
    } finally {
      setSalvando(false);
    }
  }

  // A gestão pode tudo: dia encerrado também se edita ou remove.
  async function removerDia() {
    if (
      !window.confirm(
        `Remover o dia ${session.day_number} (${formatDate(session.session_date)}) desta turma? As presenças marcadas neste dia também saem.`,
      )
    )
      return;
    setSalvando(true);
    try {
      await removeTrainingDay(training.id, session.id);
      notify(`Dia ${session.day_number} removido.`);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao remover o dia.');
    } finally {
      setSalvando(false);
    }
  }

  const instrutor = instructors.find(
    (item) => item.id === session.instructor_id,
  );
  const aviso = instrutor?.phone
    ? whatsappLink(
        instrutor.phone,
        trainingScheduleMessage({
          instructorName: instrutor.name,
          nr: training.nr,
          title: training.title,
          clientName: training.client_name,
          dateLabel: formatDate(session.session_date),
          timeLabel: scheduleWindow(session.start_time, session.end_time),
          duration: training.duration,
          location: training.location,
        }),
      )
    : null;
  const n = session.day_number;

  return (
    <li className="grid gap-3 border-b border-doc-rule-strong py-4 md:grid-cols-[5rem_minmax(0,1fr)] md:items-center">
      <div className="flex items-baseline gap-3 md:block">
        <span className={cn(mono, 'font-semibold text-doc-mark')}>
          Dia {n}
          <span className="text-doc-ink-muted">/{total}</span>
        </span>
        {encerrado ? (
          <span className="block text-xs md:mt-1">
            <SeloDeEstado status="completed" texto="Encerrado" />
          </span>
        ) : session.status === 'in_progress' ? (
          <span className="block text-xs md:mt-1">
            <SeloDeEstado status="in_progress" texto="Em aula" />
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[10rem_7rem_7rem_minmax(12rem,1fr)_auto]">
        <input
          type="date"
          aria-label={`Data do dia ${n}`}
          disabled={salvando}
          value={session.session_date}
          onChange={(e) => void salvar({ sessionDate: e.target.value })}
          className={cn(campo, mono)}
        />
        <div className="grid grid-cols-2 gap-2 xl:contents">
          <input
            type="time"
            aria-label={`Início do dia ${n}`}
            disabled={salvando}
            value={session.start_time}
            onChange={(e) => void salvar({ startTime: e.target.value })}
            className={cn(campo, mono)}
          />
          <input
            type="time"
            aria-label={`Fim do dia ${n}`}
            disabled={salvando}
            value={session.end_time}
            onChange={(e) => void salvar({ endTime: e.target.value })}
            className={cn(campo, mono)}
          />
        </div>
        <select
          aria-label={`Instrutor do dia ${n}`}
          aria-invalid={session.instructor_id ? undefined : true}
          disabled={salvando}
          value={session.instructor_id ?? ''}
          onChange={(e) =>
            void salvar({ instructorId: e.target.value || null })
          }
          className={cn(campo, !session.instructor_id && 'text-doc-error')}
        >
          <option value="">Sem instrutor — escalar depois</option>
          {instructors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          {salvando ? (
            <Loader2
              className="size-4 animate-spin text-doc-mark"
              aria-label="Salvando"
            />
          ) : null}
          {!encerrado && aviso ? (
            <a
              href={aviso}
              target="_blank"
              rel="noreferrer"
              className={botao({ variante: 'contorno' })}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Avisar
            </a>
          ) : null}
          {total > 1 ? (
            <button
              type="button"
              onClick={() => void removerDia()}
              disabled={salvando}
              aria-label={`Remover o dia ${n}`}
              className={botaoIcone}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** A gestão acrescenta um dia à turma; a numeração segue a ordem das datas. */
function NovoDiaDaTurma({
  training,
  instructors,
  reload,
  notify,
}: {
  training: CompanyTraining;
  instructors: CompanyInstructor[];
  reload: Reload;
  notify: Notify;
}) {
  const ultimo = training.sessions[training.sessions.length - 1];
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dia, setDia] = useState<NovoDia>({
    date: '',
    startTime: ultimo?.start_time || '08:00',
    endTime: ultimo?.end_time || '18:00',
    instructorId: ultimo?.instructor_id ?? null,
  });

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await addTrainingDay(training.id, dia);
      notify(`Dia ${formatDate(dia.date)} acrescentado à turma.`);
      setAberto(false);
      setDia({ ...dia, date: '' });
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao acrescentar o dia.',
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto)
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={botaoTexto}
      >
        <Plus className="size-4" aria-hidden="true" />
        Adicionar dia
      </button>
    );
  return (
    <form
      onSubmit={salvar}
      className="grid gap-2 border border-doc-rule-strong bg-doc-sheet p-4 sm:grid-cols-2 xl:grid-cols-[10rem_7rem_7rem_minmax(12rem,1fr)_auto_auto]"
    >
      <input
        required
        type="date"
        aria-label="Data do novo dia"
        value={dia.date}
        onChange={(e) => setDia({ ...dia, date: e.target.value })}
        className={cn(campo, mono)}
      />
      <input
        type="time"
        aria-label="Início do novo dia"
        value={dia.startTime}
        onChange={(e) => setDia({ ...dia, startTime: e.target.value })}
        className={cn(campo, mono)}
      />
      <input
        type="time"
        aria-label="Fim do novo dia"
        value={dia.endTime}
        onChange={(e) => setDia({ ...dia, endTime: e.target.value })}
        className={cn(campo, mono)}
      />
      <select
        aria-label="Instrutor do novo dia"
        value={dia.instructorId ?? ''}
        onChange={(e) =>
          setDia({ ...dia, instructorId: e.target.value || null })
        }
        className={campo}
      >
        <option value="">Sem instrutor — escalar depois</option>
        {instructors.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={salvando}
        className={botao({ tamanho: 'lg', className: 'disabled:opacity-60' })}
      >
        {salvando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        Adicionar
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className={botao({ variante: 'contorno', tamanho: 'lg' })}
      >
        Cancelar
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Participantes (QR, incluir, editar, remover)
// ---------------------------------------------------------------------------

const vazio: DadosParticipante = {
  fullName: '',
  documentId: '',
  rg: '',
  birthDate: '',
  email: '',
  phone: '',
  jobTitle: '',
};

/** O formulário trabalha só com números; a pontuação é recolocada ao salvar. */
function dadosDe(participant: CompanyParticipant): DadosParticipante {
  return {
    fullName: participant.full_name,
    documentId: (participant.document_id ?? '').replace(/\D/g, ''),
    rg: (participant.rg ?? '').toUpperCase().replace(/[^0-9X]/g, ''),
    birthDate: participant.birth_date ?? '',
    email: participant.email ?? '',
    phone: participant.phone ?? '',
    jobTitle: participant.job_title ?? '',
  };
}

function CamposDoParticipante({
  draft,
  setDraft,
}: {
  draft: DadosParticipante;
  setDraft: (value: DadosParticipante) => void;
}) {
  return (
    <>
      <label className="sm:col-span-2 xl:col-span-3">
        <span className={rotulo}>Nome completo</span>
        <input
          required
          value={draft.fullName}
          onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>CPF (só números)</span>
        <input
          required
          inputMode="numeric"
          value={draft.documentId}
          onChange={(e) =>
            setDraft({
              ...draft,
              documentId: limparDigitacaoCpf(e.target.value),
            })
          }
          className={cn(campo, mono)}
        />
      </label>
      <label>
        <span className={rotulo}>RG (sem ele, repita o CPF)</span>
        <input
          required
          value={draft.rg}
          onChange={(e) =>
            setDraft({ ...draft, rg: limparDigitacaoRg(e.target.value) })
          }
          className={cn(campo, mono)}
        />
      </label>
      <label>
        <span className={rotulo}>Data de nascimento</span>
        <input
          type="date"
          value={draft.birthDate}
          onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
          className={cn(campo, mono)}
        />
      </label>
      <label>
        <span className={rotulo}>Cargo ou função</span>
        <input
          value={draft.jobTitle}
          onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>E-mail</span>
        <input
          type="email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>Telefone</span>
        <input
          type="tel"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          className={campo}
        />
      </label>
    </>
  );
}

function AbaParticipantes({
  training,
  participantes,
  reload,
  notify,
}: {
  training: CompanyTraining;
  participantes: CompanyParticipant[];
  reload: Reload;
  notify: Notify;
}) {
  const [incluindo, setIncluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosParticipante>(vazio);

  async function incluir(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = problemaCpf(draft.documentId) ?? problemaRg(draft.rg);
    if (problema) {
      notify(problema);
      return;
    }
    setSalvando(true);
    try {
      await addParticipantByCompany(training.id, draft);
      notify(
        `${draft.fullName.trim()} incluído na lista. Marque os dias na aba Presença.`,
      );
      setDraft(vazio);
      setIncluindo(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao incluir o participante.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-8">
      <PainelQr training={training} />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={tituloBloco}>
            Inscritos{' '}
            <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
              {participantes.length}
            </span>
          </h2>
          {incluindo ? null : (
            <button
              type="button"
              onClick={() => setIncluindo(true)}
              className={botao()}
            >
              <Plus className="size-4" aria-hidden="true" />
              Incluir participante
            </button>
          )}
        </div>
        {incluindo ? (
          <form
            onSubmit={incluir}
            className="grid gap-4 border border-doc-rule-strong bg-doc-sheet p-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <CamposDoParticipante draft={draft} setDraft={setDraft} />
            <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
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
                Incluir na lista
              </button>
              <button
                type="button"
                onClick={() => setIncluindo(false)}
                className={botao({ variante: 'contorno' })}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
        {participantes.length === 0 ? (
          <Vazio
            titulo="Nenhum participante inscrito"
            texto="Compartilhe o QR Code ou inclua aqui."
          />
        ) : (
          <ul className="border-t border-doc-ink">
            {participantes.map((participant) => (
              <LinhaDoParticipante
                key={participant.id}
                participant={participant}
                reload={reload}
                notify={notify}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinhaDoParticipante({
  participant,
  reload,
  notify,
}: {
  participant: CompanyParticipant;
  reload: Reload;
  notify: Notify;
}) {
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [draft, setDraft] = useState<DadosParticipante>(() =>
    dadosDe(participant),
  );

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = problemaCpf(draft.documentId) ?? problemaRg(draft.rg);
    if (problema) {
      notify(problema);
      return;
    }
    setOcupado('salvar');
    try {
      await updateParticipantByCompany(participant.id, draft);
      notify('Participante atualizado.');
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar o participante.',
      );
    } finally {
      setOcupado('');
    }
  }

  async function remover() {
    if (
      !window.confirm(
        `Remover ${participant.full_name} da lista? As presenças dele nesta turma também saem.`,
      )
    )
      return;
    setOcupado('remover');
    try {
      await removeParticipantByCompany(participant.id);
      notify('Participante removido da lista.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao remover o participante.',
      );
    } finally {
      setOcupado('');
    }
  }

  const contato = [
    participant.job_title,
    participant.email || participant.phone,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="border-b border-doc-rule-strong">
      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{participant.full_name}</p>
          <p className={cn(mono, 'mt-0.5 text-xs text-doc-ink-muted')}>
            CPF {participant.document_id}
            {participant.rg ? ` · RG ${participant.rg}` : ''} · inscrito em{' '}
            {formatDate(participant.created_at)}
          </p>
          {contato ? (
            <p className="mt-0.5 text-sm text-doc-ink-muted">{contato}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(dadosDe(participant));
              setEditando((valor) => !valor);
            }}
            aria-expanded={editando}
            className={botao({ variante: 'contorno' })}
          >
            {editando ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Pencil className="size-4" aria-hidden="true" />
            )}
            {editando ? 'Fechar' : 'Editar'}
          </button>
          <button
            type="button"
            onClick={() => void remover()}
            disabled={Boolean(ocupado)}
            aria-label={`Remover ${participant.full_name}`}
            className={botaoIcone}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {editando ? (
        <form
          onSubmit={salvar}
          className="mb-4 grid gap-4 border border-doc-rule-strong bg-doc-sheet p-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <CamposDoParticipante draft={draft} setDraft={setDraft} />
          <div className="sm:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={Boolean(ocupado)}
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {ocupado === 'salvar' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Salvar alterações
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function PainelQr({ training }: { training: CompanyTraining }) {
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ativo = true;
    const publicUrl = `${window.location.origin}/participar/${training.qr_token}`;
    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((imageUrl) => {
        if (!ativo) return;
        setUrl(publicUrl);
        setImage(imageUrl);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [training.qr_token]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <div className="flex aspect-square w-40 items-center justify-center border border-doc-rule-strong bg-sl-white p-2">
        {image ? (
          <Image
            src={image}
            alt={`QR Code da inscrição na turma ${training.nr}`}
            width={150}
            height={150}
            unoptimized
            className="h-auto w-full"
          />
        ) : (
          <Loader2
            className="size-5 animate-spin text-doc-mark"
            aria-label="Gerando QR Code"
          />
        )}
      </div>
      <div className="min-w-0">
        <h2 className={tituloBloco}>QR Code da inscrição</h2>
        <p className={cn(mono, 'mt-2 text-xs break-all text-doc-ink-muted')}>
          {url}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className={botao({ variante: 'contorno' })}
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <a
            href={image || undefined}
            download={`qr-${training.code}.png`}
            className={botao({ variante: 'contorno' })}
          >
            <Download className="size-4" aria-hidden="true" />
            Baixar QR
          </a>
          <a
            href={url || undefined}
            target="_blank"
            rel="noreferrer"
            className={botao()}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Abrir formulário
          </a>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Presença por dia
// ---------------------------------------------------------------------------

function AbaPresenca({
  data,
  training,
  participantes,
  reload,
  notify,
}: {
  data: DadosDaGestao;
  training: CompanyTraining;
  participantes: CompanyParticipant[];
  reload: Reload;
  notify: Notify;
}) {
  const [ocupado, setOcupado] = useState('');
  const dias = training.sessions ?? [];
  const presencas = useMemo(() => {
    const mapa = new Set<string>();
    for (const item of data.attendance ?? [])
      mapa.add(`${item.participant_id}:${item.session_id}`);
    return mapa;
  }, [data.attendance]);
  const completos = participantes.filter(
    (item) => item.days_total > 0 && item.days_present >= item.days_total,
  ).length;

  async function alternar(
    participantId: string,
    sessionId: string,
    presente: boolean,
  ) {
    setOcupado(`${participantId}:${sessionId}`);
    try {
      await setParticipantAttendance(participantId, sessionId, !presente);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao marcar a presença.',
      );
    } finally {
      setOcupado('');
    }
  }

  if (participantes.length === 0)
    return (
      <Vazio
        titulo="Nenhum participante inscrito"
        texto="Inclua os participantes na aba Participantes."
      />
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-doc-ink-muted">
        {completos} de {participantes.length} com presença em todos os dias
        (recebem certificado). Clique no dia para marcar ou desmarcar, sem as
        travas do check-in.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-t border-b border-t-doc-ink border-b-doc-rule-strong font-doc-mono text-xs text-doc-ink-muted">
              <th scope="col" className="py-3 pr-4 font-medium">
                Participante
              </th>
              {dias.map((dia) => (
                <th
                  key={dia.id}
                  scope="col"
                  className="px-1 py-3 text-center font-medium"
                  title={formatDate(dia.session_date)}
                >
                  D{dia.day_number}
                </th>
              ))}
              <th scope="col" className="py-3 pl-4 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((participant) => (
              <tr
                key={participant.id}
                className="border-b border-doc-rule-strong"
              >
                <th scope="row" className="py-2 pr-4 font-semibold">
                  {participant.full_name}
                </th>
                {dias.map((dia) => {
                  const chave = `${participant.id}:${dia.id}`;
                  const presente = presencas.has(chave);
                  return (
                    <td key={dia.id} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        disabled={Boolean(ocupado)}
                        onClick={() =>
                          void alternar(participant.id, dia.id, presente)
                        }
                        aria-pressed={presente}
                        aria-label={`${participant.full_name}, dia ${dia.day_number} (${formatDate(dia.session_date)})`}
                        className={cn(
                          'doc-focus inline-flex size-9 items-center justify-center border disabled:opacity-50',
                          presente
                            ? 'border-doc-ink bg-doc-ink text-doc-paper'
                            : 'border-dashed border-doc-ink-muted text-doc-ink-muted hover:border-doc-ink',
                        )}
                      >
                        {ocupado === chave ? (
                          <Loader2
                            className="size-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : presente ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
                <td className="py-2 pl-4 text-right">
                  <PresencaBadge
                    present={participant.days_present}
                    total={participant.days_total}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arquivos da turma
// ---------------------------------------------------------------------------

type Tipo = 'photo' | 'document';

const tipos: Record<Tipo, { plural: string; accept: string; hint: string }> = {
  photo: {
    plural: 'Fotos',
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
    hint: 'JPG, PNG, WEBP ou HEIC, até 4 MB cada.',
  },
  document: {
    plural: 'Documentos',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
    hint: 'PDF, Word, Excel, CSV ou TXT, até 4 MB cada.',
  },
};

function AbaArquivos({
  training,
  arquivos,
  reload,
  notify,
}: {
  training: CompanyTraining;
  arquivos: CompanyFile[];
  reload: Reload;
  notify: Notify;
}) {
  const [tipo, setTipo] = useState<Tipo>('photo');
  const [fila, setFila] = useState<File[]>([]);
  const [enviando, setEnviando] = useState('');
  const [zipando, setZipando] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fotos = arquivos.filter((file) => file.kind === 'photo');
  // A lista assinada é comprovante: mora em Documentos, não na galeria.
  const documentos = arquivos.filter(
    (file) => file.kind === 'document' || file.kind === 'attendance',
  );
  const visiveis = tipo === 'photo' ? fotos : documentos;
  const baixaveis = visiveis.filter((file) => file.status === 'stored');

  async function enviar() {
    if (fila.length === 0) return;
    setEnviando('Enviando…');
    try {
      const result = await uploadCompanyFiles({
        clientId: training.client_id,
        trainingId: training.id,
        kind: tipo,
        files: fila,
        onProgress: (done, total, name) =>
          setEnviando(
            done >= total
              ? 'Finalizando…'
              : `Enviando ${done + 1} de ${total}: ${name}`,
          ),
      });
      setFila([]);
      notify(
        result.rejected.length
          ? `${result.saved} enviado(s). Recusado(s): ${result.rejected.join(', ')} — tipo não aceito ou acima de 4 MB.`
          : `${result.saved} arquivo(s) enviado(s).`,
      );
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao enviar os arquivos.',
      );
    } finally {
      setEnviando('');
    }
  }

  async function baixarTodos() {
    if (baixaveis.length === 0) return;
    setZipando('Preparando…');
    try {
      const result = await downloadFilesAsZip({
        entries: baixaveis.map((file) => ({ id: file.id, name: file.name })),
        zipName:
          `${tipos[tipo].plural.toLowerCase()}-${training.nr}-${training.code}`.replace(
            /\s+/g,
            '-',
          ),
        onProgress: (done, total) =>
          setZipando(
            done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`,
          ),
      });
      notify(
        result.failed.length
          ? `${result.zipped} arquivo(s) no zip. Falhou: ${result.failed.join(', ')}.`
          : `${result.zipped} arquivo(s) baixados em zip.`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao montar o zip.');
    } finally {
      setZipando('');
    }
  }

  async function excluir(file: CompanyFile) {
    if (
      !window.confirm(
        `Excluir "${file.name}" definitivamente? O arquivo sai do portal do cliente também.`,
      )
    )
      return;
    try {
      await deleteCompanyFile(file.id);
      notify('Arquivo excluído.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao excluir o arquivo.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Tipo de arquivo</legend>
        {(['photo', 'document'] as Tipo[]).map((opcao) => (
          <label
            key={opcao}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold"
          >
            <input
              type="radio"
              name={`tipo-${training.id}`}
              checked={tipo === opcao}
              onChange={() => {
                setTipo(opcao);
                setFila([]);
              }}
              className="doc-focus size-4 accent-sl-black"
            />
            {tipos[opcao].plural}{' '}
            <span className={cn(mono, 'text-xs text-doc-ink-muted')}>
              {opcao === 'photo' ? fotos.length : documentos.length}
            </span>
          </label>
        ))}
      </fieldset>

      <section className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={tipos[tipo].accept}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const lista = event.target.files;
            if (lista) setFila((atual) => [...atual, ...Array.from(lista)]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setArrastando(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setArrastando(false)}
          onDrop={(event) => {
            event.preventDefault();
            setArrastando(false);
            setFila((atual) => [
              ...atual,
              ...Array.from(event.dataTransfer.files),
            ]);
          }}
          className={cn(
            'doc-focus flex w-full flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition-colors',
            arrastando
              ? 'border-sl-gold bg-doc-sheet'
              : 'border-doc-ink-muted hover:border-doc-ink',
          )}
        >
          <UploadCloud className="size-5" aria-hidden="true" />
          <span className="font-semibold">
            Escolha ou arraste {tipos[tipo].plural.toLowerCase()}
          </span>
          <span className="text-sm text-doc-ink-muted">{tipos[tipo].hint}</span>
        </button>
        {fila.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className={mono}>{fila.length}</span> na fila ·{' '}
              <button
                type="button"
                onClick={() => setFila([])}
                className={botaoTexto}
              >
                Limpar
              </button>
            </p>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={Boolean(enviando)}
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {enviando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="size-4" aria-hidden="true" />
              )}
              {enviando || `Enviar ${tipos[tipo].plural.toLowerCase()}`}
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={tituloBloco}>{tipos[tipo].plural} da turma</h2>
          <button
            type="button"
            onClick={() => void baixarTodos()}
            disabled={baixaveis.length === 0 || Boolean(zipando)}
            className={botao({
              variante: 'contorno',
              className: 'disabled:opacity-40',
            })}
          >
            {zipando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileArchive className="size-4" aria-hidden="true" />
            )}
            {zipando || 'Baixar em zip'}
          </button>
        </div>
        {visiveis.length === 0 ? (
          <Vazio
            titulo={
              tipo === 'photo'
                ? 'Nenhuma foto nesta turma'
                : 'Nenhum documento nesta turma'
            }
          />
        ) : (
          <ul className="border-t border-doc-ink">
            {visiveis.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 border-b border-doc-rule-strong py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {file.kind === 'photo' && file.status === 'stored' ? (
                    <span className="relative size-12 shrink-0 overflow-hidden border border-doc-rule-strong">
                      <Image
                        src={`/api/files/${file.id}`}
                        alt=""
                        fill
                        unoptimized
                        sizes="48px"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-semibold" title={file.name}>
                      {file.name}
                      {file.kind === 'attendance' ? (
                        <span className="ml-2 font-doc-mono text-xs text-doc-mark">
                          lista assinada
                        </span>
                      ) : null}
                    </p>
                    <p className={cn(mono, 'text-xs text-doc-ink-muted')}>
                      {formatFileSize(file.size)} ·{' '}
                      {formatDate(file.created_at)}
                    </p>
                    {file.status !== 'stored' ? (
                      <p className="text-sm text-doc-error">
                        Arquivo não guardado (anterior ao armazenamento). Exclua
                        e envie de novo.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {file.status === 'stored' ? (
                    <>
                      <a
                        href={`/api/files/${file.id}`}
                        target="_blank"
                        rel="noopener"
                        className={botao({ variante: 'contorno' })}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Abrir
                      </a>
                      <a
                        href={`/api/files/${file.id}?download=1`}
                        aria-label={`Baixar ${file.name}`}
                        className={botaoIcone}
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </a>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void excluir(file)}
                    aria-label={`Excluir ${file.name}`}
                    className={botaoIcone}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certificados
// ---------------------------------------------------------------------------

function AbaCertificados({
  training,
  participantes,
  arquivos,
  reload,
  notify,
}: {
  training: CompanyTraining;
  participantes: CompanyParticipant[];
  arquivos: CompanyFile[];
  reload: Reload;
  notify: Notify;
}) {
  const [gerando, setGerando] = useState(false);
  const concluida = training.status === 'completed';
  const completos = participantes.filter(
    (item) => item.days_total > 0 && item.days_present >= item.days_total,
  ).length;
  const documentos = arquivos.filter((file) => file.kind === 'document').length;

  /** Gera de novo certificados, certificado da empresa e atestado. Só com a turma concluída. */
  async function gerar() {
    setGerando(true);
    try {
      const resultado = await generateCertificates(training.id);
      notify(
        `${resultado.documents.length} documento(s) gerados de novo com a lista atual.`,
      );
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao gerar os documentos.',
      );
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Dados
        itens={[
          [
            'Situação',
            concluida ? 'Emitidos no encerramento' : 'Saem ao encerrar a turma',
          ],
          ['Com presença completa', `${completos} de ${participantes.length}`],
          ['Documentos na turma', String(documentos)],
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <a
          href={`/certificado/${training.id}`}
          target="_blank"
          rel="noopener"
          className={botao({ variante: 'contorno' })}
        >
          <FileText className="size-4" aria-hidden="true" />
          Ver certificados (PDF)
        </a>
        {concluida ? (
          <button
            type="button"
            onClick={() => void gerar()}
            disabled={gerando}
            className={botao({ className: 'disabled:opacity-60' })}
          >
            {gerando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {gerando
              ? 'Gerando…'
              : documentos === 0
                ? 'Gerar documentos'
                : 'Gerar de novo'}
          </button>
        ) : null}
      </div>
      {concluida ? (
        <p className="text-sm text-doc-ink-muted">
          Se alguém entrou ou saiu da lista depois da emissão, gere de novo:
          quem saiu tem o certificado recolhido e os demais são regravados.
        </p>
      ) : null}
    </div>
  );
}
