'use client';

import { Check, Copy, Download, FileText, Loader2, Pencil, Plus, QrCode, Trash2, UsersRound, X } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { EmptyState, formatDate, inputClass, PresencaBadge, selectClass } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyParticipant, CompanyTraining } from '@/lib/company-types';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
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
  return <div className="grid gap-7 border border-black/10 bg-white p-6 md:grid-cols-[280px_1fr] md:p-8"><div className="flex min-h-[280px] items-center justify-center bg-[#f7f7f4] p-4">{image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={250} height={250} unoptimized className="h-auto w-full max-w-[250px]" /> : <Loader2 className="size-7 animate-spin text-[#8a6107]" />}</div><div className="flex flex-col justify-between"><div><span className="eyebrow text-[#8a6107]">Formulário do treinamento</span><h2 className="mt-3 text-2xl font-black uppercase tracking-[0.03em]">{training.nr} · {training.title}</h2><p className="mt-2 text-sm font-bold text-[#8a6107]">{training.client_name}</p><p className="mt-5 break-all border-l-4 border-[#f2ad19] bg-[#fff8e8] p-3 font-mono text-[10px] leading-relaxed">{url}</p></div><div className="mt-6 grid gap-2 sm:grid-cols-3"><button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copiado' : 'Copiar link'}</button><a href={image} download={`qr-${training.code}.png`} className="inline-flex h-11 items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><Download className="size-4" />Baixar QR</a><a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 bg-[#f2ad19] text-[9px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]">Abrir formulário</a></div></div></div>;
}

const vazio: DadosParticipante = { fullName: '', documentId: '', rg: '', birthDate: '', email: '', phone: '', jobTitle: '' };

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

/** Campos da gestão: os mesmos para incluir e para corrigir um participante. */
function ParticipantFields({ draft, setDraft }: { draft: DadosParticipante; setDraft: (value: DadosParticipante) => void }) {
  const rotulo = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em]';
  return <>
    <label className="sm:col-span-2 xl:col-span-3"><span className={rotulo}>Nome completo *</span><input required value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className={inputClass} /></label>
    <label><span className={rotulo}>CPF * (só números)</span><input required inputMode="numeric" value={draft.documentId} onChange={(e) => setDraft({ ...draft, documentId: limparDigitacaoCpf(e.target.value) })} className={inputClass} /></label>
    <label><span className={rotulo}>RG * (sem lembrar: o CPF)</span><input required value={draft.rg} onChange={(e) => setDraft({ ...draft, rg: limparDigitacaoRg(e.target.value) })} className={inputClass} /></label>
    <label><span className={rotulo}>Data de nascimento</span><input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} className={inputClass} /></label>
    <label><span className={rotulo}>Cargo ou função</span><input value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} className={inputClass} /></label>
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
    return <button type="button" onClick={() => setAberto(true)} className="inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Plus className="size-4" />Incluir participante</button>;
  }
  return <form onSubmit={salvar} className="grid gap-3 border border-black/10 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
    <ParticipantFields draft={draft} setDraft={setDraft} />
    <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
      <button type="submit" disabled={salvando} className="inline-flex h-11 items-center gap-2 bg-black px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#f2ad19] hover:text-black disabled:opacity-50">{salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Incluir na lista</button>
      <button type="button" onClick={() => setAberto(false)} className="inline-flex h-11 items-center border border-black/15 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">Cancelar</button>
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

  const contato = [participant.job_title, participant.email || participant.phone].filter(Boolean).join(' · ');

  return <li className="border border-black/10 bg-white">
    <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <strong className="block text-sm leading-snug">{participant.full_name}</strong>
        <span className="mt-1 block text-xs text-[#666]">CPF {participant.document_id}{participant.rg ? ` · RG ${participant.rg}` : ''}</span>
        <span className="mt-1 block text-xs text-[#888]">{contato || 'Sem função e sem contato'} · inscrito em {formatDate(participant.created_at)}</span>
      </div>
      <div>
        <span className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#777]">Presença <PresencaBadge present={participant.days_present} total={participant.days_total} /></span>
        <div className="flex flex-wrap gap-1.5">{dias.map((dia) => {
          const presente = presentes.has(dia.id);
          return <button key={dia.id} type="button" disabled={Boolean(ocupado)} onClick={() => void alternarPresenca(dia.id, presente)} aria-pressed={presente} aria-label={`Dia ${dia.day_number}: ${presente ? 'presente, clique para desmarcar' : 'sem presença, clique para marcar'}`} title={`Dia ${dia.day_number} · ${formatDate(dia.session_date)}`} className={`inline-flex h-9 min-w-11 items-center justify-center gap-1 px-2 text-[11px] font-extrabold disabled:opacity-50 ${presente ? 'bg-[#17642d] text-white' : 'border border-dashed border-black/25 bg-white text-[#777] hover:border-[#17642d] hover:text-[#17642d]'}`}>{ocupado === dia.id ? <Loader2 className="size-3.5 animate-spin" /> : presente ? <Check className="size-3.5" /> : null}D{dia.day_number}</button>;
        })}</div>
      </div>
      <div className="flex gap-2 lg:justify-end">
        <button type="button" onClick={() => { setDraft(dadosDe(participant)); setEditando((v) => !v); }} className="inline-flex h-10 items-center gap-2 border border-black/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white">{editando ? <X className="size-4" /> : <Pencil className="size-4" />}{editando ? 'Fechar' : 'Editar'}</button>
        <button type="button" onClick={() => void remover()} disabled={Boolean(ocupado)} aria-label={`Remover ${participant.full_name}`} className="inline-flex size-10 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525] disabled:opacity-50"><Trash2 className="size-4" /></button>
      </div>
    </div>
    {editando ? <form onSubmit={salvar} className="grid gap-3 border-t border-black/8 bg-[#f7f7f4] p-4 sm:grid-cols-2 xl:grid-cols-3">
      <ParticipantFields draft={draft} setDraft={setDraft} />
      <div className="sm:col-span-2 xl:col-span-3">
        <button type="submit" disabled={Boolean(ocupado)} className="inline-flex h-11 items-center gap-2 bg-black px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#f2ad19] hover:text-black disabled:opacity-50">{ocupado === 'salvar' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
      </div>
    </form> : null}
  </li>;
}

const semPresenca = new Set<string>();

export function CompanyParticipants({ data, reload, notify }: { data: CompanyDashboardData; reload: Reload; notify: Notify }) {
  const [trainingId, setTrainingId] = useState(data.trainings[0]?.id || '');
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
    <label className="block max-w-xl"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Treinamento</span><select value={training.id} onChange={(e) => setTrainingId(e.target.value)} className={selectClass}>{data.trainings.map((item) => <option key={item.id} value={item.id}>{item.client_name} · {item.nr} · {item.internal_label ? `${item.internal_label} · ` : ''}{formatDate(item.training_date)}</option>)}</select></label>
    <QrPanel training={training} />
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-[#8a6107]">Lista de presença · atualização automática</span>
          <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Participantes</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#777]">{participants.length} inscrito(s) · {completos} com presença em todos os dias, que recebem certificado. Clique em D1, D2… para marcar ou desmarcar a presença do dia.</p>
        </div>
        {training.status === 'completed' ? <button type="button" onClick={() => void gerarDocumentos()} disabled={gerando} className="inline-flex h-11 shrink-0 items-center gap-2 border border-black/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white disabled:opacity-50">{gerando ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Gerar documentos de novo</button> : null}
      </div>
      <AddParticipant training={training} reload={reload} notify={notify} />
      {participants.length > 0
        ? <ul className="space-y-2">{participants.map((participant) => <ParticipantRow key={participant.id} participant={participant} training={training} presentes={presencas.get(participant.id) ?? semPresenca} reload={reload} notify={notify} />)}</ul>
        : <EmptyState icon={UsersRound} title="Nenhum participante inscrito" text="Compartilhe o QR Code ou inclua os participantes aqui mesmo." />}
    </section>
  </div>;
}
