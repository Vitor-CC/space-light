'use client';

import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Play,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import {
  encerrarDia,
  enviarListaAssinada,
  iniciarTurma,
  incluirParticipante,
  lerArquivos,
  lerParticipantes,
  removerParticipante,
  type ArquivoDaTurma,
  type NovoParticipante,
} from '@/components/instructor-portal/api';
import {
  formatDate,
  formatMoment,
  janelaDoDia,
  meuDia,
} from '@/components/instructor-portal/datas';
import {
  Cabecalho,
  Confirmar,
  Dados,
  SeloDeEstado,
  Vazio,
  botao,
  botaoIcone,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import type { CompanyParticipant, CompanyTraining } from '@/lib/company-types';
import {
  limparDigitacaoCpf,
  limparDigitacaoRg,
  problemaCpf,
  problemaRg,
} from '@/lib/documentos';
import type { InstructorDashboardData } from '@/lib/instructor-types';
import { cn } from '@/lib/utils';

const participanteVazio: NovoParticipante = {
  fullName: '',
  documentId: '',
  rg: '',
  birthDate: '',
  jobTitle: '',
  email: '',
  phone: '',
};

/**
 * A turma do instrutor numa tela só, que muda com o estado: atribuída (iniciar),
 * em andamento (QR, lista ao vivo, encerrar), dia encerrado e encerrada.
 */
export function TelaDaTurma({
  data,
  training,
  voltar,
  reload,
  notify,
}: {
  data: InstructorDashboardData;
  training: CompanyTraining;
  voltar: () => void;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [participants, setParticipants] = useState<CompanyParticipant[]>(() =>
    data.participants.filter((item) => item.training_id === training.id),
  );
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<NovoParticipante>(participanteVazio);
  const [savingManual, setSavingManual] = useState(false);
  const [arquivos, setArquivos] = useState<ArquivoDaTurma[] | null>(null);
  const [enviando, setEnviando] = useState(false);

  const emAndamento = training.status === 'in_progress';
  const concluida = training.status === 'completed';

  // O QR só existe com a turma em andamento; fora disso a tela nem o mostra.
  useEffect(() => {
    if (!emAndamento) return;
    let ativo = true;
    const publicUrl = `${window.location.origin}/participar/${training.qr_token}`;
    void QRCode.toDataURL(publicUrl, {
      width: 420,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((imagem) => {
      if (!ativo) return;
      setUrl(publicUrl);
      setImage(imagem);
    });
    return () => {
      ativo = false;
    };
  }, [emAndamento, training.qr_token]);

  const refreshParticipants = useCallback(async () => {
    try {
      setParticipants(await lerParticipantes(training.id));
    } catch {
      /* silencioso */
    }
  }, [training.id]);

  useEffect(() => {
    let ativo = true;
    lerParticipantes(training.id)
      .then((lista) => {
        if (ativo) setParticipants(lista);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [training.id]);

  // Lista ao vivo só com a turma em andamento: é quando o QR recebe inscrições.
  useEffect(() => {
    if (!emAndamento) return;
    const timer = window.setInterval(() => void refreshParticipants(), 4000);
    return () => window.clearInterval(timer);
  }, [emAndamento, refreshParticipants]);

  const carregarArquivos = useCallback(async () => {
    try {
      setArquivos(await lerArquivos(training.id));
    } catch {
      setArquivos([]);
    }
  }, [training.id]);

  useEffect(() => {
    let ativo = true;
    lerArquivos(training.id)
      .then((lista) => {
        if (ativo) setArquivos(lista);
      })
      .catch(() => {
        if (ativo) setArquivos([]);
      });
    return () => {
      ativo = false;
    };
  }, [training.id]);

  async function start() {
    setStarting(true);
    try {
      await iniciarTurma(training.id);
      notify('Treinamento iniciado. O formulário do QR Code está liberado.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao iniciar a turma.',
      );
    } finally {
      setStarting(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function complete() {
    setEnding(true);
    try {
      const resultado = await encerrarDia(training.id);
      notify(
        !resultado.trainingCompleted
          ? `Seu dia foi encerrado. ${resultado.remainingDays === 1 ? 'Ainda falta 1 dia' : `Ainda faltam ${resultado.remainingDays} dias`} para a turma acabar — os documentos saem só no fim.`
          : !resultado.certificates
            ? 'Treinamento encerrado. A lista de presença foi congelada.'
            : resultado.certificatePublished
              ? `Treinamento encerrado. ${resultado.certificates} certificado(s) emitidos; certificado da empresa e atestado ficaram nos documentos da turma.`
              : `Treinamento encerrado, mas o PDF dos certificados não foi gerado: ${resultado.certificateProblem ?? 'motivo desconhecido'}. Avise a Space Light.`,
      );
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao encerrar o treinamento.',
      );
    } finally {
      setEnding(false);
      setConfirmando(false);
    }
  }

  async function addManual(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const problemaDocumento =
      problemaCpf(manual.documentId) ?? problemaRg(manual.rg);
    if (problemaDocumento) {
      notify(problemaDocumento);
      return;
    }
    setSavingManual(true);
    try {
      await incluirParticipante(training.id, manual);
      setManual(participanteVazio);
      setShowManual(false);
      notify('Participante adicionado à lista.');
      await refreshParticipants();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao adicionar participante.',
      );
    } finally {
      setSavingManual(false);
    }
  }

  async function remover(participantId: string) {
    try {
      await removerParticipante(training.id, participantId);
      notify('Participante removido.');
      await refreshParticipants();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao remover participante.',
      );
    }
  }

  function exportCsv() {
    const header = [
      'Nome',
      'Identificador',
      'Presença (dias)',
      'Função',
      'E-mail',
      'Telefone',
      'Entrada',
    ];
    const body = participants.map((p) =>
      [
        p.full_name,
        p.document_id,
        `${p.days_present}/${p.days_total}`,
        p.job_title,
        p.email,
        p.phone,
        new Date(p.created_at).toLocaleString('pt-BR'),
      ]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(';'),
    );
    const csv = '﻿' + [header.join(';'), ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-presenca-${training.nr.replace(/\s+/g, '')}-${training.code}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function enviarLista(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const escolhidos = Array.from(input.files ?? []);
    if (escolhidos.length === 0) return;
    setEnviando(true);
    const { enviados, falhas } = await enviarListaAssinada(
      training.id,
      escolhidos,
    );
    notify(
      falhas.length
        ? `${enviados} enviado(s). Falhou: ${falhas.join('; ')}`
        : `${enviados} arquivo(s) enviado(s).`,
    );
    await carregarArquivos();
    setEnviando(false);
    input.value = '';
  }

  const {
    dias,
    atual: diaAtual,
    ultimoPendente,
  } = meuDia(training, data.instructor.id);
  const janela = janelaDoDia(diaAtual);
  const listas = (arquivos ?? []).filter((file) => file.kind === 'attendance');
  const fotos = (arquivos ?? []).filter((file) => file.kind === 'photo');
  // No último dia a foto da lista assinada é obrigatória. Conta só a lista:
  // antes as fotos da aula também contavam e a trava sumia na tela.
  const travadoSemLista =
    ultimoPendente && arquivos !== null && listas.length === 0;
  const completos = participants.filter(
    (p) => p.days_total > 0 && p.days_present >= p.days_total,
  ).length;
  const meuDiaFechado = diaAtual?.status === 'completed' && !concluida;
  const selo = concluida
    ? { status: 'completed', texto: 'Encerrada' }
    : meuDiaFechado
      ? { status: 'completed', texto: 'Dia encerrado' }
      : emAndamento
        ? { status: 'in_progress', texto: 'Em andamento' }
        : { status: 'scheduled', texto: 'Atribuída' };

  return (
    <div className="space-y-10">
      <Cabecalho
        voltar={{ rotulo: 'Minha agenda', aoVoltar: voltar }}
        titulo={
          <>
            <span className="font-doc-mono text-doc-mark">{training.nr}</span>{' '}
            {training.internal_label || training.title}
          </>
        }
        meta={
          <>
            <span>{training.client_name}</span>
            <SeloDeEstado status={selo.status} texto={selo.texto} />
          </>
        }
      />

      <section className="space-y-4">
        <Dados
          itens={[
            [
              'Data',
              formatDate(diaAtual?.session_date ?? training.training_date),
            ],
            ...(janela ? [['Horário', janela] as const] : []),
            ...(dias.length > 1
              ? [
                  [
                    'Dia',
                    `${diaAtual?.day_number ?? 1} de ${dias.length}`,
                  ] as const,
                ]
              : []),
            ['Local', training.location],
            ['Carga horária', training.duration],
            ['Participantes', String(participants.length)],
          ]}
        />
        {dias.length > 1 ? (
          <ol aria-label="Dias da turma" className="flex flex-wrap gap-1.5">
            {dias.map((dia) => (
              <li
                key={dia.id}
                title={`Dia ${dia.day_number}: ${dia.instructor_name ?? 'sem instrutor'}`}
                className={cn(
                  'inline-flex size-8 items-center justify-center border font-doc-mono text-xs',
                  dia.status === 'completed'
                    ? 'border-doc-ink bg-doc-ink text-doc-paper'
                    : dia.id === diaAtual?.id
                      ? 'border-sl-gold bg-sl-gold text-sl-black'
                      : 'border-doc-rule-strong text-doc-ink-muted',
                )}
              >
                <span className="sr-only">Dia </span>
                {dia.day_number}
                <span className="sr-only">
                  {dia.status === 'completed'
                    ? ', encerrado'
                    : dia.id === diaAtual?.id
                      ? ', o seu dia atual'
                      : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {!emAndamento && !concluida ? (
        <section>
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className={botao({
              tamanho: 'lg',
              className: 'w-full sm:w-auto disabled:opacity-60',
            })}
          >
            {starting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-5" aria-hidden="true" />
            )}
            Iniciar treinamento
          </button>
        </section>
      ) : null}

      {emAndamento ? (
        <section className="grid gap-6 border-t border-doc-rule-strong pt-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="flex aspect-square max-w-80 items-center justify-center border border-doc-rule-strong bg-sl-white p-3">
            {image ? (
              <Image
                src={image}
                alt={`QR Code da inscrição na turma ${training.nr}`}
                width={320}
                height={320}
                unoptimized
                className="h-auto w-full"
              />
            ) : (
              <Loader2
                className="size-6 animate-spin text-doc-mark"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="min-w-0 space-y-5">
            <div>
              <h2 className={tituloBloco}>QR Code da inscrição</h2>
              <p
                className={cn(
                  mono,
                  'mt-2 text-xs break-all text-doc-ink-muted',
                )}
              >
                {url}
              </p>
              <button
                type="button"
                onClick={() => void copyUrl()}
                className={botao({
                  variante: 'contorno',
                  className: 'mt-3 w-full sm:w-auto',
                })}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>

            {meuDiaFechado ? (
              <p className="border-l-4 border-doc-ink py-1 pl-4">
                <strong>Dia {diaAtual?.day_number} encerrado.</strong> A turma
                continua nos próximos dias.
              </p>
            ) : travadoSemLista ? (
              <p role="alert" className="border-l-4 border-doc-error py-1 pl-4">
                <strong>Último dia: envie a foto da lista assinada</strong>{' '}
                (abaixo) para poder encerrar.
              </p>
            ) : confirmando ? (
              <Confirmar
                perigo
                titulo={
                  ultimoPendente
                    ? 'Encerrar o treinamento?'
                    : `Encerrar o dia ${diaAtual?.day_number ?? 1}?`
                }
                texto={
                  ultimoPendente
                    ? `A lista é congelada e ${completos} de ${participants.length} participante(s) recebem certificado — só quem tem presença em todos os dias. Não dá para reabrir.`
                    : 'A turma segue nos outros dias. Os certificados saem no último dia.'
                }
                confirmar={ending ? 'Encerrando…' : 'Sim, encerrar'}
                ocupado={ending}
                aoConfirmar={() => void complete()}
                aoCancelar={() => setConfirmando(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={ending}
                className="doc-focus inline-flex h-12 w-full items-center justify-center gap-2 bg-doc-ink px-6 font-semibold text-doc-paper hover:bg-doc-error disabled:opacity-50 sm:w-auto"
              >
                <Check className="size-5" aria-hidden="true" />
                {ultimoPendente
                  ? 'Encerrar treinamento'
                  : `Encerrar o dia ${diaAtual?.day_number ?? 1}`}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {concluida ? (
        <p className="border-l-4 border-doc-ink py-1 pl-4">
          <strong>Treinamento encerrado.</strong> A lista de presença está
          congelada.
        </p>
      ) : null}

      <section className="space-y-4 border-t border-doc-rule-strong pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={tituloBloco}>
            Lista de presença{' '}
            <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
              {participants.length}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/lista-presenca/${training.id}`}
              target="_blank"
              rel="noopener"
              className={botao({ variante: 'contorno' })}
            >
              <FileText className="size-4" aria-hidden="true" />
              Gerar PDF
            </a>
            {emAndamento || concluida ? (
              <button
                type="button"
                onClick={exportCsv}
                disabled={participants.length === 0}
                className={botao({
                  variante: 'contorno',
                  className: 'disabled:opacity-40',
                })}
              >
                <Download className="size-4" aria-hidden="true" />
                CSV
              </button>
            ) : null}
            {emAndamento ? (
              <button
                type="button"
                onClick={() => setShowManual((valor) => !valor)}
                aria-expanded={showManual}
                className={botao()}
              >
                <Plus className="size-4" aria-hidden="true" />
                Adicionar
              </button>
            ) : null}
          </div>
        </div>

        {showManual && emAndamento ? (
          <form
            onSubmit={addManual}
            className="grid gap-4 border border-doc-rule-strong bg-doc-sheet p-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {(
              [
                ['fullName', 'Nome completo', { required: true }],
                [
                  'documentId',
                  'CPF (só números)',
                  { required: true, inputMode: 'numeric' as const },
                ],
                ['rg', 'RG (sem ele, repita o CPF)', { required: true }],
                ['birthDate', 'Data de nascimento', { type: 'date' }],
                ['jobTitle', 'Função', {}],
                ['email', 'E-mail', { type: 'email' }],
                ['phone', 'Telefone', { type: 'tel' }],
              ] as const
            ).map(([chave, texto, extra]) => (
              <label
                key={chave}
                className={
                  chave === 'fullName' ? 'sm:col-span-2 xl:col-span-3' : ''
                }
              >
                <span className={rotulo}>{texto}</span>
                <input
                  {...extra}
                  value={manual[chave]}
                  onChange={(e) =>
                    setManual({
                      ...manual,
                      [chave]:
                        chave === 'documentId'
                          ? limparDigitacaoCpf(e.target.value)
                          : chave === 'rg'
                            ? limparDigitacaoRg(e.target.value)
                            : e.target.value,
                    })
                  }
                  className={campo}
                />
              </label>
            ))}
            <div className="sm:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={savingManual}
                className={botao({ className: 'disabled:opacity-60' })}
              >
                {savingManual ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                Adicionar à lista
              </button>
            </div>
          </form>
        ) : null}

        {participants.length === 0 ? (
          <Vazio
            titulo="Ninguém na lista ainda"
            texto={
              emAndamento
                ? 'As inscrições pelo QR Code aparecem aqui sozinhas.'
                : 'A lista abre quando o treinamento começa.'
            }
          />
        ) : (
          <>
            <ul className="border-t border-doc-rule-strong md:hidden">
              {participants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-start justify-between gap-3 border-b border-doc-rule-strong py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{participant.full_name}</p>
                    <p className={cn(mono, 'mt-1 text-xs text-doc-ink-muted')}>
                      {participant.document_id} · presença{' '}
                      {participant.days_present}/{participant.days_total}
                    </p>
                    <p className="mt-1 text-xs text-doc-ink-muted">
                      {participant.job_title || 'Sem função'}
                    </p>
                  </div>
                  {emAndamento ? (
                    <button
                      type="button"
                      onClick={() => void remover(participant.id)}
                      aria-label={`Remover ${participant.full_name}`}
                      className={botaoIcone}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-t border-b border-t-doc-ink border-b-doc-rule-strong font-doc-mono text-xs text-doc-ink-muted">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Participante
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      CPF
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Presença
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Função
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Contato
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Entrada
                    </th>
                    {emAndamento ? (
                      <th scope="col" className="py-3 text-right font-medium">
                        <span className="sr-only">Ações</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="border-b border-doc-rule-strong"
                    >
                      <th scope="row" className="py-3 pr-4 font-semibold">
                        {participant.full_name}
                      </th>
                      <td className={cn(mono, 'py-3 pr-4 text-xs')}>
                        {participant.document_id}
                      </td>
                      <td className={cn(mono, 'py-3 pr-4 text-xs')}>
                        {participant.days_present}/{participant.days_total}
                      </td>
                      <td className="py-3 pr-4 text-doc-ink-muted">
                        {participant.job_title || '—'}
                      </td>
                      <td className="py-3 pr-4 text-doc-ink-muted">
                        {participant.email || participant.phone || '—'}
                      </td>
                      <td className={cn(mono, 'py-3 pr-4 text-xs')}>
                        {new Date(participant.created_at).toLocaleTimeString(
                          'pt-BR',
                          { hour: '2-digit', minute: '2-digit' },
                        )}
                      </td>
                      {emAndamento ? (
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void remover(participant.id)}
                            aria-label={`Remover ${participant.full_name}`}
                            className={botaoIcone}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-doc-rule-strong pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={tituloBloco}>Foto da lista assinada</h2>
          <label
            className={botao({
              className: cn(
                'cursor-pointer',
                enviando && 'pointer-events-none opacity-60',
              ),
            })}
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {enviando ? 'Enviando…' : 'Enviar foto'}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) => void enviarLista(event)}
              className="sr-only"
            />
          </label>
        </div>
        <Arquivos
          arquivos={arquivos === null ? null : listas}
          vazio="Nenhuma lista enviada. JPG, PNG, WEBP ou HEIC, até 4 MB."
        />
        {fotos.length ? (
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold">Fotos da aula</h3>
            <Arquivos arquivos={fotos} vazio="" />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Arquivos({
  arquivos,
  vazio,
}: {
  arquivos: ArquivoDaTurma[] | null;
  vazio: string;
}) {
  if (arquivos === null)
    return (
      <output
        aria-label="Carregando"
        className="block h-24 animate-pulse bg-doc-rule"
      />
    );
  if (arquivos.length === 0)
    return <p className="text-sm text-doc-ink-muted">{vazio}</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {arquivos.map((file) => (
        <li
          key={file.id}
          className="border border-doc-rule-strong bg-doc-sheet"
        >
          <a
            href={`/api/files/${file.id}`}
            target="_blank"
            rel="noopener"
            className="doc-focus relative block aspect-[4/3] bg-doc-paper"
          >
            {file.stored ? (
              <Image
                src={`/api/files/${file.id}`}
                alt={file.name}
                fill
                unoptimized
                sizes="(min-width:1280px) 33vw, 100vw"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-doc-ink-muted">
                Sem conteúdo
              </span>
            )}
          </a>
          <div className="p-3">
            <p className="truncate text-sm font-semibold" title={file.name}>
              {file.name}
            </p>
            <p className={cn(mono, 'mt-1 text-xs text-doc-ink-muted')}>
              {Math.max(1, Math.round(file.size / 1024))} KB ·{' '}
              {formatMoment(file.createdAt)}
            </p>
            {file.stored ? (
              <a
                href={`/api/files/${file.id}?download=1`}
                className={cn(botaoTexto, 'mt-2')}
              >
                <Download className="size-4" aria-hidden="true" />
                Baixar
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
