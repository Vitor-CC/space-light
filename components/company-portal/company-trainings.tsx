'use client';

import { AlertTriangle, Award, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronRight, Circle, Clock3, Download, FileText, ImageIcon, Loader2, MessageCircle, Pencil, Plus, Search, Signature, Trash2, Upload, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { dateFromIso, formatDate, formatDayMonth, formatWindow, isoFromDate } from '@/components/company-portal/company-ui';
import { areaClasses, Avatar, Botao, botaoClasses, BotaoIcone, Campo, campoClasses, Cartao, Chip, Faixa, Pilula, selectClasses, tabelaClasses as tb, Tag, TopoDePagina, Vazio, type Tom } from '@/components/ds/base';
import { Interruptor, PainelLateral, Segmentado } from '@/components/ds/interativo';
import { Calendar } from '@/components/ui/calendar';
import type { CompanyDashboardData, CompanyInstructor, CompanyTraining, TrainingSession } from '@/lib/company-types';
import { addTrainingDay, completeTrainingByCompany, createMockTraining, deleteTraining, generateCertificates, readInstructorDocuments, removeTrainingDay, renameTraining, saveProgramTemplate, updateTrainingDay, updateTrainingDetails, uploadCompanyFiles } from '@/lib/mock-company-database';
import type { NovoDia } from '@/lib/mock-company-database';
import { dataDoDia as dataDaTurma, proximoDiaDaTurma as proximoDia } from '@/lib/dias-da-turma';
import { nrInfo } from '@/lib/nr-catalog';
import { cargaHorariaPadrao } from '@/lib/nr-programs';
import { scheduleWindow, trainingReminderMessage, trainingScheduleMessage, whatsappLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;
type Vista = 'tabela' | 'agenda';
type Filtro = 'todas' | 'scheduled' | 'in_progress' | 'atrasadas' | 'sem_instrutor' | 'aguardando' | 'completed';

// NR 13, 15 e 16 são só laudo: não entram aqui (decisão de 27/09/2026).
const NORMAS = ['NR 05', 'NR 06', 'NR 07', 'NR 07 LEI LUCAS', 'NR 10', 'NR 10 SEP', 'NR 11', 'NR 12', 'NR 18', 'NR 20', 'NR 23', 'NR 26', 'NR 31', 'NR 33', 'NR 34', 'NR 35', 'EMERGÊNCIAS QUÍMICAS'];
/** Validade oferecida no cadastro e na emissão. Só aparece no portal; o PDF não muda. */
const VALIDADES = [0, 6, 12, 24, 36, 48, 60];

/** Só dígitos: o CNPJ é digitado com e sem pontuação, e as duas têm de achar. */
function digitos(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

function rotuloValidade(meses: number, aPartirDe?: string) {
  if (!meses) return 'Não informada';
  return `${meses} meses${aPartirDe ? ` a partir de ${formatDate(aPartirDe)}` : ''}`;
}

/**
 * Situação da turma para a tabela, nos tons do Figma (18:188): em andamento
 * azul, aguardando certificados âmbar, agendada neutra e sem instrutor vermelha.
 * "Dia vencido" não está no desenho e fica vermelho também.
 */
export function situacaoDaTurma(training: CompanyTraining, hojeIso: string): { tom: Tom; texto: string } {
  if (training.status === 'completed') {
    return training.certificate_generated_at ? { tom: 'sucesso', texto: 'Concluída' } : { tom: 'atencao', texto: 'Aguardando certificados' };
  }
  if (dataDaTurma(training) < hojeIso) return { tom: 'perigo', texto: 'Dia vencido' };
  if (training.status === 'in_progress') return { tom: 'info', texto: 'Em andamento' };
  if ((training.sessions ?? []).some((dia) => !dia.instructor_id)) return { tom: 'perigo', texto: 'Sem instrutor' };
  return { tom: 'neutro', texto: 'Agendada' };
}

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
        theme: training.theme,
      }))
    : null;

  return <div className={cn('flex flex-col gap-3 border-t border-ds-borda py-4', encerrado && 'opacity-80')}>
    <div className="flex flex-wrap items-center gap-2">
      <span className="whitespace-nowrap ds-caps text-ds-texto-2">Dia {session.day_number} de {total}</span>
      {encerrado ? <Tag tom="sucesso">Encerrado</Tag> : session.status === 'in_progress' ? <Tag tom="atencao">Em andamento</Tag> : null}
      {salvando ? <Loader2 className="size-4 animate-spin text-ds-amarelo-texto" /> : null}
      <div className="ml-auto flex items-center gap-2">
        {!encerrado && aviso ? <a href={aviso} target="_blank" rel="noreferrer" className={botaoClasses('fantasma', 'P')}><MessageCircle />Avisar</a> : null}
        {total > 1 ? <BotaoIcone rotulo={`Remover o dia ${session.day_number}`} tom="perigo" className="size-9" onClick={() => void removerDia()} disabled={salvando}><X /></BotaoIcone> : null}
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="date" aria-label={`Data do dia ${session.day_number}`} disabled={salvando} value={session.session_date} onChange={(e) => void salvar({ sessionDate: e.target.value })} className={campoClasses} />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" aria-label={`Início do dia ${session.day_number}`} disabled={salvando} value={session.start_time} onChange={(e) => void salvar({ startTime: e.target.value })} className={campoClasses} />
        <input type="time" aria-label={`Fim do dia ${session.day_number}`} disabled={salvando} value={session.end_time} onChange={(e) => void salvar({ endTime: e.target.value })} className={campoClasses} />
      </div>
      <select aria-label={`Instrutor do dia ${session.day_number}`} disabled={salvando} value={session.instructor_id ?? ''} onChange={(e) => void salvar({ instructorId: e.target.value || null })} aria-invalid={!session.instructor_id} className={cn(selectClasses, 'sm:col-span-2', !session.instructor_id && 'text-ds-perigo')}>
        <option value="">Sem instrutor — escalar depois</option>
        {instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
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

  if (!aberto) return <div className="border-t border-ds-borda pt-3"><button type="button" onClick={() => setAberto(true)} className={botaoClasses('link', 'P')}><Plus />Adicionar dia</button></div>;
  return <form onSubmit={salvar} className="flex flex-col gap-2 rounded-lg border-t border-ds-borda bg-ds-amarelo-suave/50 p-3">
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input required type="date" aria-label="Data do novo dia" value={dia.date} onChange={(e) => setDia({ ...dia, date: e.target.value })} className={campoClasses} />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" aria-label="Início do novo dia" value={dia.startTime} onChange={(e) => setDia({ ...dia, startTime: e.target.value })} className={campoClasses} />
        <input type="time" aria-label="Fim do novo dia" value={dia.endTime} onChange={(e) => setDia({ ...dia, endTime: e.target.value })} className={campoClasses} />
      </div>
      <select aria-label="Instrutor do novo dia" value={dia.instructorId ?? ''} onChange={(e) => setDia({ ...dia, instructorId: e.target.value || null })} className={cn(selectClasses, 'sm:col-span-2')}>
        <option value="">Sem instrutor — escalar depois</option>
        {instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
    <div className="flex gap-2"><Botao type="submit" tamanho="P" disabled={salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Plus />}Adicionar</Botao><Botao tipo="fantasma" tamanho="P" onClick={() => setAberto(false)}>Cancelar</Botao></div>
  </form>;
}

type DadosTreinamento = { clientId: string; nr: string; title: string; duration: string; location: string; contentProgram: string; theme: string; kind: string; validityMonths: number };

const ROTULO_DO_TIPO: Record<string, string> = { formacao: 'Formação', reciclagem: 'Reciclagem' };

/**
 * Conteúdo programático que a norma sugere: o salvo pela equipe, se houver;
 * senão o do catálogo (`nr-catalog.ts`).
 */
function conteudoPadrao(data: CompanyDashboardData, nr: string) {
  return data.programTemplates.find((p) => p.nr === nr)?.content ?? nrInfo(nr)?.content ?? '';
}

/** Campo do conteúdo programático com "Salvar como padrão" da norma, para as próximas turmas. */
function CampoConteudo({ data, nr, valor, onChange, reload, notify }: { data: CompanyDashboardData; nr: string; valor: string; onChange: (v: string) => void; reload: Reload; notify: Notify }) {
  const [salvando, setSalvando] = useState(false);
  const salvo = data.programTemplates.find((p) => p.nr === nr);
  const padrao = conteudoPadrao(data, nr);
  const diferente = valor.trim() !== padrao.trim();
  async function salvarPadrao() {
    if (salvo && !window.confirm(`Substituir o conteúdo padrão da ${nr}? As turmas já criadas não mudam; só as próximas usam o novo.`)) return;
    setSalvando(true);
    try { await saveProgramTemplate(nr, valor); notify(`Conteúdo salvo como padrão da ${nr}. As próximas turmas dessa norma já vêm com ele.`); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o conteúdo padrão.'); }
    finally { setSalvando(false); }
  }
  const origem = salvo
    ? `Padrão da ${nr} salvo pela equipe${salvo.updated_by_name ? ` (${salvo.updated_by_name})` : ''} em ${formatDate(salvo.updated_at)}.`
    : padrao ? `Padrão do sistema para a ${nr}.` : `A ${nr} ainda não tem conteúdo padrão.`;
  return <div className="flex flex-col gap-2">
    <Campo rotulo="Conteúdo programático (aparece na lista)"><textarea rows={5} value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Tópicos do treinamento." className={areaClasses} /></Campo>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="min-w-0 flex-1 ds-caption text-ds-texto-2">{diferente ? 'Editado nesta turma. ' : ''}{origem}</span>
      {diferente && padrao ? <button type="button" onClick={() => onChange(padrao)} className={botaoClasses('link', 'P', 'min-h-0 py-1')}>Voltar ao padrão</button> : null}
      <Botao tamanho="P" tipo="secundario" disabled={salvando || !diferente || !valor.trim()} onClick={() => void salvarPadrao()}>{salvando ? <Loader2 className="animate-spin" /> : <Check />}Salvar como padrão da {nr}</Botao>
    </div>
  </div>;
}

/** O que sai no certificado e na lista: cliente, norma, título, carga horária, endereço e conteúdo. */
function TrainingDetails({ training, data, reload, notify }: { training: CompanyTraining; data: CompanyDashboardData; reload: Reload; notify: Notify }) {
  const clients = data.clients;
  const inicial = (): DadosTreinamento => ({ clientId: training.client_id, nr: training.nr, title: training.title, duration: training.duration, location: training.location, contentProgram: training.content_program ?? '', theme: training.theme ?? '', kind: training.kind ?? '', validityMonths: training.validity_months ?? 0 });
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
        ? 'Dados salvos. A turma já foi encerrada: gere os certificados de novo para refletir a mudança.'
        : 'Dados do treinamento salvos.');
      setAberto(false);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o treinamento.'); }
    finally { setSalvando(false); }
  }

  if (!aberto) return <dl className="grid gap-x-4 gap-y-2 ds-body-s sm:grid-cols-[140px_1fr]">
    <dt className="text-ds-texto-2">Título no certificado</dt><dd className="font-medium">{training.title}</dd>
    <dt className="text-ds-texto-2">Tipo</dt><dd>{ROTULO_DO_TIPO[training.kind ?? ''] ?? 'Não informado'}</dd>
    <dt className="text-ds-texto-2">Carga horária</dt><dd>{training.duration || '—'}</dd>
    <dt className="text-ds-texto-2">Endereço</dt><dd>{training.location || '—'}</dd>
    <dt className="text-ds-texto-2">Validade</dt><dd>{rotuloValidade(training.validity_months ?? 0)}</dd>
    {training.theme ? <><dt className="text-ds-texto-2">Tema</dt><dd>{training.theme}</dd></> : null}
    <dd className="sm:col-span-2"><button type="button" onClick={() => { setDraft(inicial()); setAberto(true); }} className={botaoClasses('fantasma', 'P', 'mt-1')}><Pencil />Editar dados do treinamento</button></dd>
  </dl>;

  return <form onSubmit={salvar} className="flex flex-col gap-4 rounded-lg border border-ds-borda p-4">
    <ClientPicker clients={clients} value={draft.clientId} onChange={(id) => setDraft({ ...draft, clientId: id })} />
    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
      <Campo rotulo="Norma"><select value={draft.nr} onChange={(e) => setDraft({ ...draft, nr: e.target.value })} className={selectClasses}>{normas.map((nr) => <option key={nr}>{nr}</option>)}</select></Campo>
      <Campo rotulo="Título no certificado"><input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={campoClasses} /></Campo>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Campo rotulo="Tipo"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={selectClasses}>{draft.kind === '' ? <option value="">Não informado</option> : null}<option value="formacao">Formação</option><option value="reciclagem">Reciclagem</option></select></Campo>
      <Campo rotulo="Carga horária"><input required value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className={campoClasses} /></Campo>
      <Campo rotulo="Validade do certificado" ajuda="Só no portal do cliente; o PDF não muda."><select value={draft.validityMonths} onChange={(e) => setDraft({ ...draft, validityMonths: Number(e.target.value) })} className={selectClasses}>{VALIDADES.map((m) => <option key={m} value={m}>{rotuloValidade(m)}</option>)}</select></Campo>
    </div>
    <Campo rotulo="Endereço do treinamento"><input required value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={campoClasses} /></Campo>
    <Campo rotulo="Tema da turma" ajuda="Vai na mensagem de escala do instrutor. Não aparece em nenhum documento."><input value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })} placeholder="Ex.: Reciclagem para a equipe de manutenção" className={campoClasses} /></Campo>
    <CampoConteudo data={data} nr={draft.nr} valor={draft.contentProgram} onChange={(contentProgram) => setDraft({ ...draft, contentProgram })} reload={reload} notify={notify} />
    <div className="flex flex-wrap gap-2"><Botao type="submit" disabled={salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Check />}Salvar dados</Botao><Botao tipo="fantasma" onClick={() => setAberto(false)}>Cancelar</Botao></div>
  </form>;
}

function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return <section className="flex flex-col gap-3 border-b border-ds-borda pb-5">
    <div className="flex items-center gap-2"><h3 className="flex-1 ds-caps text-ds-texto-2">{titulo}</h3>{acao}</div>
    {children}
  </section>;
}

/** Local da turma pelo endereço gravado: não há campo próprio para a modalidade. */
function localDaTurma(training: CompanyTraining) {
  return /centro de treinamento/i.test(training.location) ? 'Centro de treinamento' : 'In company';
}

/** Linha do "Andamento" da ficha (Figma 78:1053): ícone, item, número e sinal de pronto. */
function LinhaAndamento({ icone, titulo, valor, pronto }: { icone: ReactNode; titulo: string; valor: string; pronto: boolean }) {
  return <div className="flex items-center gap-2.5 border-b border-ds-borda py-2.5 [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0">
    {icone}
    <span className="min-w-0 flex-1 ds-body-s font-medium">{titulo}</span>
    <span className="ds-caption text-ds-texto-2">{valor}</span>
    {pronto ? <CheckCircle2 className="size-4 shrink-0 text-ds-sucesso" aria-label="Pronto" /> : <Clock3 className="size-4 shrink-0 text-ds-texto-2" aria-label="Pendente" />}
  </div>;
}

/** Topo da ficha no desenho do Figma: etiquetas e o andamento da turma, só leitura. */
function AndamentoDaTurma({ training, data, hojeIso }: { training: CompanyTraining; data: CompanyDashboardData; hojeIso: string }) {
  const situacao = situacaoDaTurma(training, hojeIso);
  const inscritos = data.participants.filter((p) => p.training_id === training.id);
  const concluida = training.status === 'completed';
  // A chamada é do dia em curso (ou do próximo); turma encerrada mostra o último dia.
  const dia = concluida ? training.sessions[training.sessions.length - 1] : proximoDia(training) ?? training.sessions[training.sessions.length - 1];
  const presentes = dia ? new Set(data.attendance.filter((a) => a.session_id === dia.id).map((a) => a.participant_id)).size : 0;
  const fotos = data.files.filter((f) => f.training_id === training.id && f.kind === 'photo').length;
  const listas = data.files.filter((f) => f.training_id === training.id && f.kind === 'attendance').length;
  const emitidos = Boolean(training.certificate_generated_at);
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap gap-2">
      <Tag tom={situacao.tom}>{situacao.texto}</Tag>
      {ROTULO_DO_TIPO[training.kind ?? ''] ? <Tag tom="neutro">{ROTULO_DO_TIPO[training.kind ?? '']}</Tag> : null}
      <Tag tom="neutro">{localDaTurma(training)}</Tag>
    </div>
    <div className="flex flex-col gap-1">
      <span className="ds-caps text-ds-texto-2">Andamento</span>
      <div>
        <LinhaAndamento icone={<UsersRound />} titulo={training.sessions.length > 1 && dia ? `Chamada · dia ${dia.day_number}` : 'Chamada'} valor={inscritos.length ? `${presentes} de ${inscritos.length}` : 'Ninguém inscrito'} pronto={inscritos.length > 0 && presentes >= inscritos.length} />
        <LinhaAndamento icone={<ImageIcon />} titulo="Fotos" valor={fotos ? `${fotos} ${fotos === 1 ? 'enviada' : 'enviadas'}` : 'Nenhuma'} pronto={fotos > 0} />
        <LinhaAndamento icone={<Signature />} titulo="Lista assinada" valor={listas ? `${listas} ${listas === 1 ? 'arquivo' : 'arquivos'}` : 'Pendente'} pronto={listas > 0} />
        <LinhaAndamento icone={<Award />} titulo="Certificados" valor={emitidos ? `Emitidos em ${formatDayMonth((training.certificate_generated_at as string).slice(0, 10))}` : concluida ? 'Aguardando emissão' : 'Após encerrar'} pronto={emitidos} />
      </div>
    </div>
  </div>;
}

/** Ficha da turma no painel lateral: dias, dados, identificação e ações. */
function FichaDaTurma({ training, data, instructors, reload, notify, emitir, aoExcluir }: { training: CompanyTraining; data: CompanyDashboardData; instructors: CompanyInstructor[]; reload: Reload; notify: Notify; emitir: () => void; aoExcluir: () => void }) {
  const [ocupado, setOcupado] = useState('');
  // O que falta confirmar sem a lista: a turma inteira ou um dia só.
  const [confirmarSemLista, setConfirmarSemLista] = useState<{ mensagem: string; sessionId?: string } | null>(null);
  const [identificacao, setIdentificacao] = useState(training.internal_label);
  const concluido = training.status === 'completed';
  const faltaLista = !data.files.some((file) => file.kind === 'attendance' && file.training_id === training.id);

  // Quem ainda deve alguma coisa: instrutor de dia não encerrado. O link do
  // WhatsApp é montado aqui mesmo, sem passar pelo servidor.
  const devedores = [...new Map((training.sessions ?? [])
    .filter((dia) => dia.status !== 'completed' && dia.instructor_id)
    .map((dia) => [dia.instructor_id as string, dia]))
    .values()]
    .map((dia) => {
      const instrutor = instructors.find((item) => item.id === dia.instructor_id);
      const url = instrutor?.phone
        ? whatsappLink(instrutor.phone, trainingReminderMessage({ instructorName: instrutor.name, nr: training.nr, title: training.title, clientName: training.client_name, dateLabel: formatDate(dia.session_date), faltaLista }))
        : null;
      return { nome: instrutor?.name ?? 'Instrutor', url };
    });
  const cobraveisPorWhats = devedores.filter((item) => item.url);

  async function encerrar(semLista: boolean, sessionId?: string) {
    setOcupado('encerrando');
    try {
      const resultado = await completeTrainingByCompany(training.id, semLista, sessionId);
      if (resultado.needsConfirmation) { setConfirmarSemLista({ mensagem: resultado.message || 'A foto da lista de presença assinada ainda não foi enviada.', sessionId }); return; }
      setConfirmarSemLista(null);
      const dia = sessionId ? training.sessions.find((item) => item.id === sessionId) : undefined;
      if (dia && !resultado.turmaConcluida) notify(`Dia ${dia.day_number} encerrado.`);
      else notify(resultado.certificatePublished
        ? `Turma encerrada. ${resultado.certificates} certificado(s) emitidos e arquivados nos documentos.`
        : `Turma encerrada, mas os documentos não foram gerados: ${resultado.certificateProblem ?? 'motivo desconhecido'}.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao encerrar a turma.'); }
    finally { setOcupado(''); }
  }

  // A equipe pode enviar a lista no lugar do instrutor (foto ou PDF escaneado).
  async function enviarLista(arquivos: File[]) {
    if (!arquivos.length) return;
    setOcupado('lista');
    try {
      const ultimoDia = training.sessions[training.sessions.length - 1];
      const resultado = await uploadCompanyFiles({ clientId: training.client_id, trainingId: training.id, kind: 'attendance', files: arquivos, sessionId: ultimoDia?.id });
      if (!resultado.saved) notify('A lista não foi enviada. Use foto (JPG, PNG, HEIC) ou PDF.');
      else if (resultado.rejected.length) notify(`Lista enviada, mas ${resultado.rejected.join(', ')} ficou de fora. Use foto (JPG, PNG, HEIC) ou PDF.`);
      else notify(resultado.saved === 1 ? 'Lista assinada enviada.' : `${resultado.saved} páginas da lista assinada enviadas.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao enviar a lista.'); }
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
    try { await deleteTraining(training.id); notify('Treinamento excluído.'); aoExcluir(); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o treinamento.'); }
  }

  const listas = data.files.filter((file) => file.kind === 'attendance' && file.training_id === training.id);
  const totalDias = training.sessions.length;
  const nomeDoInstrutor = (id: string | null) => instructors.find((item) => item.id === id)?.name ?? 'Sem instrutor';
  const encerrando = ocupado === 'encerrando';

  return <div className="flex flex-col gap-6">
    <AndamentoDaTurma training={training} data={data} hojeIso={isoFromDate(new Date())} />

    {/* Em destaque no topo: a lista assinada e o encerramento, que é o que a
        equipe mais procura na ficha. Turma encerrada sem lista continua
        mostrando o envio, porque a lista ainda pode chegar depois. */}
    {!concluido || faltaLista ? <section aria-labelledby={`encerramento-${training.id}`} className="flex flex-col gap-4 rounded-[10px] border border-ds-borda bg-ds-muted p-4 sm:p-5">
      <h3 id={`encerramento-${training.id}`} className="ds-h4">{concluido ? 'Lista assinada' : 'Encerramento da turma'}</h3>

      {confirmarSemLista ? <Faixa tom="perigo" titulo="Encerrar sem a lista assinada?" acao={<div className="flex gap-2"><Botao tipo="fantasma" tamanho="P" onClick={() => setConfirmarSemLista(null)}>Cancelar</Botao><Botao tipo="perigo" tamanho="P" onClick={() => void encerrar(true, confirmarSemLista.sessionId)} disabled={encerrando}>{encerrando ? <Loader2 className="animate-spin" /> : <Check />}Encerrar assim mesmo</Botao></div>}>{confirmarSemLista.mensagem} Os certificados saem mesmo assim e a ressalva fica registrada na Atividade com o seu nome.</Faixa> : null}

      <div className={cn('flex flex-col gap-4 rounded-lg border-2 bg-ds-superficie p-4 sm:flex-row sm:items-center', faltaLista ? 'border-ds-perigo' : 'border-ds-sucesso')}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><FileText className="size-5 shrink-0" /><strong className="ds-body-m font-semibold">Lista de presença assinada</strong><Tag tom={faltaLista ? 'perigo' : 'sucesso'}>{faltaLista ? 'Não enviada' : 'Enviada'}</Tag></div>
          <p className="mt-1.5 ds-body-s text-ds-texto-2">{faltaLista
            ? 'Obrigatória para encerrar o último dia. Se o instrutor não enviou, envie aqui a foto ou o PDF escaneado.'
            : `${listas.length} ${listas.length === 1 ? 'arquivo enviado' : 'arquivos enviados'}. Se faltou alguma página, envie as que faltam.`}</p>
        </div>
        <label className={botaoClasses(faltaLista ? 'primario' : 'secundario', 'L', cn('shrink-0', ocupado ? 'pointer-events-none opacity-60' : 'cursor-pointer'))}>
          {ocupado === 'lista' ? <Loader2 className="animate-spin" /> : <Upload />}{faltaLista ? 'Enviar lista assinada' : 'Enviar mais páginas'}
          <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => { const arquivos = [...(e.currentTarget.files ?? [])]; e.currentTarget.value = ''; void enviarLista(arquivos); }} />
        </label>
      </div>

      {!concluido && totalDias > 1 ? <div className="flex flex-col gap-2">
        <span className="ds-caps text-ds-texto-2">Encerrar um dia de cada vez</span>
        {training.sessions.map((dia) => <div key={dia.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ds-borda bg-ds-superficie px-4 py-3">
          <div className="min-w-0 flex-1">
            <strong className="block ds-body-s font-semibold">Dia {dia.day_number} de {totalDias} · {formatDate(dia.session_date)}</strong>
            <span className="block truncate ds-caption text-ds-texto-2">{nomeDoInstrutor(dia.instructor_id)}</span>
          </div>
          {dia.status === 'completed'
            ? <Tag tom="sucesso">Encerrado</Tag>
            : <Botao tipo="escuro" onClick={() => void encerrar(false, dia.id)} disabled={Boolean(ocupado)}>{encerrando ? <Loader2 className="animate-spin" /> : <Check />}Encerrar dia {dia.day_number}</Botao>}
        </div>)}
      </div> : null}

      {!concluido ? <div className="flex flex-col gap-3 border-t border-ds-borda pt-4 sm:flex-row sm:items-center">
        <Botao tamanho="L" className="shrink-0" onClick={() => void encerrar(false)} disabled={Boolean(ocupado)}>{encerrando ? <Loader2 className="animate-spin" /> : <Check />}{totalDias > 1 ? 'Encerrar a turma inteira' : 'Encerrar turma'}</Botao>
        <p className="ds-caption text-ds-texto-2">{totalDias > 1 ? 'Fecha todos os dias abertos de uma vez e emite os certificados.' : 'Fecha a turma e emite os certificados.'}</p>
      </div> : null}
    </section> : null}

    {concluido || cobraveisPorWhats.length > 0 || devedores.length > 0 ? <Secao titulo="Ações">
      <div className="flex flex-wrap gap-2">
        {concluido ? <Botao onClick={emitir}><Award />{training.certificate_generated_at ? 'Certificados' : 'Emitir certificados'}</Botao> : null}
        {!concluido ? cobraveisPorWhats.map((item) => <a key={item.nome} href={item.url as string} target="_blank" rel="noreferrer" className={botaoClasses('fantasma', 'M')}><MessageCircle />{cobraveisPorWhats.length > 1 ? `Cobrar ${item.nome.split(' ')[0]}` : 'Cobrar no WhatsApp'}</a>) : null}
      </div>
      {devedores.length > 0 && devedores.every((item) => !item.url) && !concluido ? <p className="ds-caption text-ds-texto-2">Sem telefone no cadastro do instrutor não dá para cobrar por WhatsApp: inclua o número em Instrutores.</p> : null}
    </Secao> : null}

    <Secao titulo={`Datas, horários e instrutores · ${totalDias} ${totalDias === 1 ? 'dia' : 'dias'}`}>
      <div>{training.sessions.map((dia) => <DayRow key={dia.id} training={training} session={dia} instructors={instructors} reload={reload} notify={notify} />)}</div>
      <AddDay training={training} instructors={instructors} reload={reload} notify={notify} />
    </Secao>

    <Secao titulo="Dados do treinamento"><TrainingDetails training={training} data={data} reload={reload} notify={notify} /></Secao>

    <Secao titulo="Identificação da turma">
      <Campo rotulo="Nome interno" ajuda="Separa duas turmas do mesmo treinamento. Não aparece em documento."><input value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} onBlur={() => void renomear()} placeholder="Ex.: Turma A - manhã" className={campoClasses} /></Campo>
    </Secao>

    <button type="button" onClick={() => void remover()} className={botaoClasses('fantasma', 'M', 'w-fit text-ds-perigo hover:border-ds-perigo')}><Trash2 />Excluir treinamento</button>
  </div>;
}

// ---------------------------------------------------------------------------
// Painel "Emitir certificados" (Figma 18:1093)
// ---------------------------------------------------------------------------

export function EmitirCertificados({ training, data, aberto, onFechar, reload, notify }: { training: CompanyTraining; data: CompanyDashboardData; aberto: boolean; onFechar: () => void; reload: Reload; notify: Notify }) {
  const [validade, setValidade] = useState(training.validity_months ?? 0);
  const [avisar, setAvisar] = useState(data.mailConfigured);
  const [emitindo, setEmitindo] = useState(false);
  const [docsInstrutor, setDocsInstrutor] = useState<Awaited<ReturnType<typeof readInstructorDocuments>> | null>(null);
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    readInstructorDocuments().then((docs) => { if (ativo) setDocsInstrutor(docs); }).catch(() => { if (ativo) setDocsInstrutor([]); });
    return () => { ativo = false; };
  }, [aberto]);

  const pessoas = data.participants.filter((p) => p.training_id === training.id);
  const aptos = pessoas.filter((p) => p.days_total > 0 && p.days_present >= p.days_total).length;
  const fotos = data.files.filter((f) => f.training_id === training.id && f.kind === 'photo').length;
  const documentos = data.files.filter((f) => f.training_id === training.id && f.kind !== 'photo' && !f.name.startsWith('certificado-')).length;
  const ultimoDia = training.sessions[training.sessions.length - 1];
  const instrutorFinal = data.instructors.find((i) => i.id === (ultimoDia?.instructor_id ?? training.instructor_id));
  const assinatura = docsInstrutor?.find((d) => d.instructorId === instrutorFinal?.id && d.category === 'signature');
  const jaEmitido = Boolean(training.certificate_generated_at);

  async function emitir() {
    setEmitindo(true);
    try {
      const r = await generateCertificates(training.id, { validityMonths: validade, notifyClient: avisar && data.mailConfigured });
      const aviso = r.aviso === 'enviado' ? ' Cliente avisado por e-mail.' : r.aviso === 'sem-email' ? ' O cliente não tem e-mail de contato: aviso não enviado.' : r.aviso === 'falhou' ? ' O e-mail de aviso falhou; os certificados já estão no portal.' : '';
      notify(`${r.documents.length} documento(s) gerados e publicados no portal do cliente.${aviso}`);
      onFechar();
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao gerar os certificados.'); }
    finally { setEmitindo(false); }
  }

  const item = (ok: boolean, titulo: string, detalhe: string, opcional = false) => <div className="flex items-center gap-3 border-b border-ds-borda py-3">
    <span className={cn('flex size-[26px] shrink-0 items-center justify-center rounded-full', ok ? 'bg-ds-sucesso-suave text-ds-sucesso' : opcional ? 'bg-ds-muted text-ds-texto-2' : 'bg-ds-atencao-suave text-ds-atencao')}>{ok ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}</span>
    <div className="min-w-0 flex-1"><p className="ds-body-s font-medium">{titulo}</p><p className="ds-caption text-ds-texto-2">{detalhe}</p></div>
  </div>;

  return <PainelLateral aberto={aberto} onFechar={onFechar} sobretitulo={`Turma ${training.code}`} titulo={jaEmitido ? 'Certificados' : 'Emitir certificados'} subtitulo={`${training.nr} · ${training.title} · ${training.client_name} · ${formatDayMonth(ultimoDia?.session_date ?? training.training_date)}`}
    acoes={<><Botao tipo="secundario" onClick={onFechar}>Cancelar</Botao><Botao className="flex-1" onClick={() => void emitir()} disabled={emitindo || aptos === 0}>{emitindo ? <Loader2 className="animate-spin" /> : null}{emitindo ? 'Gerando…' : jaEmitido ? `Gerar de novo (${aptos})` : `Emitir ${aptos} ${aptos === 1 ? 'certificado' : 'certificados'}`}{emitindo ? null : <ChevronRight />}</Botao></>}>
    <div className="flex flex-col gap-5">
      {jaEmitido ? <Faixa tom="sucesso">Gerados em {formatDate(training.certificate_generated_at as string)}. Gerar de novo substitui os PDFs dos alunos; arquivos enviados à mão ficam.</Faixa> : <Faixa tom="sinal">O certificado sai sozinho quando a turma é encerrada. Esta turma está sem certificado: emita aqui depois de conferir.</Faixa>}
      <div>
        <p className="ds-caps text-ds-texto-2">Antes de emitir</p>
        {item(aptos > 0, 'Presença registrada', `${aptos} de ${pessoas.length} participantes com presença em todos os dias`)}
        {item(fotos > 0, 'Fotos da prática enviadas', fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : 'Nenhuma foto ainda', true)}
        {item(documentos > 0, 'Documentos da turma', documentos ? `${documentos} ${documentos === 1 ? 'arquivo' : 'arquivos'} (inclui a lista assinada)` : 'Nenhum documento ainda', true)}
        {item(assinatura?.status === 'approved', 'Assinatura do instrutor', docsInstrutor === null ? 'Conferindo…' : !instrutorFinal ? 'Último dia sem instrutor escalado' : assinatura ? `${instrutorFinal.name} · ${assinatura.status === 'approved' ? 'assinatura aprovada' : 'assinatura aguardando aprovação'}` : `${instrutorFinal.name} · assinatura não enviada`)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-ds-muted p-3.5"><p className="ds-h3 text-ds-sucesso">{aptos}</p><p className="ds-caption text-ds-texto-2">aptos</p></div>
        <div className="rounded-lg bg-ds-muted p-3.5 text-ds-texto-2"><p className="ds-h3">{pessoas.length - aptos}</p><p className="ds-caption">ausentes</p></div>
        <div className="rounded-lg bg-ds-muted p-3.5"><p className="ds-h3">{aptos}</p><p className="ds-caption text-ds-texto-2">certificados</p></div>
      </div>
      <Campo rotulo="Modelo de certificado" ajuda="O modelo acompanha a norma da turma."><select disabled className={selectClasses}><option>{training.nr} · padrão Space Light</option></select></Campo>
      <Campo rotulo="Validade" ajuda="Aparece no portal do cliente e nas reciclagens; o PDF não muda."><select value={validade} onChange={(e) => setValidade(Number(e.target.value))} className={selectClasses}>{VALIDADES.map((m) => <option key={m} value={m}>{rotuloValidade(m, ultimoDia?.session_date)}</option>)}</select></Campo>
      <Interruptor ligado={avisar && data.mailConfigured} onChange={setAvisar} disabled={!data.mailConfigured} rotulo="Avisar o cliente por e-mail" descricao={data.mailConfigured ? 'Certificados ficam disponíveis no portal do cliente.' : 'Envio de e-mail não configurado no servidor (RESEND_API_KEY). Os certificados vão para o portal mesmo assim.'} />
    </div>
  </PainelLateral>;
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

function Agenda({ data, reload, notify, abrirTurma }: { data: CompanyDashboardData; reload: Reload; notify: Notify; abrirTurma: (id: string) => void }) {
  const [selecionada, setSelecionada] = useState<Date | undefined>(new Date());
  const instrutores = data.instructors.filter((item) => item.status === 'active');

  // Cada dia do calendário aponta para a turma dele.
  const porData = useMemo(() => {
    const mapa = new Map<string, { training: CompanyTraining; session: TrainingSession }[]>();
    for (const training of data.trainings) {
      if (training.status === 'completed') continue;
      for (const session of training.sessions ?? []) {
        const lista = mapa.get(session.session_date);
        if (lista) lista.push({ training, session }); else mapa.set(session.session_date, [{ training, session }]);
      }
    }
    return mapa;
  }, [data.trainings]);
  const comTreino = useMemo(() => [...porData.keys()].map(dateFromIso), [porData]);
  const semEscala = useMemo(() => [...porData.entries()].filter(([, itens]) => itens.some((item) => !item.session.instructor_id)).map(([iso]) => dateFromIso(iso)), [porData]);
  const iso = selecionada ? isoFromDate(selecionada) : '';
  const doDia = porData.get(iso) ?? [];

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
    <Cartao className="h-fit p-5 xl:sticky xl:top-8">
      <Calendar mode="single" selected={selecionada} onSelect={setSelecionada} locale={ptBR} modifiers={{ treino: comTreino, semEscala }} modifiersClassNames={{ treino: '[&>button]:bg-ds-inverso [&>button]:text-ds-amarelo [&>button]:font-semibold', semEscala: '[&>button]:ring-2 [&>button]:ring-ds-perigo [&>button]:ring-inset' }} className="mx-auto w-full [--cell-size:--spacing(11)]" />
      <div className="mt-4 flex flex-wrap gap-4 border-t border-ds-borda pt-3 ds-caption text-ds-texto-2"><span className="flex items-center gap-2"><i className="size-3 rounded-sm bg-ds-inverso" />Dia de treinamento</span><span className="flex items-center gap-2"><i className="size-3 rounded-sm border-2 border-ds-perigo" />Falta instrutor</span></div>
    </Cartao>
    <div className="flex flex-col gap-3">
      <div><span className="ds-caps text-ds-texto-2">{selecionada ? formatDate(iso) : 'Escolha uma data'}</span><h2 className="ds-h4">{doDia.length === 1 ? '1 turma neste dia' : `${doDia.length} turmas neste dia`}</h2></div>
      {doDia.map(({ training, session }) => <Cartao key={session.id} className="px-5 pt-4">
        <button type="button" onClick={() => abrirTurma(training.id)} className="flex w-full items-start gap-3 pb-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="ds-mono text-ds-texto-2">{training.code}</span><span className="ds-caption text-ds-texto-2">Dia {session.day_number} de {training.sessions.length}</span></div>
            <p className="mt-1 ds-body-s font-semibold">{training.nr} · {training.internal_label || training.title}</p>
            <p className="ds-caption text-ds-texto-2">{training.client_name}{formatWindow(session) ? ` · ${formatWindow(session)}` : ''}{training.location ? ` · ${training.location}` : ''}</p>
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-ds-texto-2" />
        </button>
        <DayRow training={training} session={session} instructors={instrutores} reload={reload} notify={notify} />
      </Cartao>)}
      {doDia.length === 0 ? <Vazio icone={<CalendarDays />} titulo="Nenhuma turma nesta data" texto="Escolha outro dia no calendário ou crie uma turma nova." /> : null}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

type Tipo = 'formacao' | 'reciclagem';
type Modalidade = 'in_company' | 'centro';
type Draft = { clientId: string; nr: string; kind: Tipo; duration: string; days: Omit<NovoDia, 'instructorId'>[]; modalidade: Modalidade; location: string; instructorId: string };

/** Título do certificado sugerido pela norma; a equipe ajusta depois na ficha. */
function tituloPadrao(nr: string) {
  if (nr === 'EMERGÊNCIAS QUÍMICAS') return 'Atendimento a emergências químicas';
  return nrInfo(nr)?.title ?? nr;
}

/** Endereço do cliente numa linha, para a turma in company. */
function enderecoDoCliente(client: CompanyDashboardData['clients'][number] | undefined) {
  if (!client) return '';
  const cidade = [client.city, client.state].filter(Boolean).join('/');
  return [client.address, client.district, cidade].filter(Boolean).join(', ');
}

/** O instrutor aplica a norma? Compara o número da NR com as especialidades cadastradas. */
function aplicaNorma(especialidades: string, nr: string) {
  const numero = nr.match(/\d+/)?.[0];
  if (!numero) return especialidades.toLowerCase().includes(nr.toLowerCase());
  return (especialidades.match(/\d+/g) ?? []).some((n) => Number(n) === Number(numero));
}

function diaVazio(): Omit<NovoDia, 'instructorId'> {
  return { date: '', startTime: '08:00', endTime: '17:00' };
}

/** Rótulo de seção do painel: caixa alta com fio até a borda (Figma 79:1237). */
function Divisor({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 pt-1"><span className="ds-caps text-ds-texto-2">{children}</span><span className="h-px flex-1 bg-ds-borda" /></div>;
}

/**
 * Cliente da turma: só a busca. Os resultados aparecem enquanto digita; sem
 * lista aberta nem cliente pré-marcado, para a turma não cair no cliente errado.
 */
function ClientPicker({ clients, value, onChange, rotulo = 'Cliente' }: { clients: CompanyDashboardData['clients']; value: string; onChange: (id: string) => void; rotulo?: string }) {
  const [busca, setBusca] = useState('');
  const alvo = busca.trim().toLowerCase();
  const alvoDigitos = digitos(busca);
  const filtrados = useMemo(() => {
    if (!alvo) return [];
    return clients
      .filter((client) => `${client.name} ${client.legal_name} ${client.short_code ?? ''}`.toLowerCase().includes(alvo) || (alvoDigitos.length > 0 && digitos(client.document).includes(alvoDigitos)))
      .slice(0, 8);
  }, [clients, alvo, alvoDigitos]);
  const escolhido = clients.find((client) => client.id === value);
  const escolher = (id: string) => { onChange(id); setBusca(''); };
  return <div className="flex flex-col gap-2">
    <span className="font-ds-sans text-sm leading-5 font-medium">{rotulo}</span>
    <div className="relative">
      <label className="relative block"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input aria-label="Buscar cliente por nome, sigla ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && filtrados[0]) { e.preventDefault(); escolher(filtrados[0].id); } if (e.key === 'Escape') setBusca(''); }} placeholder={escolhido ? escolhido.name : 'Nome, sigla ou CNPJ'} className={cn(campoClasses, 'pl-10', escolhido && !busca && 'placeholder:text-ds-texto')} /></label>
      {alvo ? <div className="absolute right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-ds-borda bg-ds-superficie shadow-lg">
        {filtrados.length
          ? filtrados.map((client) => <button key={client.id} type="button" onClick={() => escolher(client.id)} className="flex w-full flex-col items-start border-b border-ds-borda px-3.5 py-2.5 text-left last:border-b-0 hover:bg-ds-muted"><span className="ds-body-s font-medium">{client.name}</span><span className="ds-caption text-ds-texto-2">{[client.short_code, client.document].filter(Boolean).join(' · ')}</span></button>)
          : <p className="px-3.5 py-3 ds-body-s text-ds-texto-2">Nenhum cliente com esse nome, sigla ou CNPJ.</p>}
      </div> : null}
    </div>
  </div>;
}

/** Nova turma no painel lateral (Figma 79:1205): o essencial; o resto se completa na ficha. */
function NovaTurma({ data, reload, notify, aoCriar, onFechar, preset = null }: { data: CompanyDashboardData; reload: Reload; notify: Notify; aoCriar: (id: string) => void; onFechar: () => void; preset?: { clienteId?: string; nr?: string } | null }) {
  const instrutores = data.instructors.filter((item) => item.status === 'active');
  const [salvando, setSalvando] = useState(false);
  // Vindo da ficha do cliente já chega com o cliente; "Agendar" uma reciclagem traz também a norma.
  const nrInicial = preset?.nr && NORMAS.includes(preset.nr) ? preset.nr : 'NR 23';
  const clienteInicial = data.clients.find((c) => c.id === preset?.clienteId);
  const [draft, setDraft] = useState<Draft>({ clientId: clienteInicial?.id ?? '', nr: nrInicial, kind: preset?.nr ? 'reciclagem' : 'formacao', duration: cargaHorariaPadrao(nrInicial), days: [diaVazio()], modalidade: 'in_company', location: enderecoDoCliente(clienteInicial), instructorId: '' });
  const cliente = data.clients.find((c) => c.id === draft.clientId);

  function mudarCliente(id: string) {
    setDraft((atual) => {
      const antigo = data.clients.find((c) => c.id === atual.clientId);
      // O endereço acompanha o cliente enquanto ninguém o digitou à mão.
      const enderecoIntocado = atual.modalidade === 'in_company' && (atual.location === '' || atual.location === enderecoDoCliente(antigo));
      return { ...atual, clientId: id, location: enderecoIntocado ? enderecoDoCliente(data.clients.find((c) => c.id === id)) : atual.location };
    });
  }
  function mudarNorma(nr: string) {
    // A carga horária sugerida acompanha a norma, mas nunca sobrescreve o que foi digitado.
    setDraft((atual) => ({ ...atual, nr, duration: atual.duration === cargaHorariaPadrao(atual.nr) ? cargaHorariaPadrao(nr) : atual.duration }));
  }
  function mudarModalidade(modalidade: Modalidade) {
    setDraft((atual) => ({ ...atual, modalidade, location: modalidade === 'in_company' ? enderecoDoCliente(cliente) : 'Centro de treinamento Space Light' }));
  }
  function setDia(index: number, campos: Partial<Draft['days'][number]>) {
    setDraft((atual) => ({ ...atual, days: atual.days.map((dia, i) => (i === index ? { ...dia, ...campos } : dia)) }));
  }
  function addDia() {
    // O dia novo repete o horário do anterior: é o caso comum.
    setDraft((atual) => {
      const ultimo = atual.days[atual.days.length - 1];
      return { ...atual, days: [...atual.days, { date: '', startTime: ultimo?.startTime ?? '08:00', endTime: ultimo?.endTime ?? '17:00' }] };
    });
  }

  // Instrutores na ordem do desenho: quem está livre e aplica a norma primeiro;
  // quem já está escalado em outra turma na data vai para o fim, apagado.
  const primeiraData = draft.days[0]?.date ?? '';
  const sugestoes = instrutores.map((instrutor) => {
    const livre = Boolean(primeiraData) && data.instructorAvailability.some((a) => a.instructor_id === instrutor.id && a.available_date === primeiraData);
    const ocupado = Boolean(primeiraData) && data.trainings.some((t) => t.status !== 'completed' && (t.sessions ?? []).some((s) => s.session_date === primeiraData && s.instructor_id === instrutor.id));
    const aplica = aplicaNorma(instrutor.specialties, draft.nr);
    const partes = [
      ocupado ? 'Escalado em outra turma nesse dia' : livre ? 'Disponível' : primeiraData ? 'Sem disponibilidade marcada' : '',
      ocupado ? '' : aplica ? `aplica ${draft.nr}` : `não aplica ${draft.nr}`,
      ocupado ? '' : instrutor.base_city,
    ].filter(Boolean);
    return { instrutor, texto: partes.join(' · '), destaque: livre && aplica && !ocupado, ocupado, peso: ocupado ? 3 : livre && aplica ? 0 : livre || aplica ? 1 : 2 };
  }).sort((a, b) => a.peso - b.peso || a.instrutor.name.localeCompare(b.instrutor.name));
  const escolhido = instrutores.find((i) => i.id === draft.instructorId);

  async function criar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.clientId) { notify('Escolha o cliente da turma.'); return; }
    if (!draft.location.trim()) { notify('Informe o endereço do treinamento.'); return; }
    // A aba do WhatsApp abre já no clique; depois da espera o navegador bloquearia.
    const janela = escolhido?.phone ? window.open('', '_blank') : null;
    setSalvando(true);
    try {
      const resultado = await createMockTraining({
        clientId: draft.clientId,
        nr: draft.nr,
        kind: draft.kind,
        title: tituloPadrao(draft.nr),
        internalLabel: '',
        theme: '',
        days: draft.days.map((dia) => ({ ...dia, instructorId: draft.instructorId || null })),
        contentProgram: conteudoPadrao(data, draft.nr),
        duration: draft.duration,
        location: draft.location,
      });
      const dias = [...draft.days].filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date));
      const url = escolhido?.phone ? whatsappLink(escolhido.phone, trainingScheduleMessage({
        instructorName: escolhido.name,
        nr: draft.nr,
        title: tituloPadrao(draft.nr),
        clientName: cliente?.name ?? '',
        dateLabel: dias.map((d) => formatDate(d.date)).join(', '),
        timeLabel: scheduleWindow(dias[0]?.startTime ?? '', dias[0]?.endTime ?? ''),
        duration: draft.duration,
        location: draft.location,
      })) : null;
      if (janela && url) janela.location.href = url; else janela?.close();
      notify(escolhido ? (url ? `Turma criada. A mensagem para ${escolhido.name.split(' ')[0]} abriu no WhatsApp.` : `Turma criada. ${escolhido.name} não tem telefone no cadastro para o aviso.`) : 'Turma criada. Escale o instrutor na ficha da turma.');
      await reload();
      aoCriar(resultado.id);
    } catch (error) {
      janela?.close();
      notify(error instanceof Error ? error.message : 'Erro ao criar a turma.');
    } finally { setSalvando(false); }
  }

  return <PainelLateral aberto onFechar={onFechar} largura={520} sobretitulo="Turma nova" titulo="Nova turma" subtitulo="Preencha o essencial. Dá para completar depois."
    acoes={<><Botao tipo="secundario" onClick={onFechar}>Cancelar</Botao><Botao type="submit" form="nova-turma" className="flex-1" disabled={salvando || data.clients.length === 0}>{salvando ? <Loader2 className="animate-spin" /> : null}{escolhido ? 'Criar turma e avisar instrutor' : 'Criar turma'}</Botao></>}>
    <form id="nova-turma" onSubmit={criar} className="flex flex-col gap-[18px]">
      {data.clients.length === 0 ? <Faixa tom="sinal">Cadastre um cliente antes de criar a turma.</Faixa> : null}
      <Divisor>Cliente e treinamento</Divisor>
      <div className="grid gap-3 sm:grid-cols-2">
        <ClientPicker clients={data.clients} value={draft.clientId} onChange={mudarCliente} />
        <Campo rotulo="Unidade"><input readOnly value={cliente ? cliente.unit || '—' : ''} placeholder="Vem do cliente" className={cn(campoClasses, 'bg-ds-muted')} /></Campo>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-ds-sans text-sm leading-5 font-medium">Norma</span>
        <div className="flex flex-wrap gap-1.5">{NORMAS.map((nr) => <Chip key={nr} selecionado={draft.nr === nr} onClick={() => mudarNorma(nr)}>{nr === 'EMERGÊNCIAS QUÍMICAS' ? 'Emerg. químicas' : nr}</Chip>)}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Tipo"><select value={draft.kind} onChange={(e) => { const valor = e.target.value as Tipo; setDraft((atual) => ({ ...atual, kind: valor })); }} className={selectClasses}><option value="formacao">Formação</option><option value="reciclagem">Reciclagem</option></select></Campo>
        <Campo rotulo="Carga horária"><input required value={draft.duration} onChange={(e) => { const valor = e.target.value; setDraft((atual) => ({ ...atual, duration: valor })); }} placeholder="Ex.: 16 horas" className={campoClasses} /></Campo>
      </div>

      <Divisor>Data e local</Divisor>
      {draft.days.map((dia, index) => <div key={index} className="flex flex-col gap-2">
        {draft.days.length > 1 ? <div className="flex items-center justify-between"><span className="ds-caps text-ds-texto-2">Dia {index + 1}</span><BotaoIcone rotulo={`Remover o dia ${index + 1}`} tom="perigo" className="size-8" onClick={() => setDraft((atual) => ({ ...atual, days: atual.days.filter((_, i) => i !== index) }))}><X /></BotaoIcone></div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Data"><input required type="date" value={dia.date} onChange={(e) => setDia(index, { date: e.target.value })} className={campoClasses} /></Campo>
          <Campo rotulo="Horário"><div className={cn(campoClasses, 'flex items-center gap-1.5 focus-within:border-ds-borda-forte focus-within:ring-2 focus-within:ring-ds-amarelo/40')}>
            <input type="time" aria-label={`Início do dia ${index + 1}`} value={dia.startTime} onChange={(e) => setDia(index, { startTime: e.target.value })} className="min-w-0 flex-1 bg-transparent outline-none" />
            <span className="text-ds-texto-2">às</span>
            <input type="time" aria-label={`Fim do dia ${index + 1}`} value={dia.endTime} onChange={(e) => setDia(index, { endTime: e.target.value })} className="min-w-0 flex-1 bg-transparent outline-none" />
          </div></Campo>
        </div>
      </div>)}
      <button type="button" onClick={addDia} className={botaoClasses('link', 'P', 'w-fit -mt-2')}><Plus />Adicionar dia</button>
      <Segmentado rotulo="Local do treinamento" ativa={draft.modalidade} onChange={mudarModalidade} opcoes={[{ id: 'in_company', rotulo: 'In company' }, { id: 'centro', rotulo: 'Centro de treinamento' }]} />
      <Campo rotulo="Endereço"><input required value={draft.location} onChange={(e) => { const valor = e.target.value; setDraft((atual) => ({ ...atual, location: valor })); }} placeholder={draft.modalidade === 'in_company' ? 'Endereço do cliente' : 'Endereço do centro de treinamento'} className={campoClasses} /></Campo>

      <Divisor>Instrutor</Divisor>
      <div role="radiogroup" aria-label="Instrutor" className="overflow-hidden rounded-lg border border-ds-borda">
        {sugestoes.map(({ instrutor, texto, destaque, ocupado }) => {
          const marcado = draft.instructorId === instrutor.id;
          return <label key={instrutor.id} className={cn('flex cursor-pointer items-center gap-3 border-b border-ds-borda px-3 py-2.5 last:border-b-0', marcado && 'bg-ds-amarelo-suave', ocupado && 'opacity-50')}>
            <input type="radio" name="instrutor" checked={marcado} onChange={() => setDraft((atual) => ({ ...atual, instructorId: instrutor.id }))} className="size-[18px] shrink-0 accent-ds-inverso" />
            <Avatar nome={instrutor.name} tamanho={28} />
            <span className="min-w-0 flex-1"><span className="block truncate ds-body-s font-medium">{instrutor.name}</span><span className={cn('block truncate ds-caption', destaque ? 'text-ds-sucesso' : 'text-ds-texto-2')}>{texto}</span></span>
          </label>;
        })}
        <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5', !draft.instructorId && 'bg-ds-amarelo-suave', sugestoes.length > 0 && 'border-t border-ds-borda')}>
          <input type="radio" name="instrutor" checked={!draft.instructorId} onChange={() => setDraft((atual) => ({ ...atual, instructorId: '' }))} className="size-[18px] shrink-0 accent-ds-inverso" />
          <span className="ds-body-s font-medium">Escalar depois</span>
        </label>
      </div>
      {!primeiraData ? <p className="-mt-2 ds-caption text-ds-texto-2">Escolha a data para ver quem está disponível.</p> : null}
    </form>
  </PainelLateral>;
}

// ---------------------------------------------------------------------------
// Tela de turmas (Figma 18:170)
// ---------------------------------------------------------------------------

export function CompanyTrainings({ data, reload, notify, turmaAlvo = null, vistaInicial = null, presetNova = null, abrirQr }: { data: CompanyDashboardData; reload: Reload; notify: Notify; turmaAlvo?: string | null; vistaInicial?: 'agenda' | 'criar' | null; presetNova?: { clienteId?: string; nr?: string } | null; abrirQr?: (trainingId: string) => void }) {
  const [vista, setVista] = useState<Vista>(vistaInicial === 'agenda' ? 'agenda' : 'tabela');
  const [criando, setCriando] = useState(vistaInicial === 'criar');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [aberta, setAberta] = useState<string | null>(turmaAlvo);
  const [emissao, setEmissao] = useState<string | null>(null);

  const instrutores = data.instructors.filter((item) => item.status === 'active');
  const hojeIso = isoFromDate(new Date());
  const alvo = busca.trim().toLowerCase();
  const casa = (t: CompanyTraining) => !alvo || `${t.title} ${t.internal_label} ${t.nr} ${t.client_name} ${t.code}`.toLowerCase().includes(alvo);
  const semInstrutor = (t: CompanyTraining) => t.status !== 'completed' && (t.sessions ?? []).some((dia) => !dia.instructor_id);
  const regras: Record<Filtro, (t: CompanyTraining) => boolean> = {
    todas: () => true,
    scheduled: (t) => t.status === 'scheduled' && dataDaTurma(t) >= hojeIso,
    in_progress: (t) => t.status === 'in_progress' && dataDaTurma(t) >= hojeIso,
    atrasadas: (t) => t.status !== 'completed' && dataDaTurma(t) < hojeIso,
    sem_instrutor: semInstrutor,
    aguardando: (t) => t.status === 'completed' && !t.certificate_generated_at,
    completed: (t) => t.status === 'completed',
  };
  const contar = (f: Filtro) => data.trainings.filter(regras[f]).length;
  // Em aberto primeiro, pela data do próximo dia; concluídas depois, da mais recente.
  const ordenadas = useMemo(() => [...data.trainings].sort((a, b) => {
    const ca = a.status === 'completed' ? 1 : 0;
    const cb = b.status === 'completed' ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return ca ? dataDaTurma(b).localeCompare(dataDaTurma(a)) : dataDaTurma(a).localeCompare(dataDaTurma(b));
  }), [data.trainings]);
  const lista = ordenadas.filter((t) => regras[filtro](t) && casa(t));
  const turmaAberta = aberta ? data.trainings.find((t) => t.id === aberta) : undefined;
  const turmaEmissao = emissao ? data.trainings.find((t) => t.id === emissao) : undefined;

  // Planilha da lista que está na tela, com o filtro e a busca aplicados.
  function exportar() {
    const cabecalho = ['Turma', 'Cliente', 'Norma', 'Treinamento', 'Tipo', 'Data', 'Dias', 'Instrutor', 'Status'];
    const linhas = lista.map((t) => {
      const dia = proximoDia(t);
      const [ano, mes, diaDoMes] = (dia?.session_date ?? t.training_date).split('-');
      const instrutor = dia?.instructor_name ?? (dia ? '' : t.instructor);
      return [t.code, t.client_name, t.nr, t.title, ROTULO_DO_TIPO[t.kind ?? ''] ?? '', `${diaDoMes}/${mes}/${ano}`, String(t.sessions.length), instrutor || 'A definir', situacaoDaTurma(t, hojeIso).texto];
    });
    const csv = [cabecalho, ...linhas].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `turmas-${hojeIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pilulas: Array<[Filtro, string]> = [['todas', 'Todas'], ['scheduled', 'Agendadas'], ['in_progress', 'Em andamento'], ['atrasadas', 'Dia vencido'], ['sem_instrutor', 'Sem instrutor'], ['aguardando', 'Aguardando certificados'], ['completed', 'Concluídas']];

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Turmas" subtitulo="Todas as turmas de todos os clientes, do agendamento ao certificado." acoes={<>
      {vista === 'tabela' ? <Botao tipo="secundario" onClick={exportar} disabled={lista.length === 0}>Exportar<Download /></Botao> : null}
      <Botao tipo="secundario" onClick={() => setVista(vista === 'agenda' ? 'tabela' : 'agenda')}>{vista === 'agenda' ? 'Tabela' : 'Agenda'}<CalendarDays /></Botao>
      <Botao onClick={() => setCriando(true)}>Nova turma<Plus /></Botao>
    </>} />

    {vista === 'agenda' ? <Agenda data={data} reload={reload} notify={notify} abrirTurma={(id) => setAberta(id)} /> : null}

    {vista === 'tabela' ? <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pilulas.map(([id, rotulo]) => { const n = contar(id); if (n === 0 && id !== 'todas' && id !== filtro && (id === 'atrasadas' || id === 'sem_instrutor' || id === 'aguardando')) return null; return <Pilula key={id} ativa={filtro === id} onClick={() => setFiltro(id)} className={cn((id === 'atrasadas' || id === 'sem_instrutor') && filtro !== id && 'border-ds-perigo/40 text-ds-perigo')}>{rotulo} · {n}</Pilula>; })}
        </div>
        <label className="relative xl:ml-auto xl:w-72"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input aria-label="Buscar turma" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar turma, cliente ou NR" className={cn(campoClasses, 'min-h-10 py-2 pl-10 ds-body-s')} /></label>
      </div>
      {contar('sem_instrutor') > 0 && filtro !== 'sem_instrutor' ? <Faixa tom="perigo" acao={<Botao tamanho="P" tipo="fantasma" onClick={() => setFiltro('sem_instrutor')}>Ver quais</Botao>}><span className="inline-flex items-center gap-2"><AlertTriangle className="size-4 text-ds-perigo" />{contar('sem_instrutor') === 1 ? '1 turma tem dia sem instrutor escalado.' : `${contar('sem_instrutor')} turmas têm dias sem instrutor escalado.`}</span></Faixa> : null}
      {lista.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[860px]')}>
        <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Cliente</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Data</th><th className={tb.th}>Instrutor</th><th className={tb.th}>Status</th></tr></thead>
        <tbody>{lista.map((t) => {
          const dia = proximoDia(t);
          const instrutor = dia?.instructor_name ?? (dia ? null : t.instructor);
          const sit = situacaoDaTurma(t, hojeIso);
          return <tr key={t.id} onClick={() => setAberta(t.id)} className={cn(tb.linha, tb.linhaClicavel, (aberta === t.id || emissao === t.id) && 'bg-ds-amarelo-suave')}>
            <td className={tb.td}><span className={tb.codigo}>{t.code}</span></td>
            <td className={cn(tb.td, 'font-medium')}><button type="button" onClick={(e) => { e.stopPropagation(); setAberta(t.id); }} className="text-left ds-foco">{t.client_name}{t.internal_label ? <span className="block ds-caption font-normal text-ds-texto-2">{t.internal_label}</span> : null}</button></td>
            <td className={cn(tb.td, 'max-w-[220px] truncate')} title={t.title}>{t.nr} · {t.title}</td>
            <td className={cn(tb.td, 'whitespace-nowrap')}>{formatDayMonth(dia?.session_date ?? t.training_date)}{t.sessions.length > 1 && dia ? <span className="block ds-caption text-ds-texto-2">dia {dia.day_number} de {t.sessions.length}</span> : null}</td>
            <td className={cn(tb.td, !instrutor && 'text-ds-texto-2')}>{instrutor || (t.status === 'completed' ? '—' : 'A definir')}</td>
            <td className={tb.td}>{sit.texto === 'Aguardando certificados' ? <button type="button" onClick={(e) => { e.stopPropagation(); setEmissao(t.id); }} className="ds-foco rounded"><Tag tom={sit.tom}>{sit.texto}</Tag></button> : <Tag tom={sit.tom}>{sit.texto}</Tag>}</td>
          </tr>;
        })}</tbody>
      </table></div></div> : <Vazio icone={<CalendarPlus />} titulo="Nenhuma turma neste filtro" texto={data.trainings.length === 0 ? 'Crie a primeira turma em "Nova turma".' : 'Ajuste a busca ou o filtro.'} />}
    </> : null}

    {turmaAberta ? <PainelLateral aberto onFechar={() => setAberta(null)} largura={760} sobretitulo={`Turma ${turmaAberta.code}`} titulo={`${turmaAberta.nr} · ${turmaAberta.internal_label || turmaAberta.title}`}
      subtitulo={[turmaAberta.client_name, data.clients.find((c) => c.id === turmaAberta.client_id)?.unit].filter(Boolean).join(' · ')}
      acoes={<><a href={`/lista-presenca/${turmaAberta.id}`} target="_blank" rel="noopener" className={botaoClasses('secundario', 'M')}><FileText />Lista para imprimir</a>{abrirQr ? <Botao className="flex-1" onClick={() => abrirQr(turmaAberta.id)}>Abrir QR e participantes</Botao> : null}</>}>
      <FichaDaTurma key={turmaAberta.id} training={turmaAberta} data={data} instructors={instrutores} reload={reload} notify={notify} emitir={() => { setEmissao(turmaAberta.id); setAberta(null); }} aoExcluir={() => setAberta(null)} />
    </PainelLateral> : null}

    {criando ? <NovaTurma data={data} reload={reload} notify={notify} preset={presetNova} onFechar={() => setCriando(false)} aoCriar={(id) => { setCriando(false); setVista('tabela'); setAberta(id); }} /> : null}

    {turmaEmissao ? <EmitirCertificados key={turmaEmissao.id} training={turmaEmissao} data={data} aberto onFechar={() => setEmissao(null)} reload={reload} notify={notify} /> : null}
  </div>;
}
