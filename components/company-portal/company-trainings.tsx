'use client';

import { AlertTriangle, CalendarDays, CalendarPlus, Check, ChevronDown, Clock3, Loader2, MessageCircle, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { EmptyState, fieldClass, formatDate, formatWindow, labelClass, selectClass, StatusTag, SubTabs } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import type { CompanyDashboardData, CompanyInstructor, CompanyTraining, TrainingSession } from '@/lib/company-types';
import { addTrainingDay, completeTrainingByCompany, createMockTraining, deleteTraining, removeTrainingDay, renameTraining, updateTrainingDay, updateTrainingDetails } from '@/lib/mock-company-database';
import type { NovoDia } from '@/lib/mock-company-database';
import { nrInfo } from '@/lib/nr-catalog';
import { scheduleWindow, trainingReminderMessage, trainingScheduleMessage, whatsappLink } from '@/lib/whatsapp';

type Aba = 'agenda' | 'lista' | 'concluidas' | 'criar';
type Notify = (message: string) => void;
type Reload = () => Promise<void>;

const NORMAS = ['NR 05', 'NR 06', 'NR 10', 'NR 11', 'NR 12', 'NR 18', 'NR 20', 'NR 23', 'NR 33', 'NR 34', 'NR 35'];

function isoFromDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Só dígitos: o CNPJ é digitado com e sem pontuação, e as duas têm de achar. */
function digitos(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

/** Próximo dia ainda não encerrado da turma (ou o último, se todos foram). */
function proximoDia(training: CompanyTraining) {
  const dias = training.sessions ?? [];
  return dias.find((dia) => dia.status !== 'completed') ?? dias[dias.length - 1] ?? null;
}

function dataDaTurma(training: CompanyTraining) {
  return proximoDia(training)?.session_date ?? training.training_date;
}

// Turmas em aberto agrupadas pelo próximo dia a dar: a lista corrida misturava tudo.
const GRUPOS = [
  { id: 'atrasadas', titulo: 'Atrasadas', texto: 'dia já passou e não foi encerrado' },
  { id: 'hoje', titulo: 'Hoje', texto: '' },
  { id: 'semana', titulo: 'Próximos 7 dias', texto: '' },
  { id: 'depois', titulo: 'Mais adiante', texto: '' },
] as const;

// ---------------------------------------------------------------------------
// Ações de um dia e de uma turma
// ---------------------------------------------------------------------------

function DayRow({ training, session, instructors, reload, notify }: { training: CompanyTraining; session: TrainingSession; instructors: CompanyInstructor[]; reload: Reload; notify: Notify }) {
  const [salvando, setSalvando] = useState(false);
  const total = training.sessions.length;
  const encerrado = session.status === 'completed';

  async function salvar(campos: { instructorId?: string | null; sessionDate?: string; startTime?: string; endTime?: string }) {
    setSalvando(true);
    try {
      await updateTrainingDay(training.id, { sessionId: session.id, ...campos });
      notify(`Dia ${session.day_number} atualizado.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao atualizar o dia.'); }
    finally { setSalvando(false); }
  }

  // A gestão pode tudo: dia encerrado também se edita ou remove.
  async function removerDia() {
    if (!window.confirm(`Remover o dia ${session.day_number} (${formatDate(session.session_date)}) desta turma? As presenças marcadas neste dia também saem.`)) return;
    setSalvando(true);
    try {
      await removeTrainingDay(training.id, session.id);
      notify(`Dia ${session.day_number} removido.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao remover o dia.'); }
    finally { setSalvando(false); }
  }

  const instrutor = instructors.find((item) => item.id === session.instructor_id);
  const aviso = instrutor?.phone
    ? whatsappLink(instrutor.phone, trainingScheduleMessage({
        instructorName: instrutor.name,
        nr: training.nr,
        title: training.title,
        clientName: training.client_name,
        dateLabel: formatDate(session.session_date),
        timeLabel: scheduleWindow(session.start_time, session.end_time),
        duration: training.duration,
        location: training.location,
      }))
    : null;

  return <div className={`grid gap-3 border-t border-black/8 p-4 sm:grid-cols-[64px_minmax(0,1fr)] ${encerrado ? 'bg-[#f7f7f4]' : ''}`}>
    <div className="flex items-start gap-2 sm:block">
      <strong className="font-heading text-2xl font-black leading-none text-[#f2ad19]">{session.day_number}</strong>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#999] sm:mt-1 sm:block">de {total}</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(140px,auto)_minmax(180px,auto)_minmax(180px,1fr)_auto]">
      <Input type="date" aria-label={`Data do dia ${session.day_number}`} disabled={salvando} value={session.session_date} onChange={(e) => void salvar({ sessionDate: e.target.value })} className={`${fieldClass} w-full min-w-[140px]`} />
      <div className="grid grid-cols-2 gap-2">
        <Input type="time" aria-label={`Início do dia ${session.day_number}`} disabled={salvando} value={session.start_time} onChange={(e) => void salvar({ startTime: e.target.value })} className={`${fieldClass} w-full min-w-[84px]`} />
        <Input type="time" aria-label={`Fim do dia ${session.day_number}`} disabled={salvando} value={session.end_time} onChange={(e) => void salvar({ endTime: e.target.value })} className={`${fieldClass} w-full min-w-[84px]`} />
      </div>
      <select aria-label={`Instrutor do dia ${session.day_number}`} disabled={salvando} value={session.instructor_id ?? ''} onChange={(e) => void salvar({ instructorId: e.target.value || null })} className={`${selectClass} min-w-[180px] ${session.instructor_id ? '' : 'border-[#b62525] text-[#b62525]'}`}>
        <option value="">Sem instrutor — escalar depois</option>
        {instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <div className="flex items-center gap-2">
        {total > 1 ? <button type="button" onClick={() => void removerDia()} disabled={salvando} aria-label={`Remover o dia ${session.day_number}`} title="Remover este dia" className="flex size-11 shrink-0 items-center justify-center border border-black/15 bg-white text-[#777] hover:border-[#b62525] hover:text-[#b62525] disabled:opacity-40"><X className="size-4" /></button> : null}
        {salvando ? <Loader2 className="size-4 animate-spin text-[#8a6107]" /> : null}
        {encerrado ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#17642d]"><Check className="size-4" />Encerrado</span>
          : aviso ? <a href={aviso} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 whitespace-nowrap border border-black/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a7a43] hover:bg-[#25D366] hover:text-black"><MessageCircle className="size-4" />Avisar</a>
          : null}
      </div>
    </div>
  </div>;
}

/** A gestão acrescenta um dia à turma; a numeração segue a ordem das datas. */
function AddDay({ training, instructors, reload, notify }: { training: CompanyTraining; instructors: CompanyInstructor[]; reload: Reload; notify: Notify }) {
  const ultimo = training.sessions[training.sessions.length - 1];
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dia, setDia] = useState<NovoDia>({ date: '', startTime: ultimo?.start_time || '08:00', endTime: ultimo?.end_time || '18:00', instructorId: ultimo?.instructor_id ?? null });

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await addTrainingDay(training.id, dia);
      notify(`Dia ${formatDate(dia.date)} acrescentado à turma.`);
      setAberto(false);
      setDia({ ...dia, date: '' });
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao acrescentar o dia.'); }
    finally { setSalvando(false); }
  }

  if (!aberto) {
    return <div className="border-t border-black/8 px-4 py-3"><button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] hover:text-black"><Plus className="size-4" />Adicionar dia</button></div>;
  }
  return <form onSubmit={salvar} className="grid gap-2 border-t border-black/8 bg-[#fffdf7] p-4 sm:grid-cols-[1fr_auto_auto] xl:grid-cols-[minmax(140px,auto)_auto_auto_minmax(180px,1fr)_auto_auto]">
    <Input required type="date" aria-label="Data do novo dia" value={dia.date} onChange={(e) => setDia({ ...dia, date: e.target.value })} className={fieldClass} />
    <Input type="time" aria-label="Início do novo dia" value={dia.startTime} onChange={(e) => setDia({ ...dia, startTime: e.target.value })} className={`${fieldClass} sm:w-28`} />
    <Input type="time" aria-label="Fim do novo dia" value={dia.endTime} onChange={(e) => setDia({ ...dia, endTime: e.target.value })} className={`${fieldClass} sm:w-28`} />
    <select aria-label="Instrutor do novo dia" value={dia.instructorId ?? ''} onChange={(e) => setDia({ ...dia, instructorId: e.target.value || null })} className={`${selectClass} sm:col-span-3 xl:col-span-1`}>
      <option value="">Sem instrutor — escalar depois</option>
      {instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <Button type="submit" disabled={salvando} className="h-12 rounded-none bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]">{salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Adicionar</Button>
    <button type="button" onClick={() => setAberto(false)} className="h-12 border border-black/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white">Cancelar</button>
  </form>;
}

type DadosTreinamento = { clientId: string; nr: string; title: string; duration: string; location: string; contentProgram: string };

/** O que sai no certificado e na lista: cliente, norma, título, carga horária, endereço e conteúdo. */
function TrainingDetails({ training, clients, reload, notify }: { training: CompanyTraining; clients: CompanyDashboardData['clients']; reload: Reload; notify: Notify }) {
  const inicial = (): DadosTreinamento => ({ clientId: training.client_id, nr: training.nr, title: training.title, duration: training.duration, location: training.location, contentProgram: training.content_program ?? '' });
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosTreinamento>(inicial);
  const normas = NORMAS.includes(draft.nr) ? NORMAS : [draft.nr, ...NORMAS];

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await updateTrainingDetails(training.id, draft);
      notify(training.status === 'completed'
        ? 'Dados salvos. A turma já foi encerrada: gere os documentos de novo (aba QR e participantes) para refletir a mudança.'
        : 'Dados do treinamento salvos.');
      setAberto(false);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o treinamento.'); }
    finally { setSalvando(false); }
  }

  if (!aberto) {
    return <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-black/8 pb-3">
      <span className="text-[11px] text-[#777]">Cliente, norma, título do certificado, carga horária, endereço e conteúdo programático.</span>
      <button type="button" onClick={() => { setDraft(inicial()); setAberto(true); }} className="inline-flex h-10 items-center gap-2 border border-black/15 bg-white px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white"><Pencil className="size-3.5" />Editar dados do treinamento</button>
    </div>;
  }
  return <form onSubmit={salvar} className="mb-3 space-y-4 border border-black/10 bg-white p-4">
    <ClientPicker clients={clients} value={draft.clientId} onChange={(id) => setDraft({ ...draft, clientId: id })} />
    <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
      <label htmlFor={`editar-nr-${training.id}`}><span className={labelClass}>Norma</span>
        <select id={`editar-nr-${training.id}`} value={draft.nr} onChange={(e) => setDraft({ ...draft, nr: e.target.value })} className={selectClass}>{normas.map((nr) => <option key={nr}>{nr}</option>)}</select>
      </label>
      <label htmlFor={`editar-titulo-${training.id}`}><span className={labelClass}>Título no certificado</span>
        <Input id={`editar-titulo-${training.id}`} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={fieldClass} />
      </label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label htmlFor={`editar-carga-${training.id}`}><span className={labelClass}>Carga horária</span>
        <Input id={`editar-carga-${training.id}`} required value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className={fieldClass} />
      </label>
      <label htmlFor={`editar-local-${training.id}`}><span className={labelClass}>Endereço do treinamento</span>
        <Input id={`editar-local-${training.id}`} required value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={fieldClass} />
      </label>
    </div>
    <label htmlFor={`editar-conteudo-${training.id}`}><span className={labelClass}>Conteúdo programático (aparece na lista)</span>
      <textarea id={`editar-conteudo-${training.id}`} rows={4} value={draft.contentProgram} onChange={(e) => setDraft({ ...draft, contentProgram: e.target.value })} className="w-full border border-black/16 bg-white p-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30" />
    </label>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={salvando} className="h-11 rounded-none bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]">{salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar dados</Button>
      <button type="button" onClick={() => setAberto(false)} className="h-11 border border-black/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white">Cancelar</button>
    </div>
  </form>;
}

function TrainingActions({ training, clients, instructors, faltaLista, reload, notify }: { training: CompanyTraining; clients: CompanyDashboardData['clients']; instructors: CompanyInstructor[]; faltaLista: boolean; reload: Reload; notify: Notify }) {
  const [ocupado, setOcupado] = useState('');
  const [confirmarSemLista, setConfirmarSemLista] = useState('');
  const [identificacao, setIdentificacao] = useState(training.internal_label);
  const concluido = training.status === 'completed';

  // Quem ainda deve alguma coisa: instrutor de dia não encerrado. O link do
  // WhatsApp é montado aqui mesmo, sem passar pelo servidor — assim o botão
  // já vale antes de a cobrança por e-mail ser disparada.
  const devedores = [...new Map((training.sessions ?? [])
    .filter((dia) => dia.status !== 'completed' && dia.instructor_id)
    .map((dia) => [dia.instructor_id as string, dia]))
    .values()]
    .map((dia) => {
      const instrutor = instructors.find((item) => item.id === dia.instructor_id);
      const url = instrutor?.phone
        ? whatsappLink(instrutor.phone, trainingReminderMessage({
            instructorName: instrutor.name,
            nr: training.nr,
            title: training.title,
            clientName: training.client_name,
            dateLabel: formatDate(dia.session_date),
            faltaLista,
          }))
        : null;
      return { nome: instrutor?.name ?? 'Instrutor', url };
    });
  const cobraveisPorWhats = devedores.filter((item) => item.url);

  async function encerrar(semLista: boolean) {
    setOcupado('encerrando');
    try {
      const resultado = await completeTrainingByCompany(training.id, semLista);
      if (resultado.needsConfirmation) { setConfirmarSemLista(resultado.message || 'A foto da lista de presença assinada ainda não foi enviada.'); return; }
      setConfirmarSemLista('');
      notify(resultado.certificatePublished
        ? `Turma encerrada. ${resultado.certificates} certificado(s) emitidos e arquivados nos documentos.`
        : `Turma encerrada, mas os documentos não foram gerados: ${resultado.certificateProblem ?? 'motivo desconhecido'}.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao encerrar a turma.'); }
    finally { setOcupado(''); }
  }

  async function renomear() {
    if (identificacao.trim() === training.internal_label) return;
    setOcupado('renomeando');
    try {
      await renameTraining(training.id, identificacao);
      notify(identificacao.trim() ? 'Identificação da turma salva.' : 'Identificação removida.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao renomear a turma.'); }
    finally { setOcupado(''); }
  }

  async function remover() {
    if (!window.confirm(`Excluir o treinamento "${training.nr} - ${training.title}" e todos os seus participantes e arquivos? Esta ação não pode ser desfeita.`)) return;
    try { await deleteTraining(training.id); notify('Treinamento excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o treinamento.'); }
  }

  return <div className="border-t border-black/8 bg-[#f7f7f4] p-4">
    {confirmarSemLista ? <div className="mb-3 border-2 border-[#b62525] bg-[#fff5f5] p-4">
      <strong className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.04em] text-[#b62525]"><AlertTriangle className="size-4" />Encerrar sem a lista assinada?</strong>
      <p className="mt-2 text-xs leading-relaxed text-[#666]">{confirmarSemLista} Os certificados serão emitidos mesmo assim e a ressalva fica registrada na Atividade com o seu nome.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => setConfirmarSemLista('')} className="inline-flex h-11 flex-1 items-center justify-center border border-black/20 bg-white text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white">Cancelar</button>
        <button type="button" onClick={() => void encerrar(true)} disabled={ocupado === 'encerrando'} className="inline-flex h-11 flex-[2] items-center justify-center gap-2 bg-[#b62525] text-[10px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-[#8f1c1c] disabled:opacity-50">{ocupado === 'encerrando' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Encerrar assim mesmo</button>
      </div>
    </div> : null}

    <TrainingDetails training={training} clients={clients} reload={reload} notify={notify} />

    <div className="mb-3 flex flex-col gap-2 border-b border-black/8 pb-3 sm:flex-row sm:items-center">
      <label htmlFor={`identificacao-${training.id}`} className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#777]">Identificação da turma</label>
      <Input id={`identificacao-${training.id}`} value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} onBlur={() => void renomear()} placeholder="Ex.: Turma A - manhã" className={`${fieldClass} flex-1`} />
      <span className="shrink-0 text-[11px] text-[#999]">Não aparece em documento</span>
    </div>

    <div className="flex flex-wrap gap-2">
      {concluido ? null : <>
        {cobraveisPorWhats.map((item) => <a key={item.nome} href={item.url as string} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 bg-[#25D366] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-black hover:bg-[#1fb855]"><MessageCircle className="size-4" />{cobraveisPorWhats.length > 1 ? `Cobrar ${item.nome.split(' ')[0]} no WhatsApp` : 'Cobrar no WhatsApp'}</a>)}
        <button type="button" onClick={() => void encerrar(false)} disabled={Boolean(ocupado)} className="inline-flex h-11 items-center gap-2 bg-black px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-[#f2ad19] hover:text-black disabled:opacity-50">{ocupado === 'encerrando' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Encerrar turma</button>
      </>}
      <a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 border border-black/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white">Lista (PDF)</a>
      <button type="button" onClick={() => void remover()} className="ml-auto inline-flex h-11 items-center gap-2 border border-[#b62525]/40 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b62525] hover:bg-[#b62525] hover:text-white"><Trash2 className="size-4" />Excluir</button>
    </div>

    {devedores.length > 0 && devedores.every((item) => !item.url) && !concluido ? <p className="mt-3 border-t border-black/8 pt-3 text-[11px] text-[#888]">Sem telefone no cadastro do instrutor não dá para cobrar por WhatsApp — inclua o número na aba Instrutores.</p> : null}
  </div>;
}

/** Uma turma na lista: cabeçalho sempre visível, dias e ações ao abrir. */
function TrainingRow({ training, clients, instructors, faltaLista, reload, notify, aberta, alternar }: { training: CompanyTraining; clients: CompanyDashboardData['clients']; instructors: CompanyInstructor[]; faltaLista: boolean; reload: Reload; notify: Notify; aberta: boolean; alternar: () => void }) {
  const dias = training.sessions ?? [];
  const proxima = proximoDia(training);
  const semInstrutor = dias.filter((dia) => !dia.instructor_id).length;
  return <article className="border border-black/10 bg-white">
    <button type="button" onClick={alternar} aria-expanded={aberta} className="flex w-full items-center gap-4 p-4 text-left hover:bg-[#fff8e8]">
      <span className="flex size-11 shrink-0 items-center justify-center bg-black font-heading text-xs font-black text-[#f2ad19]">{training.nr}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-extrabold uppercase tracking-[0.04em]">{training.internal_label || training.title}</strong>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777]">
          <span className="font-bold text-[#8a6107]">{training.client_name}</span>
          {training.internal_label ? <span className="truncate">{training.title}</span> : null}
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(proxima?.session_date ?? training.training_date)}{dias.length > 1 && proxima ? ` · dia ${proxima.day_number} de ${dias.length}` : ''}</span>
          <span>{training.participant_count} inscrito(s)</span>
        </span>
      </span>
      {semInstrutor > 0 ? <span className="hidden shrink-0 items-center gap-1.5 bg-[#fff5f5] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b62525] sm:inline-flex"><UserRound className="size-3.5" />{semInstrutor} sem instrutor</span> : null}
      <StatusTag status={training.status} />
      <ChevronDown className={`size-4 shrink-0 text-black/35 transition ${aberta ? 'rotate-180' : ''}`} />
    </button>
    {aberta ? <>
      {dias.map((dia) => <DayRow key={dia.id} training={training} session={dia} instructors={instructors} reload={reload} notify={notify} />)}
      <AddDay training={training} instructors={instructors} reload={reload} notify={notify} />
      <TrainingActions training={training} clients={clients} instructors={instructors} faltaLista={faltaLista} reload={reload} notify={notify} />
    </> : null}
  </article>;
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

function Agenda({ data, reload, notify }: { data: CompanyDashboardData; reload: Reload; notify: Notify }) {
  const [selecionada, setSelecionada] = useState<Date | undefined>(new Date());
  const instrutores = data.instructors.filter((item) => item.status === 'active');

  // Cada dia do calendário aponta para a turma dele: é assim que a agenda
  // mostra o que acontece na data, e não só quando a turma começou.
  const porData = useMemo(() => {
    const mapa = new Map<string, { training: CompanyTraining; session: TrainingSession }[]>();
    for (const training of data.trainings) {
      // Turma concluída sai da agenda: fica na aba Concluídas.
      if (training.status === 'completed') continue;
      for (const session of training.sessions ?? []) {
        const lista = mapa.get(session.session_date);
        if (lista) lista.push({ training, session }); else mapa.set(session.session_date, [{ training, session }]);
      }
    }
    return mapa;
  }, [data.trainings]);

  const comTreino = useMemo(() => [...porData.keys()].map(dateFromIso), [porData]);
  const semEscala = useMemo(
    () => [...porData.entries()].filter(([, itens]) => itens.some((item) => !item.session.instructor_id)).map(([iso]) => dateFromIso(iso)),
    [porData],
  );

  const iso = selecionada ? isoFromDate(selecionada) : '';
  const doDia = porData.get(iso) ?? [];

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
    <div className="h-fit border border-black/10 bg-white p-5 sm:p-7 xl:sticky xl:top-[96px]">
      <Calendar mode="single" selected={selecionada} onSelect={setSelecionada} locale={ptBR}
        modifiers={{ treino: comTreino, semEscala }}
        modifiersClassNames={{ treino: 'bg-black text-[#f2ad19] font-bold', semEscala: 'ring-2 ring-[#b62525] ring-inset' }}
        className="mx-auto w-full [--cell-size:--spacing(11)]" />
      <div className="mt-5 flex flex-wrap gap-4 border-t border-black/10 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#777]">
        <span className="flex items-center gap-2"><i className="size-3 bg-black" />Dia de treinamento</span>
        <span className="flex items-center gap-2"><i className="size-3 border-2 border-[#b62525]" />Falta instrutor</span>
      </div>
    </div>
    <div>
      <div className="mb-4">
        <span className="eyebrow text-[#8a6107]">{selecionada ? formatDate(iso) : 'Escolha uma data'}</span>
        <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">{doDia.length === 1 ? '1 turma neste dia' : `${doDia.length} turmas neste dia`}</h2>
      </div>
      <div className="space-y-4">
        {doDia.map(({ training, session }) => <article key={session.id} className="border border-black/10 bg-white">
          <div className="flex items-start gap-4 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center bg-black font-heading text-sm font-black text-[#f2ad19]">{training.nr}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><StatusTag status={session.status} /><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">Dia {session.day_number} de {training.sessions.length}</span></div>
              <h3 className="mt-3 text-base font-extrabold uppercase leading-tight tracking-[0.05em]">{training.internal_label || training.title}</h3>
              <p className="mt-2 text-xs font-bold text-[#8a6107]">{training.client_name}{training.internal_label ? ` · ${training.title}` : ''}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#666]">
                {formatWindow(session) ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{formatWindow(session)}</span> : null}
                <span className="inline-flex items-center gap-1.5">{training.location}</span>
              </p>
            </div>
          </div>
          <DayRow training={training} session={session} instructors={instrutores} reload={reload} notify={notify} />
        </article>)}
        {doDia.length === 0 ? <EmptyState icon={CalendarDays} title="Nenhuma turma nesta data" text="Escolha outro dia no calendário ou crie um treinamento na aba Criar." /> : null}
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

type Draft = { clientId: string; nr: string; title: string; internalLabel: string; days: NovoDia[]; contentProgram: string; duration: string; location: string };

function diaVazio(instructorId: string | null = null): NovoDia {
  return { date: '', startTime: '08:00', endTime: '18:00', instructorId };
}

function ClientPicker({ clients, value, onChange }: { clients: CompanyDashboardData['clients']; value: string; onChange: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const alvo = busca.trim().toLowerCase();
  const alvoDigitos = digitos(busca);
  const filtrados = useMemo(() => {
    if (!alvo) return clients;
    return clients.filter((client) =>
      `${client.name} ${client.legal_name}`.toLowerCase().includes(alvo)
      || (alvoDigitos.length > 0 && digitos(client.document).includes(alvoDigitos)));
  }, [clients, alvo, alvoDigitos]);

  const escolhido = clients.find((client) => client.id === value);

  return <div>
    <span className={labelClass}>Cliente</span>
    <div className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" />
      <Input aria-label="Buscar cliente por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ" className={`${fieldClass} pl-11`} />
    </div>
    <select aria-label="Cliente do treinamento" required value={value} onChange={(e) => onChange(e.target.value)} size={Math.min(6, Math.max(3, filtrados.length))} className="mt-2 w-full border border-black/16 bg-white p-1 text-sm outline-none focus:border-[#f2ad19]">
      {filtrados.map((client) => <option key={client.id} value={client.id} className="px-2 py-2">{client.name} · {client.document}</option>)}
    </select>
    <p className="mt-2 text-[11px] text-[#888]">{filtrados.length === 0 ? 'Nenhum cliente com esse nome ou CNPJ.' : escolhido ? `Selecionado: ${escolhido.legal_name}` : 'Escolha um cliente na lista.'}</p>
  </div>;
}

function Criar({ data, reload, notify, aoCriar }: { data: CompanyDashboardData; reload: Reload; notify: Notify; aoCriar: (id: string) => void }) {
  const instrutores = data.instructors.filter((item) => item.status === 'active');
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
      const custom = current.contentProgram.trim() !== '' && current.contentProgram !== previous;
      return { ...current, nr, contentProgram: custom ? current.contentProgram : (nrInfo(nr)?.content ?? '') };
    });
  }
  function setDia(index: number, campos: Partial<NovoDia>) {
    setDraft((current) => ({ ...current, days: current.days.map((dia, i) => (i === index ? { ...dia, ...campos } : dia)) }));
  }
  function addDia() {
    // O dia novo repete o horário e o instrutor do anterior: é o caso comum, e
    // trocar um deles é um clique.
    setDraft((current) => {
      const ultimo = current.days[current.days.length - 1];
      return { ...current, days: [...current.days, { date: '', startTime: ultimo?.startTime ?? '08:00', endTime: ultimo?.endTime ?? '18:00', instructorId: ultimo?.instructorId ?? null }] };
    });
  }
  function removeDia(index: number) {
    setDraft((current) => ({ ...current, days: current.days.filter((_, i) => i !== index) }));
  }

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      const result = await createMockTraining(draft);
      aoCriar(result.id);
      setDraft({ ...draft, title: '', internalLabel: '', days: [diaVazio()], contentProgram: nrInfo(draft.nr)?.content ?? '', location: '' });
      notify('Treinamento criado com QR Code próprio.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao criar treinamento.'); }
    finally { setSalvando(false); }
  }

  return <form onSubmit={save} className="max-w-3xl border border-black/10 bg-white p-6 md:p-8">
    <span className="eyebrow text-[#8a6107]">Nova turma</span>
    <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Criar treinamento</h2>
    <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#777]">Cada data vira um dia com instrutor próprio. Pode criar agora e escalar o instrutor depois, na Agenda — é comum a data ser fechada com o cliente antes de haver escala.</p>

    <div className="mt-6 space-y-5">
      <ClientPicker clients={data.clients} value={draft.clientId} onChange={(id) => setDraft({ ...draft, clientId: id })} />

      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
        <label htmlFor="training-nr"><span className={labelClass}>Norma</span>
          <select id="training-nr" value={draft.nr} onChange={(e) => changeNr(e.target.value)} className={selectClass}>{NORMAS.map((nr) => <option key={nr}>{nr}</option>)}</select>
        </label>
        <label htmlFor="training-title"><span className={labelClass}>Título no certificado</span>
          <Input id="training-title" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Treinamento de Brigada de Incêndio - Intermediário" className={fieldClass} />
        </label>
      </div>

      <label htmlFor="training-label"><span className={labelClass}>Identificação da turma</span>
        <Input id="training-label" value={draft.internalLabel} onChange={(e) => setDraft({ ...draft, internalLabel: e.target.value })} placeholder="Ex.: Turma A - manhã" className={fieldClass} />
        <span className="mt-2 block text-[11px] leading-relaxed text-[#888]">Só para vocês separarem duas turmas do mesmo treinamento na agenda e nas listas. <strong>Não aparece em nenhum documento.</strong></span>
      </label>

      <fieldset className="border border-black/12 p-4">
        <legend className="px-2 text-[10px] font-extrabold uppercase tracking-[0.12em]">Dias do treinamento</legend>
        <div className="space-y-3">{draft.days.map((dia, index) => <div key={index} className="grid gap-2 border-l-4 border-[#f2ad19] bg-[#fffdf7] p-3 sm:grid-cols-[auto_1fr_auto_auto_auto]">
          <span className="self-center text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] sm:w-12">Dia {index + 1}</span>
          <Input required type="date" aria-label={`Data do dia ${index + 1}`} value={dia.date} onChange={(e) => setDia(index, { date: e.target.value })} className={fieldClass} />
          <Input type="time" aria-label={`Início do dia ${index + 1}`} value={dia.startTime} onChange={(e) => setDia(index, { startTime: e.target.value })} className={`${fieldClass} sm:w-28`} />
          <Input type="time" aria-label={`Fim do dia ${index + 1}`} value={dia.endTime} onChange={(e) => setDia(index, { endTime: e.target.value })} className={`${fieldClass} sm:w-28`} />
          {draft.days.length > 1 ? <button type="button" onClick={() => removeDia(index)} aria-label={`Remover o dia ${index + 1}`} className="flex size-12 shrink-0 items-center justify-center border border-black/15 bg-white text-[#777] hover:border-[#b62525] hover:text-[#b62525]"><X className="size-4" /></button> : <span className="hidden sm:block sm:size-12" />}
          <span className="block sm:col-span-5">
            <select aria-label={`Instrutor do dia ${index + 1}`} value={dia.instructorId ?? ''} onChange={(e) => setDia(index, { instructorId: e.target.value || null })} className={selectClass}>
              <option value="">Sem instrutor — escalar depois</option>
              {instrutores.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.specialties}</option>)}
            </select>
          </span>
        </div>)}</div>
        <button type="button" onClick={addDia} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] hover:text-black"><Plus className="size-4" />Adicionar dia</button>
        <p className="mt-3 text-[11px] leading-relaxed text-[#888]">A lista de presença é impressa no 1º dia com uma coluna de assinatura por data. A foto dela é cobrada no último dia, na hora de encerrar.</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor="training-duration"><span className={labelClass}>Carga horária</span>
          <Input id="training-duration" required value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className={fieldClass} />
        </label>
        <label htmlFor="training-location"><span className={labelClass}>Endereço do treinamento</span>
          <Input id="training-location" required value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Rua, número, bairro e cidade" className={fieldClass} />
        </label>
      </div>

      <label htmlFor="training-content"><span className={labelClass}>Conteúdo programático (aparece na lista)</span>
        <textarea id="training-content" rows={4} value={draft.contentProgram} onChange={(e) => setDraft({ ...draft, contentProgram: e.target.value })} placeholder="Tópicos do treinamento (aparecem na faixa da lista de presença)." className="w-full border border-black/16 bg-white p-3 text-sm outline-none focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/30" />
      </label>
    </div>

    <Button disabled={data.clients.length === 0 || salvando} type="submit" className="mt-6 h-13 w-full rounded-none bg-[#f2ad19] text-[11px] font-extrabold uppercase tracking-[0.1em] text-black hover:bg-[#ff9900] sm:w-auto sm:px-8">
      {salvando ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}Criar treinamento e QR
    </Button>
    {data.clients.length === 0 ? <p className="mt-3 text-xs font-bold text-[#8a6107]">Cadastre um cliente antes de criar a turma.</p> : null}
  </form>;
}

// ---------------------------------------------------------------------------

export function CompanyTrainings({ data, reload, notify }: { data: CompanyDashboardData; reload: Reload; notify: Notify }) {
  const [aba, setAba] = useState<Aba>('agenda');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'scheduled' | 'in_progress' | 'sem_instrutor'>('todos');
  const [aberta, setAberta] = useState<string | null>(null);
  const [criada, setCriada] = useState<string | null>(null);

  const instrutores = data.instructors.filter((item) => item.status === 'active');
  const alvo = busca.trim().toLowerCase();
  const casaBusca = (training: CompanyTraining) => !alvo || `${training.title} ${training.internal_label} ${training.nr} ${training.client_name} ${training.code}`.toLowerCase().includes(alvo);
  // Concluídas ficam fora da agenda e da lista: têm aba própria.
  const abertas = useMemo(() => data.trainings.filter((training) => training.status !== 'completed'), [data.trainings]);
  const concluidas = useMemo(
    () => data.trainings.filter((training) => training.status === 'completed').sort((a, b) => dataDaTurma(b).localeCompare(dataDaTurma(a))),
    [data.trainings],
  );
  const filtradas = abertas.filter((training) => {
    if (!casaBusca(training)) return false;
    if (filtro === 'todos') return true;
    if (filtro === 'sem_instrutor') return (training.sessions ?? []).some((dia) => !dia.instructor_id);
    return training.status === filtro;
  });
  const agora = new Date();
  const hojeIso = isoFromDate(agora);
  const emUmaSemana = isoFromDate(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 7));
  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    turmas: filtradas.filter((training) => {
      const dia = dataDaTurma(training);
      if (grupo.id === 'atrasadas') return dia < hojeIso;
      if (grupo.id === 'hoje') return dia === hojeIso;
      if (grupo.id === 'semana') return dia > hojeIso && dia <= emUmaSemana;
      return dia > emUmaSemana;
    }).sort((a, b) => dataDaTurma(a).localeCompare(dataDaTurma(b))),
  })).filter((grupo) => grupo.turmas.length > 0);
  const concluidasFiltradas = concluidas.filter(casaBusca);

  // Turmas que já receberam a foto da lista assinada: muda o texto da cobrança.
  const turmasComLista = useMemo(
    () => new Set(data.files.filter((file) => file.kind === 'attendance').map((file) => file.training_id)),
    [data.files],
  );
  const semEscala = abertas.filter((training) => (training.sessions ?? []).some((dia) => !dia.instructor_id)).length;
  const nova = criada ? data.trainings.find((item) => item.id === criada) : undefined;
  const linha = (training: CompanyTraining) => <TrainingRow key={training.id} training={training} clients={data.clients} instructors={instrutores} faltaLista={!turmasComLista.has(training.id)} reload={reload} notify={notify}
    aberta={aberta === training.id} alternar={() => setAberta((atual) => (atual === training.id ? null : training.id))} />;

  return <div className="space-y-6">
    <SubTabs label="Seções de treinamentos" active={aba} onChange={(id) => setAba(id)} tabs={[
      { id: 'agenda', label: 'Agenda' },
      { id: 'lista', label: 'Em aberto', count: abertas.length },
      { id: 'concluidas', label: 'Concluídas', count: concluidas.length },
      { id: 'criar', label: 'Criar' },
    ]} />

    {semEscala > 0 && aba !== 'criar' && aba !== 'concluidas' ? <button type="button" onClick={() => { setAba('lista'); setFiltro('sem_instrutor'); }} className="flex w-full items-center gap-3 border-l-4 border-[#b62525] bg-[#fff5f5] p-4 text-left hover:bg-[#ffecec]">
      <AlertTriangle className="size-5 shrink-0 text-[#b62525]" />
      <span className="text-xs font-bold text-[#b62525]">{semEscala === 1 ? '1 turma tem dia sem instrutor escalado.' : `${semEscala} turmas têm dias sem instrutor escalado.`} Ver quais →</span>
    </button> : null}

    {aba === 'agenda' ? <Agenda data={data} reload={reload} notify={notify} /> : null}

    {aba === 'lista' ? <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" /><Input aria-label="Buscar turma" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, cliente, NR ou código" className={`${fieldClass} pl-11`} /></div>
        <label className="sm:w-64" htmlFor="turmas-filtro"><span className="sr-only">Filtrar por situação</span>
          <select id="turmas-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={selectClass}>
            <option value="todos">Todas as situações</option>
            <option value="scheduled">Agendadas</option>
            <option value="in_progress">Em andamento</option>

            <option value="sem_instrutor">Sem instrutor escalado</option>
          </select>
        </label>
      </div>
      {grupos.map((grupo) => <section key={grupo.id} className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black pb-2 pt-3">
          <h3 className={`text-sm font-extrabold uppercase tracking-[0.08em] ${grupo.id === 'atrasadas' ? 'text-[#b62525]' : ''}`}>{grupo.titulo}</h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#777]">{grupo.turmas.length === 1 ? '1 turma' : `${grupo.turmas.length} turmas`}{grupo.texto ? ` · ${grupo.texto}` : ''}</span>
        </div>
        {grupo.turmas.map(linha)}
      </section>)}
      {filtradas.length === 0 ? <EmptyState icon={CalendarPlus} title="Nenhuma turma em aberto" text={abertas.length === 0 ? 'Crie uma turma na aba Criar. As encerradas ficam em Concluídas.' : 'Ajuste a busca ou o filtro de situação.'} /> : null}
    </div> : null}

    {aba === 'concluidas' ? <div className="space-y-4">
      <div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" /><Input aria-label="Buscar turma concluída" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, cliente, NR ou código" className={`${fieldClass} pl-11`} /></div>
      <p className="text-xs text-[#777]">Turmas encerradas, da mais recente para a mais antiga. Abra uma para ver ou editar dados, dias e documentos.</p>
      {concluidasFiltradas.map(linha)}
      {concluidasFiltradas.length === 0 ? <EmptyState icon={Check} title="Nenhuma turma concluída" text={concluidas.length === 0 ? 'A turma aparece aqui quando o último dia é encerrado.' : 'Ajuste a busca.'} /> : null}
    </div> : null}

    {aba === 'criar' ? <div className="space-y-4">
      {nova ? <div className="border-l-4 border-[#25D366] bg-black p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow text-[#25D366]">Turma criada</span>
            <h3 className="mt-2 text-lg font-extrabold uppercase leading-tight tracking-[0.05em]">{nova.nr} · {nova.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/60">{(nova.sessions ?? []).some((dia) => !dia.instructor_id) ? 'Escale o instrutor de cada dia na Agenda — de lá você também avisa cada um pelo WhatsApp.' : 'Instrutores escalados. Avise cada um pela Agenda.'}</p>
          </div>
          <button type="button" onClick={() => setCriada(null)} aria-label="Fechar aviso" className="shrink-0 text-white/40 hover:text-white"><X className="size-4" /></button>
        </div>
        <button type="button" onClick={() => { setAba('agenda'); setCriada(null); }} className="mt-4 inline-flex h-12 items-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]"><CalendarDays className="size-4" />Abrir na agenda</button>
      </div> : null}
      <Criar data={data} reload={reload} notify={notify} aoCriar={setCriada} />
    </div> : null}
  </div>;
}
