'use client';

import { Check, Copy, Download, FileText, Loader2, Pencil, Plus, QrCode, Search, Trash2, UsersRound, X } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { dateFromIso, EmptyState, formatDate, inputClass, isoFromDate, PresencaBadge } from '@/components/company-portal/company-ui';
import { Calendar } from '@/components/ui/calendar';
import type { CompanyDashboardData, CompanyParticipant, CompanyTraining } from '@/lib/company-types';
import { dataDoDia, rotuloDiaDaTurma } from '@/lib/dias-da-turma';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
import { clientePedeLogin } from '@/lib/login-do-participante';
import { addParticipantByCompany, generateCertificates, removeParticipantByCompany, setParticipantAttendance, updateParticipantByCompany } from '@/lib/mock-company-database';
import type { DadosParticipante } from '@/lib/mock-company-database';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;

function QrPanel({ training }: { training: CompanyTraining }) {
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { const publicUrl = `${window.location.origin}/participar/${training.qr_token}`; QRCode.toDataURL(publicUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b0b', light: '#ffffff' } }).then((imageUrl) => { setUrl(publicUrl); setImage(imageUrl); }).catch(() => setImage('')); }, [training.qr_token]);
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <div className="rounded-lg grid gap-7 border border-ds-borda bg-ds-superficie p-6 md:grid-cols-[280px_1fr] md:p-8"><div className="flex min-h-[280px] items-center justify-center bg-ds-muted p-4">{image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={250} height={250} unoptimized className="h-auto w-full max-w-[250px]" /> : <Loader2 className="size-7 animate-spin text-ds-amarelo-texto" />}</div><div className="flex flex-col justify-between"><div><span className="eyebrow text-ds-amarelo-texto">Formulário do treinamento</span><h2 className="mt-3 ds-h4">{training.nr} · {training.title}</h2><p className="mt-2 text-sm font-bold text-ds-amarelo-texto">{training.client_name}</p><p className="mt-5 break-all border-l-4 border-ds-amarelo bg-ds-amarelo-suave p-3 font-mono text-[10px] leading-relaxed">{url}</p></div><div className="mt-6 grid gap-2 sm:grid-cols-3"><button type="button" onClick={copy} className="rounded-md inline-flex h-11 items-center justify-center gap-2 border border-ds-borda ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copiado' : 'Copiar link'}</button><a href={image} download={`qr-${training.code}.png`} className="rounded-md inline-flex h-11 items-center justify-center gap-2 border border-ds-borda ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv"><Download className="size-4" />Baixar QR</a><a href={url} target="_blank" rel="noreferrer" className="rounded-md inline-flex h-11 items-center justify-center gap-2 bg-ds-amarelo ds-botao text-ds-texto hover:bg-[#eab900]">Abrir formulário</a></div></div></div>;
}

const vazio: DadosParticipante = { fullName: '', documentId: '', rg: '', birthDate: '', email: '', phone: '', employeeLogin: '' };

/** O formulário trabalha só com números; a pontuação é recolocada ao salvar. */
function dadosDe(participant: CompanyParticipant): DadosParticipante {
  return {
    fullName: participant.full_name,
    documentId: (participant.document_id ?? '').replace(/\D/g, ''),
    rg: (participant.rg ?? '').toUpperCase().replace(/[^0-9X]/g, ''),
    birthDate: participant.birth_date ?? '',
    email: participant.email ?? '',
    phone: participant.phone ?? '',
    employeeLogin: participant.employee_login ?? '',
  };
}

/** Campos da gestão: os mesmos para incluir e para corrigir um participante. */
function ParticipantFields({ draft, setDraft, pedeLogin }: { draft: DadosParticipante; setDraft: (value: DadosParticipante) => void; pedeLogin: boolean }) {
  const rotulo = 'mb-1.5 block ds-caps';
  return <>
    <label className="sm:col-span-2 xl:col-span-3"><span className={rotulo}>Nome completo *</span><input required value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className={inputClass} /></label>
    <label><span className={rotulo}>CPF * (só números)</span><input required inputMode="numeric" value={draft.documentId} onChange={(e) => setDraft({ ...draft, documentId: limparDigitacaoCpf(e.target.value) })} className={inputClass} /></label>
    <label><span className={rotulo}>RG * (sem lembrar: o CPF)</span><input required value={draft.rg} onChange={(e) => setDraft({ ...draft, rg: limparDigitacaoRg(e.target.value) })} className={inputClass} /></label>
    <label><span className={rotulo}>Data de nascimento</span><input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} className={inputClass} /></label>
    {pedeLogin ? <label><span className={rotulo}>Login da Amazon</span><input value={draft.employeeLogin ?? ''} onChange={(e) => setDraft({ ...draft, employeeLogin: e.target.value.trim() })} autoCapitalize="none" spellCheck={false} className={inputClass} /></label> : null}
    <label><span className={rotulo}>E-mail</span><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputClass} /></label>
    <label><span className={rotulo}>Telefone</span><input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputClass} /></label>
  </>;
}

function AddParticipant({ training, reload, notify }: { training: CompanyTraining; reload: Reload; notify: Notify }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosParticipante>(vazio);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = problemaCpf(draft.documentId) ?? problemaRg(draft.rg);
    if (problema) { notify(problema); return; }
    setSalvando(true);
    try {
      await addParticipantByCompany(training.id, draft);
      notify(`${draft.fullName.trim()} incluído na lista. Marque os dias de presença ao lado do nome.`);
      setDraft(vazio);
      setAberto(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao incluir o participante.');
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return <button type="button" onClick={() => setAberto(true)} className="rounded-md inline-flex h-11 items-center gap-2 bg-ds-amarelo px-4 ds-botao text-ds-texto hover:bg-[#eab900]"><Plus className="size-4" />Incluir participante</button>;
  }
  return <form onSubmit={salvar} className="rounded-lg grid gap-3 border border-ds-borda bg-ds-superficie p-4 sm:grid-cols-2 xl:grid-cols-3">
    <ParticipantFields draft={draft} setDraft={setDraft} pedeLogin={clientePedeLogin([training.client_name, training.client_legal_name])} />
    <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
      <button type="submit" disabled={salvando} className="rounded-md inline-flex h-11 items-center gap-2 bg-ds-inverso px-4 ds-botao text-white hover:bg-ds-amarelo hover:text-ds-texto disabled:opacity-50">{salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Incluir na lista</button>
      <button type="button" onClick={() => setAberto(false)} className="rounded-md inline-flex h-11 items-center border border-ds-borda px-4 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">Cancelar</button>
    </div>
  </form>;
}

function ParticipantRow({ participant, training, presentes, reload, notify }: { participant: CompanyParticipant; training: CompanyTraining; presentes: Set<string>; reload: Reload; notify: Notify }) {
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [draft, setDraft] = useState<DadosParticipante>(() => dadosDe(participant));
  const dias = training.sessions ?? [];

  async function alternarPresenca(sessionId: string, presente: boolean) {
    setOcupado(sessionId);
    try {
      await setParticipantAttendance(participant.id, sessionId, !presente);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao marcar a presença.');
    } finally {
      setOcupado('');
    }
  }

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = problemaCpf(draft.documentId) ?? problemaRg(draft.rg);
    if (problema) { notify(problema); return; }
    setOcupado('salvar');
    try {
      await updateParticipantByCompany(participant.id, draft);
      notify('Participante atualizado.');
      setEditando(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar o participante.');
    } finally {
      setOcupado('');
    }
  }

  async function remover() {
    if (!window.confirm(`Remover ${participant.full_name} da lista? As presenças dele nesta turma também saem.`)) return;
    setOcupado('remover');
    try {
      await removeParticipantByCompany(participant.id);
      notify('Participante removido da lista.');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao remover o participante.');
    } finally {
      setOcupado('');
    }
  }

  const contato = [participant.employee_login ? `Login ${participant.employee_login}` : '', participant.job_title, participant.email || participant.phone].filter(Boolean).join(' · ');

  return <li className="border border-ds-borda bg-ds-superficie">
    <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <strong className="block text-sm leading-snug">{participant.full_name}</strong>
        <span className="mt-1 block text-xs text-ds-texto-2">CPF {participant.document_id}{participant.rg ? ` · RG ${participant.rg}` : ''}</span>
        <span className="mt-1 block text-xs text-ds-texto-2">{contato || 'Sem função e sem contato'} · inscrito em {formatDate(participant.created_at)}</span>
      </div>
      <div>
        <span className="mb-1.5 flex items-center gap-2 ds-caps text-ds-texto-2">Presença <PresencaBadge present={participant.days_present} total={participant.days_total} /></span>
        <div className="flex flex-wrap gap-1.5">{dias.map((dia) => {
          const presente = presentes.has(dia.id);
          return <button key={dia.id} type="button" disabled={Boolean(ocupado)} onClick={() => void alternarPresenca(dia.id, presente)} aria-pressed={presente} aria-label={`Dia ${dia.day_number}: ${presente ? 'presente, clique para desmarcar' : 'sem presença, clique para marcar'}`} title={`Dia ${dia.day_number} · ${formatDate(dia.session_date)}`} className={`rounded-md inline-flex h-9 min-w-11 items-center justify-center gap-1 px-2 text-[11px] font-extrabold disabled:opacity-50 ${presente ? 'bg-ds-sucesso text-white' : 'border border-dashed border-ds-borda bg-ds-superficie text-ds-texto-2 hover:border-ds-sucesso hover:text-ds-sucesso'}`}>{ocupado === dia.id ? <Loader2 className="size-3.5 animate-spin" /> : presente ? <Check className="size-3.5" /> : null}D{dia.day_number}</button>;
        })}</div>
      </div>
      <div className="flex gap-2 lg:justify-end">
        <button type="button" onClick={() => { setDraft(dadosDe(participant)); setEditando((v) => !v); }} className="rounded-md inline-flex h-10 items-center gap-2 border border-ds-borda px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">{editando ? <X className="size-4" /> : <Pencil className="size-4" />}{editando ? 'Fechar' : 'Editar'}</button>
        <button type="button" onClick={() => void remover()} disabled={Boolean(ocupado)} aria-label={`Remover ${participant.full_name}`} className="rounded-md inline-flex size-10 items-center justify-center border border-ds-borda text-ds-texto-2 hover:border-ds-perigo hover:text-ds-perigo disabled:opacity-50"><Trash2 className="size-4" /></button>
      </div>
    </div>
    {editando ? <form onSubmit={salvar} className="grid gap-3 border-t border-ds-borda bg-ds-muted p-4 sm:grid-cols-2 xl:grid-cols-3">
      <ParticipantFields draft={draft} setDraft={setDraft} pedeLogin={clientePedeLogin([training.client_name, training.client_legal_name])} />
      <div className="sm:col-span-2 xl:col-span-3">
        <button type="submit" disabled={Boolean(ocupado)} className="rounded-md inline-flex h-11 items-center gap-2 bg-ds-inverso px-4 ds-botao text-white hover:bg-ds-amarelo hover:text-ds-texto disabled:opacity-50">{ocupado === 'salvar' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
      </div>
    </form> : null}
  </li>;
}

const semPresenca = new Set<string>();

/** Turma que faz sentido abrir primeiro: a de hoje, senão a próxima, senão a última. */
function turmaInicial(trainings: CompanyTraining[], hoje: string) {
  const comData = trainings.map((training) => ({ training, dia: dataDoDia(training) }));
  const hojeMesmo = comData.find((item) => item.dia === hoje);
  const proxima = comData.filter((item) => item.dia > hoje).sort((a, b) => a.dia.localeCompare(b.dia))[0];
  const ultima = [...comData].sort((a, b) => b.dia.localeCompare(a.dia))[0];
  return (hojeMesmo ?? proxima ?? ultima)?.training;
}

/** Achar a turma pelo calendário, ou pular direto para ela pelo nome/CPF do aluno. */
function SeletorDeTurma({ data, escolhida, aoEscolher }: { data: CompanyDashboardData; escolhida: CompanyTraining | undefined; aoEscolher: (id: string) => void }) {
  const [selecionada, setSelecionada] = useState<Date | undefined>(() => dateFromIso(escolhida ? dataDoDia(escolhida) : isoFromDate(new Date())));
  const [busca, setBusca] = useState('');

  const porData = useMemo(() => {
    const mapa = new Map<string, CompanyTraining[]>();
    for (const training of data.trainings) {
      for (const session of training.sessions ?? []) {
        const lista = mapa.get(session.session_date);
        if (!lista) mapa.set(session.session_date, [training]);
        else if (!lista.some((item) => item.id === training.id)) lista.push(training);
      }
    }
    return mapa;
  }, [data.trainings]);

  const comTurma = useMemo(() => [...porData.keys()].map(dateFromIso), [porData]);
  const iso = selecionada ? isoFromDate(selecionada) : '';
  const doDia = porData.get(iso) ?? [];

  const alvo = busca.trim().toLowerCase();
  const digitos = alvo.replace(/\D/g, '');
  const achados = useMemo(() => {
    if (alvo.length < 2) return [];
    return data.participants
      .filter((item) => item.full_name.toLowerCase().includes(alvo) || (digitos.length >= 3 && item.document_id.includes(digitos)))
      .slice(0, 8);
  }, [data.participants, alvo, digitos]);

  const linhaTurma = (training: CompanyTraining) => <button key={training.id} type="button" onClick={() => aoEscolher(training.id)}
    className={`rounded-lg flex w-full items-center gap-3 border p-3 text-left transition hover:bg-ds-amarelo-suave ${training.id === escolhida?.id ? 'border-ds-amarelo bg-ds-amarelo-suave' : 'border-ds-borda bg-ds-superficie'}`}>
    <span className="rounded-md flex size-10 shrink-0 items-center justify-center bg-black font-ds-display text-xs font-bold text-ds-amarelo">{training.nr}</span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate ds-body-s font-semibold">{training.internal_label || training.title}</strong>
      <span className="mt-1 block truncate text-xs font-bold text-ds-amarelo-texto">{training.client_name}</span>
    </span>
    <span className="shrink-0 ds-caps text-ds-texto-2">{training.participant_count} inscrito(s)</span>
  </button>;

  return <div className="border border-ds-borda bg-ds-muted p-4 sm:p-5">
    <label className="block">
      <span className="mb-2 block ds-caps">Buscar aluno por nome ou CPF</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ds-texto-2" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: Maria Silva ou 12345678900" className={`${inputClass} pl-10`} />
      </span>
    </label>
    {alvo.length >= 2 ? <div className="mt-3 space-y-2">
      {achados.map((item) => <button key={item.id} type="button" onClick={() => aoEscolher(item.training_id)} aria-label={`Abrir a turma de ${item.full_name}`}
        className="rounded-lg flex w-full items-center gap-3 border border-ds-borda bg-ds-superficie p-3 text-left transition hover:bg-ds-amarelo-suave">
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-extrabold">{item.full_name}</strong>
          <span className="mt-1 block truncate text-xs text-ds-texto-2">{item.training_nr} · {item.client_name} · {item.days_present}/{item.days_total} dia(s)</span>
        </span>
      </button>)}
      {achados.length === 0 ? <p className="text-xs text-ds-texto-2">Nenhum aluno com esse nome ou CPF.</p> : null}
    </div> : <div className="mt-5 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="bg-ds-superficie p-3">
        <Calendar mode="single" selected={selecionada} onSelect={setSelecionada} locale={ptBR}
          modifiers={{ turma: comTurma }} modifiersClassNames={{ turma: 'bg-black text-ds-amarelo font-bold' }}
          className="mx-auto w-full [--cell-size:--spacing(10)]" />
      </div>
      <div>
        <span className="eyebrow text-ds-amarelo-texto">{selecionada ? formatDate(iso) : 'Escolha uma data'}</span>
        <div className="mt-3 space-y-2">
          {doDia.map(linhaTurma)}
          {doDia.length === 0 ? <p className="text-xs text-ds-texto-2">Nenhuma turma nesta data. Os dias com turma aparecem marcados no calendário.</p> : null}
        </div>
      </div>
    </div>}
  </div>;
}

export function CompanyParticipants({ data, reload, notify, turmaAlvo = null }: { data: CompanyDashboardData; reload: Reload; notify: Notify; turmaAlvo?: string | null }) {
  // Vindo da ficha da turma ("Abrir QR e participantes"), abre direto nela.
  const [trainingId, setTrainingId] = useState(() => (turmaAlvo && data.trainings.some((t) => t.id === turmaAlvo) ? turmaAlvo : turmaInicial(data.trainings, isoFromDate(new Date()))?.id ?? ''));
  const [trocando, setTrocando] = useState(false);
  const [gerando, setGerando] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [reload]);
  const training = data.trainings.find((item) => item.id === trainingId) || data.trainings[0];
  // Em ordem alfabética: é assim que a lista em papel é conferida.
  const participants = useMemo(
    () => (training ? data.participants.filter((item) => item.training_id === training.id).sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')) : []),
    [data.participants, training],
  );
  const presencas = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const item of data.attendance ?? []) {
      const conjunto = mapa.get(item.participant_id) ?? new Set<string>();
      conjunto.add(item.session_id);
      mapa.set(item.participant_id, conjunto);
    }
    return mapa;
  }, [data.attendance]);

  async function gerarDocumentos() {
    if (!training) return;
    setGerando(true);
    try {
      const resultado = await generateCertificates(training.id);
      notify(`${resultado.documents.length} documento(s) gerados de novo com a lista atual.`);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao gerar os documentos.');
    } finally {
      setGerando(false);
    }
  }

  if (!training) return <EmptyState icon={QrCode} title="Nenhum QR disponível" text="Crie um treinamento para gerar o formulário." />;
  const completos = participants.filter((item) => item.days_total > 0 && item.days_present >= item.days_total).length;

  return <div className="space-y-6">
    {trocando
      ? <SeletorDeTurma data={data} escolhida={training} aoEscolher={(id) => { setTrainingId(id); setTrocando(false); }} />
      : <div className="rounded-lg flex flex-wrap items-center gap-4 border border-ds-borda bg-ds-superficie p-4">
        <span className="rounded-md flex size-11 shrink-0 items-center justify-center bg-black font-ds-display text-xs font-bold text-ds-amarelo">{training.nr}</span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate ds-body-s font-semibold">{training.internal_label || training.title}</strong>
          <span className="mt-1 block truncate text-xs text-ds-texto-2"><span className="font-bold text-ds-amarelo-texto">{training.client_name}</span> · {formatDate(dataDoDia(training))}{rotuloDiaDaTurma(training)}</span>
        </span>
        <button type="button" onClick={() => setTrocando(true)} className="rounded-md inline-flex h-11 shrink-0 items-center gap-2 border border-ds-borda px-4 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv"><Search className="size-4" />Trocar turma</button>
      </div>}
    <QrPanel training={training} />
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-ds-amarelo-texto">Lista de presença · atualização automática</span>
          <h2 className="mt-2 ds-h4">Participantes</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ds-texto-2">{participants.length} inscrito(s) · {completos} com presença em todos os dias, que recebem certificado. Clique em D1, D2… para marcar ou desmarcar a presença do dia.</p>
        </div>
        {training.status === 'completed' ? <button type="button" onClick={() => void gerarDocumentos()} disabled={gerando} className="rounded-md inline-flex h-11 shrink-0 items-center gap-2 border border-ds-borda bg-ds-superficie px-4 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv disabled:opacity-50">{gerando ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Gerar documentos de novo</button> : null}
      </div>
      <AddParticipant training={training} reload={reload} notify={notify} />
      {participants.length > 0
        ? <ul className="space-y-2">{participants.map((participant) => <ParticipantRow key={participant.id} participant={participant} training={training} presentes={presencas.get(participant.id) ?? semPresenca} reload={reload} notify={notify} />)}</ul>
        : <EmptyState icon={UsersRound} title="Nenhum participante inscrito" text="Compartilhe o QR Code ou inclua os participantes aqui mesmo." />}
    </section>
  </div>;
}
