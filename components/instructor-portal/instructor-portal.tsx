'use client';

import {
  CalendarCheck2,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { Calendar } from '@/components/ui/calendar';
import type { CompanyParticipant, CompanyTraining } from '@/lib/company-types';
import { INSTRUCTOR_DOCUMENT_STATUS, REQUIRED_INSTRUCTOR_DOCUMENTS } from '@/lib/instructor-documents';
import type { InstructorDashboardData } from '@/lib/instructor-types';

type Section = 'overview' | 'calendar' | 'trainings' | 'active' | 'documents' | 'profile';

const navigation = [
  { id: 'overview' as const, label: 'Visão geral', icon: LayoutDashboard },
  { id: 'calendar' as const, label: 'Calendário', icon: CalendarDays },
  { id: 'trainings' as const, label: 'Treinamentos', icon: GraduationCap },
  { id: 'active' as const, label: 'Iniciar treinamento', icon: Play },
  { id: 'documents' as const, label: 'Meus documentos', icon: ShieldCheck },
  { id: 'profile' as const, label: 'Meu cadastro', icon: UserRound },
];

const copy: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Minha operação', description: 'Próximas turmas, disponibilidade e inscrições em um só painel.' },
  calendar: { title: 'Agenda e disponibilidade', description: 'Confira os treinamentos atribuídos e informe quando pode atender novas turmas.' },
  trainings: { title: 'Meus treinamentos', description: 'Veja somente as turmas atribuídas ao seu cadastro pela Space Light.' },
  active: { title: 'Sala do treinamento', description: 'Inicie a turma, apresente o QR Code e acompanhe as inscrições.' },
  documents: { title: 'Meus documentos', description: 'CNH, assinatura e MTE/RÉ exigidos pela Space Light para liberar as turmas.' },
  profile: { title: 'Meu cadastro', description: 'Consulte os dados profissionais usados pela equipe de gestão.' },
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function isoFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = dateFromIso(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).format(date).replace('.', '');
}

/** Carimbos do banco vêm como "2026-09-04 00:59:32" (UTC), não como data pura. */
function formatMoment(value: string) {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function statusLabel(status: string) {
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'completed') return 'Concluído';
  return 'Agendado';
}

function SectionHeader({ section }: { section: Section }) {
  const current = copy[section];
  return <div className="border-b border-black/12 pb-7"><span className="eyebrow text-[#8a6107]">Área do Instrutor</span><h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.055em] md:text-5xl">{current.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#666] md:text-base">{current.description}</p></div>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-black/20 bg-white p-8 text-center"><span className="flex size-12 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><Icon className="size-5" /></span><strong className="mt-5 text-sm uppercase">{title}</strong><p className="mt-2 max-w-md text-xs leading-relaxed text-[#777]">{text}</p></div>;
}

function TrainingCard({ training, onStart }: { training: CompanyTraining; onStart?: (training: CompanyTraining) => void }) {
  return <article className="border border-black/10 bg-white p-5 md:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><span className="flex size-14 shrink-0 items-center justify-center bg-black font-heading text-sm font-black text-[#f2ad19]">{training.nr}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase ${training.status === 'in_progress' ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#785303]'}`}>{statusLabel(training.status)}</span><span className="text-[9px] font-bold uppercase tracking-[.1em] text-[#999]">{training.code}</span></div><h2 className="mt-3 text-lg font-extrabold uppercase tracking-[-.03em]">{training.title}</h2><p className="mt-2 text-xs font-bold text-[#8a6107]">{training.client_name}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#666]"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(training.training_date)}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{training.duration}</span><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{training.location}</span></div></div>{onStart && training.status !== 'completed' ? <button type="button" onClick={() => onStart(training)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-[#f2ad19] px-4 text-[9px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]"><Play className="size-4" />{training.status === 'in_progress' ? 'Abrir sala' : 'Iniciar'}</button> : null}</div><div className="mt-5 grid grid-cols-2 gap-px bg-black/8 text-center"><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{training.participant_count}</strong><span className="text-[8px] font-bold uppercase text-[#888]">Inscritos</span></div><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{training.participant_limit || '—'}</strong><span className="text-[8px] font-bold uppercase text-[#888]">Vagas</span></div></div></article>;
}

function Overview({ data, navigate, openTraining }: { data: InstructorDashboardData; navigate: (section: Section) => void; openTraining: (training: CompanyTraining) => void }) {
  const today = isoFromDate(new Date());
  const upcoming = data.trainings.filter((item) => item.training_date >= today && item.status !== 'completed');
  const next = upcoming[0];
  const active = data.trainings.find((item) => item.status === 'in_progress');
  return <div className="space-y-6"><div className="grid gap-px bg-black/10 sm:grid-cols-3">{[[upcoming.length, 'Próximas turmas'], [data.availability.length, 'Datas disponíveis'], [data.participants.length, 'Inscrições recebidas']].map(([value, label]) => <div key={label} className="bg-white p-6"><strong className="text-4xl font-black tracking-[-.05em]">{value}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[.1em] text-[#777]">{label}</span></div>)}</div>{active ? <div className="border-l-4 border-[#f2ad19] bg-black p-6 text-white"><span className="eyebrow text-[#f2ad19]">Treinamento em andamento</span><h2 className="mt-3 text-2xl font-black uppercase">{active.nr} · {active.title}</h2><button type="button" onClick={() => openTraining(active)} className="mt-5 inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-5 text-[9px] font-extrabold uppercase text-black"><QrCode className="size-4" />Abrir QR e lista</button></div> : null}<section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow text-[#8a6107]">Próxima entrega</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-.04em]">Próximo treinamento</h2></div><button type="button" onClick={() => navigate('trainings')} className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#8a6107]">Ver todos</button></div>{next ? <TrainingCard training={next} onStart={openTraining} /> : <Empty icon={CalendarCheck2} title="Nenhuma turma agendada" text="Quando a gestão atribuir um treinamento, ele aparecerá aqui." />}</section></div>;
}

function InstructorCalendar({ data, reload, notify }: { data: InstructorDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [selected, setSelected] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  const trainingDates = data.trainings.map((item) => dateFromIso(item.training_date));
  const availableDates = data.availability.map((item) => dateFromIso(item.available_date));
  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return notify('Selecione uma data no calendário.');
    try {
      await requestJson('/api/instructor/availability', { method: 'POST', body: JSON.stringify({ availableDate: isoFromDate(selected), note }) });
      notify('Disponibilidade registrada.'); setNote(''); await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar a data.'); }
  }
  async function remove(id: string) {
    try { await requestJson('/api/instructor/availability', { method: 'DELETE', body: JSON.stringify({ availabilityId: id }) }); notify('Disponibilidade removida.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao remover a data.'); }
  }
  return <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="border border-black/10 bg-white p-5 sm:p-7"><Calendar mode="single" selected={selected} onSelect={setSelected} locale={ptBR} modifiers={{ training: trainingDates, available: availableDates }} modifiersClassNames={{ training: 'bg-black text-[#f2ad19] font-bold', available: 'ring-2 ring-[#f2ad19] ring-inset' }} className="mx-auto w-full [--cell-size:--spacing(11)]" /><div className="mt-5 flex flex-wrap gap-4 border-t border-black/10 pt-4 text-[9px] font-bold uppercase text-[#777]"><span className="flex items-center gap-2"><i className="size-3 bg-black" />Treinamento</span><span className="flex items-center gap-2"><i className="size-3 border-2 border-[#f2ad19]" />Disponível</span></div><form onSubmit={save} className="mt-5 space-y-3"><div className="border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 text-xs"><strong>{selected ? formatDate(isoFromDate(selected)) : 'Selecione uma data'}</strong><p className="mt-1 text-[#777]">A gestão verá esta data ao organizar novas turmas.</p></div><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação opcional" className="h-12 w-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#f2ad19]" /><button type="submit" className="h-12 w-full bg-[#f2ad19] text-[9px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]"><Check className="mr-2 inline size-4" />Marcar disponibilidade</button></form></div><div><span className="eyebrow text-[#8a6107]">Datas informadas</span><h2 className="mt-2 text-2xl font-extrabold uppercase">Minha disponibilidade</h2><div className="mt-5 space-y-3">{data.availability.map((item) => <article key={item.id} className="flex items-center gap-4 border border-black/10 bg-white p-4"><span className="flex size-11 shrink-0 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><CalendarCheck2 className="size-5" /></span><div className="min-w-0 flex-1"><strong className="block text-sm uppercase">{formatDate(item.available_date)}</strong><p className="mt-1 truncate text-xs text-[#777]">{item.note || 'Disponível para novas turmas'}</p></div><button type="button" onClick={() => void remove(item.id)} aria-label="Remover disponibilidade" className="flex size-10 items-center justify-center border border-black/10 text-[#777] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-4" /></button></article>)}{data.availability.length === 0 ? <Empty icon={CalendarCheck2} title="Nenhuma data informada" text="Escolha no calendário os dias em que você pode ministrar treinamentos." /> : null}</div></div></div>;
}

type TrainingFile = { id: string; name: string; kind: string; size: number; contentType: string; createdAt: string; stored: boolean };

const attendanceCopy = {
  eyebrow: 'Comprovação',
  title: 'Foto da lista assinada',
  help: 'Fotografe a lista de presença assinada em papel e envie aqui. É o seu comprovante de que a turma aconteceu; a Space Light e o cliente veem a foto.',
  accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
  empty: 'Nenhuma foto enviada ainda. Aceita JPG, PNG, WEBP ou HEIC, até 4 MB.',
  button: 'Enviar foto',
} as const;

function TrainingFiles({ trainingId, notify }: { trainingId: string; notify: (message: string) => void }) {
  const [files, setFiles] = useState<TrainingFile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const copy = attendanceCopy;

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ files: TrainingFile[] }>(`/api/instructor/trainings/${trainingId}/files`, { cache: 'no-store' });
      setFiles(result.files);
    } catch { setFiles([]); }
  }, [trainingId]);

  useEffect(() => { void load(); }, [load]);

  async function send(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    if (chosen.length === 0) return;
    setUploading(true);
    let ok = 0;
    const falhas: string[] = [];
    // Um arquivo por requisição: função da Vercel aceita no máximo 4,5 MB por vez.
    for (const file of chosen) {
      try {
        const body = new FormData();
        body.append('file', file);
          const response = await fetch(`/api/instructor/trainings/${trainingId}/files`, { method: 'POST', body });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'falhou');
        ok += 1;
      } catch (error) {
        falhas.push(`${file.name} (${error instanceof Error ? error.message : 'erro'})`);
      }
    }
    notify(falhas.length
      ? `${ok} enviado(s). Falhou: ${falhas.join('; ')}`
      : `${ok} arquivo(s) enviado(s).`);
    await load();
    setUploading(false);
    input.value = '';
  }

  return <section className="border border-black/10 bg-white p-6 md:p-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="eyebrow text-[#8a6107]">{copy.eyebrow}</span><h2 className="mt-2 text-2xl font-extrabold uppercase">{copy.title}</h2><p className="mt-2 max-w-xl text-xs leading-relaxed text-[#666]">{copy.help}</p></div>
      <label className={`inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploading ? 'Enviando…' : copy.button}
        <input type="file" multiple accept={copy.accept} onChange={(event) => void send(event)} className="hidden" />
      </label>
    </div>
    {files === null ? <div className="mt-6 flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-[#8a6107]" /></div>
      : files.length === 0 ? <p className="mt-6 border border-dashed border-black/20 p-5 text-center text-xs text-[#777]">{copy.empty}</p>
      : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{files.map((file) => <figure key={file.id} className="border border-black/10">
            <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="relative block aspect-[4/3] overflow-hidden bg-[#f7f7f4]">
              {file.stored ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 33vw, 100vw" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[9px] font-extrabold uppercase text-[#999]">Sem conteúdo</span>}
            </a>
            <figcaption className="p-3"><strong className="block truncate text-xs" title={file.name}>{file.name}</strong><span className="mt-1 block text-[10px] text-[#999]">{Math.max(1, Math.round(file.size / 1024))} KB · {formatMoment(file.createdAt)}</span>
              {file.stored ? <a href={`/api/files/${file.id}?download=1`} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white"><Download className="size-3.5" />Baixar</a> : null}
            </figcaption>
          </figure>)}</div>}
  </section>;
}

function TrainingRoom({ data, selectedId, selectTraining, reload, notify }: { data: InstructorDashboardData; selectedId: string; selectTraining: (id: string) => void; reload: () => Promise<void>; notify: (message: string) => void }) {
  const training = data.trainings.find((item) => item.id === selectedId) || data.trainings.find((item) => item.status === 'in_progress') || data.trainings[0];
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [participants, setParticipants] = useState<CompanyParticipant[]>(training ? data.participants.filter((item) => item.training_id === training.id) : []);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ fullName: '', documentId: '', rg: '', birthDate: '', jobTitle: '', email: '', phone: '' });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (!training || training.status !== 'in_progress') { setImage(''); setUrl(''); return; }
    const publicUrl = `${window.location.origin}/participar/${training.qr_token}`;
    setUrl(publicUrl);
    void QRCode.toDataURL(publicUrl, { width: 420, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b0b', light: '#ffffff' } }).then(setImage);
  }, [training?.id, training?.qr_token, training?.status]);

  useEffect(() => {
    if (!training || training.status !== 'in_progress') return;
    let active = true;
    async function poll() {
      try {
        const result = await requestJson<{ participants: CompanyParticipant[] }>(`/api/instructor/trainings/${encodeURIComponent(training!.id)}/participants`);
        if (active) setParticipants(result.participants);
      } catch { /* mantém a última lista enquanto tenta novamente */ }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [training?.id, training?.status]);

  useEffect(() => { void refreshParticipants(); }, [training?.id]);

  async function start() {
    if (!training) return;
    setStarting(true);
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/start`, { method: 'POST' });
      notify('Treinamento iniciado. O formulário do QR Code está liberado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao iniciar a turma.'); }
    finally { setStarting(false); }
  }
  async function copyUrl() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  async function refreshParticipants() {
    if (!training) return;
    try {
      const result = await requestJson<{ participants: CompanyParticipant[] }>(`/api/instructor/trainings/${encodeURIComponent(training.id)}/participants`);
      setParticipants(result.participants);
    } catch { /* silencioso */ }
  }
  async function complete() {
    if (!training) return;
    setEnding(true);
    try {
      const resultado = await requestJson<{ certificates?: number; certificatePublished?: boolean; certificateProblem?: string | null }>(`/api/instructor/trainings/${encodeURIComponent(training.id)}/complete`, { method: 'POST' });
      notify(!resultado.certificates
        ? 'Treinamento encerrado. A lista de presença foi congelada.'
        : resultado.certificatePublished
          ? `Treinamento encerrado. ${resultado.certificates} certificado(s) emitidos; certificado da empresa e atestado ficaram nos documentos da turma.`
          : `Treinamento encerrado, mas o PDF dos certificados não foi gerado: ${resultado.certificateProblem ?? 'motivo desconhecido'}. Avise a Space Light.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao encerrar o treinamento.'); }
    finally { setEnding(false); }
  }
  async function addManual(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!training) return;
    setSavingManual(true);
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/participants`, { method: 'POST', body: JSON.stringify(manual) });
      setManual({ fullName: '', documentId: '', rg: '', birthDate: '', jobTitle: '', email: '', phone: '' });
      setShowManual(false);
      notify('Participante adicionado à lista.');
      await refreshParticipants();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao adicionar participante.'); }
    finally { setSavingManual(false); }
  }
  async function removeParticipant(participantId: string) {
    if (!training) return;
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/participants`, { method: 'DELETE', body: JSON.stringify({ participantId }) });
      notify('Participante removido.');
      await refreshParticipants();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao remover participante.'); }
  }
  function exportCsv() {
    if (!training) return;
    const header = ['Nome', 'Identificador', 'Função', 'E-mail', 'Telefone', 'Entrada'];
    const body = participants.map((p) => [p.full_name, p.document_id, p.job_title, p.email, p.phone, new Date(p.created_at).toLocaleString('pt-BR')]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'));
    const csv = '﻿' + [header.join(';'), ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-presenca-${training.nr.replace(/\s+/g, '')}-${training.code}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!training) return <Empty icon={QrCode} title="Nenhum treinamento atribuído" text="A sala será liberada quando a gestão atribuir uma turma ao seu cadastro." />;
  return <div className="space-y-6"><label className="block max-w-2xl"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[.1em]">Treinamento</span><select value={training.id} onChange={(event) => selectTraining(event.target.value)} className="h-12 w-full border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]">{data.trainings.map((item) => <option key={item.id} value={item.id}>{item.client_name} · {item.nr} · {formatDate(item.training_date)}</option>)}</select></label><div><a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 border border-black/15 bg-white px-4 text-[9px] font-extrabold uppercase tracking-[.1em] hover:bg-black hover:text-white"><FileText className="size-4" />Gerar lista de presença (PDF)</a></div>{training.status !== 'in_progress' ? <section className="border-t-4 border-[#f2ad19] bg-white p-7 md:p-10"><span className="eyebrow text-[#8a6107]">{training.status === 'completed' ? 'Treinamento concluído' : 'Pronto para começar'}</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[-.05em]">{training.nr} · {training.title}</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#666]">{training.status === 'completed' ? 'Este treinamento foi encerrado. A lista de presença está congelada e pode ser exportada abaixo.' : 'Ao iniciar, o QR Code de presença será exibido e o formulário ficará disponível para os participantes.'}</p>{training.status === 'completed' ? <div className="mt-7 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 bg-[#daf2df] px-4 py-2 text-[10px] font-extrabold uppercase text-[#17642d]"><Check className="size-4" />Concluído · {participants.length} presença(s)</span><button type="button" onClick={exportCsv} disabled={participants.length === 0} className="inline-flex h-11 items-center gap-2 border border-black/15 px-4 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white disabled:opacity-40"><Download className="size-4" />Exportar CSV</button></div> : <button type="button" onClick={() => void start()} disabled={starting} className="mt-7 inline-flex h-14 items-center gap-3 bg-[#f2ad19] px-7 text-[10px] font-extrabold uppercase tracking-[.12em] text-black disabled:opacity-50">{starting ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />}Iniciar treinamento</button>}</section> : <><section className="grid gap-6 border border-black/10 bg-white p-6 lg:grid-cols-[380px_1fr] lg:p-8"><div className="flex min-h-[340px] items-center justify-center bg-[#f7f7f4] p-4">{image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={360} height={360} unoptimized className="h-auto w-full max-w-[360px]" /> : <Loader2 className="size-8 animate-spin text-[#8a6107]" />}</div><div className="flex flex-col justify-between"><div><span className="eyebrow text-[#8a6107]">Turma em andamento</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[-.05em]">{training.nr} · {training.title}</h2><p className="mt-2 text-sm font-bold text-[#8a6107]">{training.client_name}</p><p className="mt-6 break-all border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 font-mono text-[10px]">{url}</p></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void copyUrl()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copiado' : 'Copiar link'}</button><button type="button" onClick={() => void complete()} disabled={ending} className="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-black px-4 text-[9px] font-extrabold uppercase text-white hover:bg-[#b62525] disabled:opacity-50">{ending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Encerrar treinamento</button></div></div></section><section><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow text-[#8a6107]">Atualização automática</span><h2 className="mt-2 text-2xl font-extrabold uppercase">Quem já preencheu</h2></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 text-xs font-bold text-[#777]"><RefreshCw className="size-3.5" />{participants.length} de {training.participant_limit || '—'}</span><button type="button" onClick={exportCsv} disabled={participants.length === 0} className="inline-flex h-10 items-center gap-2 border border-black/15 px-3 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white disabled:opacity-40"><Download className="size-4" />CSV</button><button type="button" onClick={() => setShowManual((value) => !value)} className="inline-flex h-10 items-center gap-2 bg-[#f2ad19] px-3 text-[9px] font-extrabold uppercase text-black hover:bg-[#ff9900]"><Plus className="size-4" />Adicionar</button></div></div>{showManual ? <form onSubmit={addManual} className="mb-4 grid gap-3 border border-black/10 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3"><input required value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} placeholder="Nome completo *" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input required value={manual.documentId} onChange={(e) => setManual({ ...manual, documentId: e.target.value })} placeholder="CPF *" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.rg} onChange={(e) => setManual({ ...manual, rg: e.target.value })} placeholder="RG" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input type="date" value={manual.birthDate} onChange={(e) => setManual({ ...manual, birthDate: e.target.value })} title="Data de nascimento" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.jobTitle} onChange={(e) => setManual({ ...manual, jobTitle: e.target.value })} placeholder="Função" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="E-mail" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} placeholder="Telefone" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><button type="submit" disabled={savingManual} className="inline-flex h-11 items-center justify-center gap-2 bg-black text-[9px] font-extrabold uppercase text-white hover:bg-[#f2ad19] hover:text-black disabled:opacity-50">{savingManual ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Adicionar à lista</button></form> : null}{participants.length ? <div className="overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-black text-[9px] font-extrabold uppercase tracking-[.1em] text-white"><tr><th className="p-4">Participante</th><th className="p-4">Identificador</th><th className="p-4">Função</th><th className="p-4">Contato</th><th className="p-4">Entrada</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-black/8">{participants.map((participant) => <tr key={participant.id}><td className="p-4 font-bold">{participant.full_name}</td><td className="p-4 text-[#666]">{participant.document_id}</td><td className="p-4 text-[#666]">{participant.job_title || '—'}</td><td className="p-4 text-[#666]">{participant.email || participant.phone || '—'}</td><td className="p-4 text-[#666]">{new Date(participant.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td className="p-4 text-right"><button type="button" onClick={() => void removeParticipant(participant.id)} aria-label={`Remover ${participant.full_name}`} className="inline-flex size-8 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button></td></tr>)}</tbody></table></div> : <Empty icon={UsersRound} title="Aguardando participantes" text="Adicione manualmente ou aguarde o preenchimento pelo QR Code." />}</section></>}<TrainingFiles trainingId={training.id} notify={notify} /></div>;
}

function Profile({ data, reload, notify }: { data: InstructorDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [form, setForm] = useState({
    name: data.instructor.name,
    phone: data.instructor.phone,
    professionalRegistry: data.instructor.professional_registry,
    baseCity: data.instructor.base_city,
    specialties: data.instructor.specialties,
  });
  const [saving, setSaving] = useState(false);
  const inputCls = 'h-12 w-full border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]';
  const lockedCls = 'h-12 w-full border border-black/15 bg-[#f2f2f0] px-3 text-sm text-[#888]';
  const labelCls = 'mb-2 block text-[9px] font-extrabold uppercase tracking-[.1em] text-[#888]';
  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await requestJson('/api/instructor/profile', { method: 'POST', body: JSON.stringify(form) });
      notify('Cadastro atualizado com sucesso.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o cadastro.'); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
    <section className="h-fit bg-black p-7 text-white"><UserRound className="size-10 text-[#f2ad19]" /><span className="eyebrow mt-8 block text-[#f2ad19]">Instrutor aprovado</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[-.05em]">{data.instructor.name}</h2><p className="mt-4 text-sm leading-relaxed text-white/55">Atualize seus dados de contato e profissionais. CPF e e-mail de acesso são alterados apenas pela gestão da Space Light.</p></section>
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelCls}>Nome completo</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></label>
        <label><span className={labelCls}>CPF (não editável)</span><input value={data.instructor.document} disabled className={lockedCls} /></label>
        <label><span className={labelCls}>E-mail de acesso (não editável)</span><input value={data.instructor.email} disabled className={lockedCls} /></label>
        <label><span className={labelCls}>Telefone / WhatsApp</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></label>
        <label><span className={labelCls}>Registro profissional</span><input value={form.professionalRegistry} onChange={(e) => setForm({ ...form, professionalRegistry: e.target.value })} className={inputCls} /></label>
        <label><span className={labelCls}>Cidade base</span><input value={form.baseCity} onChange={(e) => setForm({ ...form, baseCity: e.target.value })} className={inputCls} /></label>
        <label className="sm:col-span-2"><span className={labelCls}>Especialidades / NRs</span><input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className={inputCls} /></label>
      </div>
      <button type="submit" disabled={saving} className="inline-flex h-12 items-center gap-2 bg-[#f2ad19] px-6 text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
    </form>
  </div>;
}

type MyDocument = { id: string; category: string; name: string; status: string; size: number; createdAt: string };

function InstructorDocuments({ notify }: { notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<MyDocument[] | null>(null);
  const [sending, setSending] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ documents: MyDocument[] }>('/api/instructor/documents', { cache: 'no-store' });
      setDocuments(result.documents);
    } catch { setDocuments([]); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function send(category: string, event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setSending(category);
    try {
      const body = new FormData();
      body.append('category', category);
      body.append('file', chosen);
      const response = await fetch('/api/instructor/documents', { method: 'POST', body });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar.');
      notify('Documento enviado. A Space Light vai analisar.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao enviar o documento.');
    } finally {
      setSending('');
      input.value = '';
    }
  }

  const porCategoria = new Map((documents ?? []).map((item) => [item.category, item]));

  return <div className="space-y-4">
    {documents === null ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-[#8a6107]" /></div>
      : REQUIRED_INSTRUCTOR_DOCUMENTS.map((required) => {
        const enviado = porCategoria.get(required.category);
        const situacao = enviado ? INSTRUCTOR_DOCUMENT_STATUS[enviado.status] : null;
        const cor = !situacao ? 'bg-[#f3f3f0] text-[#777]'
          : situacao.tone === 'ok' ? 'bg-[#daf2df] text-[#17642d]'
          : situacao.tone === 'bad' ? 'bg-[#f3d4d4] text-[#8f1717]'
          : 'bg-[#fff0d2] text-[#8a6107]';
        return <article key={required.category} className="border border-black/10 bg-white p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-base font-extrabold uppercase tracking-[-.02em]">{required.label}</strong>
                <span className={`px-2 py-1 text-[9px] font-extrabold uppercase ${cor}`}>{situacao?.label ?? 'Não enviado'}</span>
              </div>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-[#666]">{required.help}</p>
              {enviado ? <p className="mt-2 text-[10px] text-[#999]">{enviado.name} · {Math.max(1, Math.round(enviado.size / 1024))} KB · {formatMoment(enviado.createdAt)}</p> : null}
              {enviado?.status === 'rejected' ? <p className="mt-2 border-l-2 border-[#b62525] bg-[#f3d4d4]/50 px-3 py-2 text-[11px] leading-relaxed text-[#8f1717]">A Space Light recusou este documento. Envie outro arquivo, mais legível ou dentro da validade.</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {enviado ? <a href={`/api/instructor-documents/${enviado.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 border border-black/15 px-3 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white">Ver</a> : null}
              <label className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 px-4 text-[9px] font-extrabold uppercase tracking-[.1em] ${enviado ? 'border border-black/15 hover:bg-black hover:text-white' : 'bg-[#f2ad19] text-black hover:bg-[#ff9900]'} ${sending === required.category ? 'pointer-events-none opacity-60' : ''}`}>
                {sending === required.category ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {sending === required.category ? 'Enviando…' : enviado ? 'Reenviar' : 'Enviar'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={(event) => void send(required.category, event)} className="hidden" />
              </label>
            </div>
          </div>
        </article>;
      })}
  </div>;
}

function PendingApproval({ data, notify }: { data: InstructorDashboardData; notify: (message: string) => void }) {
  return <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
    <div className="border-l-4 border-[#f2ad19] bg-white p-6 md:p-8">
      <span className="eyebrow text-[#8a6107]">Cadastro em análise</span>
      <h1 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-.05em]">Falta pouco, {data.instructor.name.split(' ')[0]}</h1>
      <p className="mt-4 text-sm leading-relaxed text-[#666]">Envie os três documentos abaixo. A Space Light analisa e libera o seu acesso às turmas — você recebe o aviso pelo WhatsApp cadastrado.</p>
    </div>
    <div className="mt-6"><InstructorDocuments notify={notify} /></div>
    <form action="/api/auth/logout" method="post" className="mt-8">
      <button type="submit" className="inline-flex h-11 items-center gap-2 border border-black/15 bg-white px-4 text-[9px] font-extrabold uppercase tracking-[.1em] hover:bg-black hover:text-white"><LogOut className="size-4" />Sair</button>
    </form>
  </div>;
}

export function InstructorPortal({ initialData }: { initialData: InstructorDashboardData }) {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState('');
  const [selectedTrainingId, setSelectedTrainingId] = useState(initialData.trainings.find((item) => item.status === 'in_progress')?.id || initialData.trainings[0]?.id || '');
  const reload = useCallback(async () => setData(await requestJson<InstructorDashboardData>('/api/instructor/dashboard')), []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer); }, [notice]);
  function openTraining(training: CompanyTraining) { setSelectedTrainingId(training.id); setSection('active'); }
  const content = useMemo(() => {
    if (section === 'overview') return <Overview data={data} navigate={setSection} openTraining={openTraining} />;
    if (section === 'calendar') return <InstructorCalendar data={data} reload={reload} notify={setNotice} />;
    if (section === 'trainings') return <div className="grid gap-4 xl:grid-cols-2">{data.trainings.map((training) => <TrainingCard key={training.id} training={training} onStart={openTraining} />)}{data.trainings.length === 0 ? <div className="xl:col-span-2"><Empty icon={GraduationCap} title="Nenhuma turma atribuída" text="A gestão da Space Light vinculará seus próximos treinamentos aqui." /></div> : null}</div>;
    if (section === 'active') return <TrainingRoom data={data} selectedId={selectedTrainingId} selectTraining={setSelectedTrainingId} reload={reload} notify={setNotice} />;
    if (section === 'documents') return <InstructorDocuments notify={setNotice} />;
    return <Profile data={data} reload={reload} notify={setNotice} />;
  }, [data, reload, section, selectedTrainingId]);

  // Cadastro em análise: a única coisa que ele pode fazer é enviar documento.
  if (data.instructor.status === 'pending') {
    return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">{notice ? <output className="fixed inset-x-4 top-6 z-[70] border-l-4 border-[#f2ad19] bg-black p-4 text-sm text-white shadow-xl sm:inset-x-auto sm:right-6">{notice}</output> : null}<header className="flex h-[76px] items-center border-b border-black/10 bg-black px-5 sm:px-8"><Link href="/"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link></header><PendingApproval data={data} notify={setNotice} /></main>;
  }

  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">{notice ? <output className="fixed inset-x-4 top-20 z-[70] max-w-none border-l-4 border-[#f2ad19] bg-black p-4 text-sm text-white shadow-xl sm:inset-x-auto sm:right-4 sm:top-24 sm:max-w-sm">{notice}</output> : null}<header className="sticky top-0 z-50 flex h-[76px] items-center justify-between border-b border-white/10 bg-black px-4 text-white sm:px-7"><div className="flex items-center gap-5"><Link href="/"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link><span className="hidden h-8 w-px bg-white/15 sm:block" /><div className="hidden sm:block"><strong className="block text-xs">Área do Instrutor</strong><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.1em] text-white/40">{data.instructor.name}</span></div></div><div className="flex gap-2"><button type="button" onClick={() => void reload()} aria-label="Atualizar dados" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><RefreshCw className="size-4" /></button><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sair" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><LogOut className="size-4" /></button></form></div></header><div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="hidden min-h-[calc(100vh-76px)] bg-[#171716] p-5 text-white lg:block"><div className="sticky top-[96px]"><span className="eyebrow px-3 text-[#f2ad19]">Minha rotina</span><nav className="mt-5 space-y-1" aria-label="Navegação do instrutor">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex h-12 w-full items-center gap-3 px-3 text-left text-[10px] font-extrabold uppercase tracking-[.08em] ${section === id ? 'bg-[#f2ad19] text-black' : 'text-white/58 hover:bg-white/8 hover:text-white'}`}><Icon className="size-4" />{label}</button>)}</nav></div></aside><div className="min-w-0"><nav className="grid grid-cols-5 overflow-x-auto border-b border-black/10 bg-white lg:hidden" aria-label="Navegação móvel do instrutor">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex min-w-[72px] flex-col items-center gap-1.5 border-r border-black/8 px-2 py-3 text-[8px] font-extrabold uppercase ${section === id ? 'bg-[#f2ad19]' : 'text-[#666]'}`}><Icon className="size-4" />{label.split(' ')[0]}</button>)}</nav><section className="p-4 sm:p-6 md:p-8 xl:p-11"><SectionHeader section={section} /><div className="mt-7">{content}</div></section></div></div></main>;
}
