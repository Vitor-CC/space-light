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

import { PresencaBadge } from '@/components/company-portal/company-ui';
import { Calendar } from '@/components/ui/calendar';
import type { CompanyParticipant, CompanyTraining, TrainingSession } from '@/lib/company-types';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
import { INSTRUCTOR_DOCUMENT_STATUS, REQUIRED_INSTRUCTOR_DOCUMENTS } from '@/lib/instructor-documents';
import type { InstructorDashboardData } from '@/lib/instructor-types';

type Section = 'overview' | 'calendar' | 'trainings' | 'active' | 'documents' | 'profile';

const navigation = [
  // "curto" é o rótulo do celular: cortar na primeira palavra transformava
  // "Meus documentos" e "Meu cadastro" em "Meus" e "Meu".
  { id: 'overview' as const, label: 'Visão geral', curto: 'Visão', icon: LayoutDashboard },
  { id: 'calendar' as const, label: 'Calendário', curto: 'Agenda', icon: CalendarDays },
  { id: 'trainings' as const, label: 'Treinamentos', curto: 'Turmas', icon: GraduationCap },
  { id: 'active' as const, label: 'Iniciar treinamento', curto: 'Sala', icon: Play },
  { id: 'documents' as const, label: 'Meus documentos', curto: 'Documentos', icon: ShieldCheck },
  { id: 'profile' as const, label: 'Meu cadastro', curto: 'Cadastro', icon: UserRound },
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

/**
 * O dia deste instrutor nesta turma: o primeiro ainda aberto, ou o último que
 * ele deu. É sobre ele que iniciar e encerrar agem, no servidor também.
 */
/** "Sábado, 12 de setembro de 2026": maiúscula só na 1ª letra (o CSS capitalize punha "De"). */
function longDate(iso: string) {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(dateFromIso(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Um dia de aula do instrutor: a turma, qual dia dela é e quantos dias ela tem. */
type DiaDeAula = { training: CompanyTraining; session: TrainingSession; total: number };

function meuDia(training: CompanyTraining, instructorId: string) {
  const dias = training.sessions ?? [];
  const meus = dias.filter((dia) => dia.instructor_id === instructorId);
  const atual = meus.find((dia) => dia.status !== 'completed') ?? meus[meus.length - 1] ?? null;
  const ultimoPendente = Boolean(atual) && dias.every((dia) => dia.id === atual!.id || dia.status === 'completed');
  return { dias, meus, atual, ultimoPendente };
}

/** "Dia 2 de 3" — omitido quando a turma tem um dia só. */
function rotuloDoDia(training: CompanyTraining, instructorId: string) {
  const { dias, atual } = meuDia(training, instructorId);
  if (!atual || dias.length < 2) return '';
  return `Dia ${atual.day_number} de ${dias.length}`;
}

function janelaDoDia(session: { start_time: string; end_time: string } | null) {
  if (!session) return '';
  const inicio = (session.start_time ?? '').trim();
  const fim = (session.end_time ?? '').trim();
  if (inicio && fim) return `${inicio} às ${fim}`;
  return inicio || fim || '';
}

function statusLabel(status: string) {
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'completed') return 'Concluído';
  return 'Agendado';
}

function SectionHeader({ section }: { section: Section }) {
  const current = copy[section];
  return <div className="border-b border-black/12 pb-7"><span className="eyebrow text-[#8a6107]">Área do Instrutor</span><h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[0.01em] md:text-5xl md:tracking-normal">{current.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#666] md:text-base">{current.description}</p></div>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-black/20 bg-white p-8 text-center"><span className="flex size-12 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><Icon className="size-5" /></span><strong className="mt-5 text-sm uppercase tracking-[0.08em]">{title}</strong><p className="mt-2 max-w-md text-xs leading-relaxed text-[#777]">{text}</p></div>;
}

function TrainingCard({ training, onStart }: { training: CompanyTraining; onStart?: (training: CompanyTraining) => void }) {
  return <article className="border border-black/10 bg-white p-5 md:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><span className="flex size-14 shrink-0 items-center justify-center bg-black font-heading text-sm font-black text-[#f2ad19]">{training.nr}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${training.status === 'in_progress' ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#785303]'}`}>{statusLabel(training.status)}</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#999]">{training.code}</span></div><h2 className="mt-3 text-lg font-extrabold uppercase tracking-[0.05em]">{training.internal_label || training.title}</h2><p className="mt-2 text-xs font-bold text-[#8a6107]">{training.client_name}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#666]"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(training.training_date)}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{training.duration}</span><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{training.location}</span></div></div>{onStart && training.status !== 'completed' ? <button type="button" onClick={() => onStart(training)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-[#f2ad19] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Play className="size-4" />{training.status === 'in_progress' ? 'Abrir sala' : 'Iniciar'}</button> : null}</div><div className="mt-5 grid grid-cols-2 gap-px bg-black/8 text-center"><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{training.participant_count}</strong><span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#888]">Inscritos</span></div><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{(training.sessions ?? []).length || 1}</strong><span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#888]">{(training.sessions ?? []).length === 1 ? 'Dia' : 'Dias'}</span></div></div></article>;
}

function Overview({ data, navigate, openTraining }: { data: InstructorDashboardData; navigate: (section: Section) => void; openTraining: (training: CompanyTraining) => void }) {
  const today = isoFromDate(new Date());
  // Os dias em que ESTE instrutor dá aula: o de hoje é o que ele precisa ver primeiro.
  const meusDias = data.trainings.flatMap((training) => (training.sessions ?? [])
    .filter((dia) => dia.instructor_id === data.instructor.id)
    .map((session) => ({ training, session, total: (training.sessions ?? []).length })));
  const deHoje = meusDias.filter((item) => item.session.session_date === today);
  const proximoDeAula = meusDias
    .filter((item) => item.session.session_date > today && item.session.status !== 'completed')
    .sort((a, b) => a.session.session_date.localeCompare(b.session.session_date))[0];
  const hojeBloco = <section className="border-l-4 border-[#f2ad19] bg-black p-5 text-white md:p-6">
    <span className="eyebrow text-[#f2ad19]">Hoje · {longDate(today)}</span>
    {deHoje.length ? <ul className="mt-4 space-y-3">{deHoje.map(({ training, session, total }) => { const janela = janelaDoDia(session); return <li key={session.id} className="flex flex-col gap-3 border border-white/15 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <strong className="block text-lg font-black uppercase leading-tight tracking-[0.03em]">{training.nr} · {training.internal_label || training.title}</strong>
        <p className="mt-1 text-xs font-bold text-[#f2ad19]">{training.client_name}{total > 1 ? ` · Dia ${session.day_number} de ${total}` : ''}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65">{janela ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{janela}</span> : null}<span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{training.location}</span><span>{statusLabel(session.status)}</span></p>
      </div>
      <button type="button" onClick={() => openTraining(training)} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Play className="size-4" />Abrir sala</button>
    </li>; })}</ul> : <div className="mt-3">
      <strong className="block text-lg font-black uppercase tracking-[0.03em]">Nenhum treinamento seu hoje</strong>
      <p className="mt-1 text-xs text-white/60">{proximoDeAula ? `Próximo: ${longDate(proximoDeAula.session.session_date)} · ${proximoDeAula.training.nr} · ${proximoDeAula.training.internal_label || proximoDeAula.training.title}` : 'Nenhum treinamento futuro atribuído a você.'}</p>
      {proximoDeAula ? <button type="button" onClick={() => navigate('calendar')} className="mt-4 inline-flex h-11 items-center gap-2 border border-white/20 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:border-[#f2ad19]"><CalendarDays className="size-4" />Ver no calendário</button> : null}
    </div>}
  </section>;
  const upcoming = data.trainings.filter((item) => item.training_date >= today && item.status !== 'completed');
  const next = upcoming[0];
  const active = data.trainings.find((item) => item.status === 'in_progress');
  return <div className="space-y-6">{hojeBloco}<div className="grid gap-px bg-black/10 sm:grid-cols-3">{[[upcoming.length, 'Próximas turmas'], [data.availability.length, 'Datas disponíveis'], [data.participants.length, 'Inscrições recebidas']].map(([value, label]) => <div key={label} className="bg-white p-6"><strong className="text-4xl font-black tracking-[-0.015em]">{value}</strong><span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#777]">{label}</span></div>)}</div>{active ? <div className="border-l-4 border-[#f2ad19] bg-black p-6 text-white"><span className="eyebrow text-[#f2ad19]">Treinamento em andamento</span><h2 className="mt-3 text-2xl font-black uppercase tracking-[0.03em]">{active.nr} · {active.title}</h2><button type="button" onClick={() => openTraining(active)} className="mt-5 inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black"><QrCode className="size-4" />Abrir QR e lista</button></div> : null}<section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow text-[#8a6107]">Próxima entrega</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Próximo treinamento</h2></div><button type="button" onClick={() => navigate('trainings')} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">Ver todos</button></div>{next ? <TrainingCard training={next} onStart={openTraining} /> : <Empty icon={CalendarCheck2} title="Nenhuma turma agendada" text="Quando a gestão atribuir um treinamento, ele aparecerá aqui." />}</section></div>;
}

function InstructorCalendar({ data, reload, notify, openTraining }: { data: InstructorDashboardData; reload: () => Promise<void>; notify: (message: string) => void; openTraining: (training: CompanyTraining) => void }) {
  const [selected, setSelected] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  // Cada dia em que ESTE instrutor está escalado. Antes o calendário marcava só a
  // 1ª data da turma: os dias seguintes sumiam e aparecia dia de outro instrutor.
  const meusDias = useMemo(() => {
    const mapa = new Map<string, DiaDeAula[]>();
    for (const training of data.trainings) {
      const dias = training.sessions ?? [];
      for (const session of dias) {
        if (session.instructor_id !== data.instructor.id) continue;
        const lista = mapa.get(session.session_date) ?? [];
        lista.push({ training, session, total: dias.length });
        mapa.set(session.session_date, lista);
      }
    }
    return mapa;
  }, [data.trainings, data.instructor.id]);
  const trainingDates = useMemo(() => [...meusDias.keys()].map(dateFromIso), [meusDias]);
  const availableDates = data.availability.map((item) => dateFromIso(item.available_date));
  const hoje = isoFromDate(new Date());
  const proximos = useMemo(
    () => [...meusDias.entries()].filter(([iso]) => iso >= hoje).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 6),
    [meusDias, hoje],
  );
  const selectedIso = selected ? isoFromDate(selected) : '';
  const doDia = selectedIso ? meusDias.get(selectedIso) ?? [] : [];
  const disponivelNoDia = selectedIso ? data.availability.find((item) => item.available_date === selectedIso) : undefined;
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
  return <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="border border-black/10 bg-white p-5 sm:p-7"><Calendar mode="single" selected={selected} onSelect={setSelected} locale={ptBR} modifiers={{ training: trainingDates, available: availableDates }} modifiersClassNames={{ training: 'bg-black text-[#f2ad19] font-bold', available: 'ring-2 ring-[#f2ad19] ring-inset' }} className="mx-auto w-full [--cell-size:--spacing(11)]" /><div className="mt-5 flex flex-wrap gap-4 border-t border-black/10 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#777]"><span className="flex items-center gap-2"><i className="size-3 bg-black" />Seu treinamento</span><span className="flex items-center gap-2"><i className="size-3 border-2 border-[#f2ad19]" />Disponível</span></div><form onSubmit={save} className="mt-5 space-y-3"><div className="border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 text-xs"><strong>{selected ? formatDate(isoFromDate(selected)) : 'Selecione uma data'}</strong><p className="mt-1 text-[#777]">A gestão verá esta data ao organizar novas turmas.</p></div><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação opcional" className="h-12 w-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#f2ad19]" /><button type="submit" className="h-12 w-full bg-[#f2ad19] text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Check className="mr-2 inline size-4" />Marcar disponibilidade</button></form></div><div className="space-y-8"><section>{!selected ? <div className="border border-dashed border-black/20 bg-white p-5">
    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-[#8a6107]" /><p className="text-xs leading-relaxed text-[#666]">Clique em uma data para ver os treinamentos que você dá nela. Os dias em preto são os seus.</p></div>
    {proximos.length ? <div className="mt-5"><span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#999]">Seus próximos treinamentos</span><ul className="mt-3 space-y-2">{proximos.map(([iso, itens]) => <li key={iso}><button type="button" onClick={() => setSelected(dateFromIso(iso))} className="flex w-full items-center justify-between gap-3 border border-black/10 px-4 py-3 text-left text-xs transition hover:border-[#f2ad19] hover:bg-[#fff8e8]"><span className="min-w-0"><span className="block font-bold">{longDate(iso)}</span><span className="mt-1 block truncate text-[#777]">{itens.map((item) => `${item.training.nr} · ${item.training.internal_label || item.training.title}`).join(' | ')}</span></span>{iso === hoje ? <span className="shrink-0 bg-black px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#f2ad19]">Hoje</span> : null}</button></li>)}</ul></div> : <p className="mt-5 text-xs text-[#888]">Nenhum treinamento seu a partir de hoje.</p>}
  </div> : <div>
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/10 pb-3"><strong className="text-sm font-extrabold uppercase tracking-[0.08em]">{longDate(selectedIso)}</strong><button type="button" onClick={() => setSelected(undefined)} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107] hover:text-black">Ver próximos</button></div>
    <span className="mt-4 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Seus treinamentos neste dia</span>
    {doDia.length ? <ul className="mt-3 space-y-3">{doDia.map(({ training, session, total }) => { const janela = janelaDoDia(session); return <li key={session.id} className="border border-black/10 bg-white p-4"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black font-heading text-xs font-black text-[#f2ad19]">{training.nr}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${session.status === 'in_progress' ? 'bg-[#daf2df] text-[#17642d]' : session.status === 'completed' ? 'bg-black/8 text-[#555]' : 'bg-[#f2ad19]/18 text-[#785303]'}`}>{statusLabel(session.status)}</span>{total > 1 ? <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">Dia {session.day_number} de {total}</span> : null}</div><strong className="mt-2 block text-sm font-extrabold uppercase tracking-[0.05em]">{training.internal_label || training.title}</strong><p className="mt-1 text-xs font-bold text-[#8a6107]">{training.client_name}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#666]">{janela ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{janela}</span> : null}<span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{training.location}</span></div></div></div><button type="button" onClick={() => openTraining(training)} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#f2ad19] text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900] sm:w-auto sm:px-5"><Play className="size-4" />Abrir sala</button></li>; })}</ul> : <div className="mt-3 flex flex-col items-center justify-center border border-dashed border-black/20 bg-white p-6 text-center"><CalendarCheck2 className="size-6 text-[#8a6107]" /><strong className="mt-3 text-xs uppercase tracking-[0.1em]">Nenhum treinamento seu nesta data</strong><p className="mt-1 max-w-xs text-xs leading-relaxed text-[#888]">Se puder dar aula neste dia, marque a disponibilidade abaixo do calendário.</p></div>}
    {disponivelNoDia ? <div className="mt-4 flex items-center gap-3 border-l-4 border-[#f2ad19] bg-[#fff8e8] p-3 text-xs"><CalendarCheck2 className="size-4 shrink-0 text-[#8a6107]" /><span className="min-w-0 flex-1"><strong>Você marcou disponibilidade neste dia</strong>{disponivelNoDia.note ? ` · ${disponivelNoDia.note}` : ''}</span><button type="button" onClick={() => void remove(disponivelNoDia.id)} aria-label="Remover disponibilidade deste dia" className="flex size-9 shrink-0 items-center justify-center border border-black/10 bg-white text-[#777] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-4" /></button></div> : null}
  </div>}</section><section><span className="eyebrow text-[#8a6107]">Datas informadas</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Minha disponibilidade</h2><div className="mt-5 space-y-3">{data.availability.map((item) => <article key={item.id} className="flex items-center gap-4 border border-black/10 bg-white p-4"><span className="flex size-11 shrink-0 items-center justify-center bg-[#f2ad19]/18 text-[#8a6107]"><CalendarCheck2 className="size-5" /></span><div className="min-w-0 flex-1"><strong className="block text-sm uppercase tracking-[0.08em]">{formatDate(item.available_date)}</strong><p className="mt-1 truncate text-xs text-[#777]">{item.note || 'Disponível para novas turmas'}</p></div><button type="button" onClick={() => void remove(item.id)} aria-label="Remover disponibilidade" className="flex size-10 items-center justify-center border border-black/10 text-[#777] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-4" /></button></article>)}{data.availability.length === 0 ? <Empty icon={CalendarCheck2} title="Nenhuma data informada" text="Escolha no calendário os dias em que você pode ministrar treinamentos." /> : null}</div></section></div></div>;
}

type TrainingFile = { id: string; name: string; kind: string; size: number; contentType: string; createdAt: string; stored: boolean };

const attendanceCopy = {
  eyebrow: 'Comprovação',
  title: 'Foto da lista assinada',
  help: 'Fotografe a lista de presença assinada em papel e envie aqui. Ela é arquivada nos documentos do treinamento, junto dos certificados — não na galeria de fotos da aula.',
  accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
  empty: 'Nenhuma lista enviada ainda. Aceita JPG, PNG, WEBP ou HEIC, até 4 MB.',
  button: 'Enviar lista',
} as const;

function TrainingFiles({ trainingId, notify, onCount }: { trainingId: string; notify: (message: string) => void; onCount?: (total: number) => void }) {
  const [files, setFiles] = useState<TrainingFile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const copy = attendanceCopy;

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ files: TrainingFile[] }>(`/api/instructor/trainings/${trainingId}/files`, { cache: 'no-store' });
      setFiles(result.files);
      onCount?.(result.files.length);
    } catch { setFiles([]); onCount?.(0); }
  }, [trainingId, onCount]);

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
      <div><span className="eyebrow text-[#8a6107]">{copy.eyebrow}</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">{copy.title}</h2><p className="mt-2 max-w-xl text-xs leading-relaxed text-[#666]">{copy.help}</p></div>
      <label className={`inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{uploading ? 'Enviando…' : copy.button}
        <input type="file" multiple accept={copy.accept} onChange={(event) => void send(event)} className="hidden" />
      </label>
    </div>
    {files === null ? <div className="mt-6 flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-[#8a6107]" /></div>
      : files.length === 0 ? <p className="mt-6 border border-dashed border-black/20 p-5 text-center text-xs text-[#777]">{copy.empty}</p>
      : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{files.map((file) => <figure key={file.id} className="border border-black/10">
            <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="relative block aspect-[4/3] overflow-hidden bg-[#f7f7f4]">
              {file.stored ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 33vw, 100vw" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#999]">Sem conteúdo</span>}
            </a>
            <figcaption className="p-3"><strong className="block truncate text-xs" title={file.name}>{file.name}</strong><span className="mt-1 block text-[10px] text-[#999]">{Math.max(1, Math.round(file.size / 1024))} KB · {formatMoment(file.createdAt)}</span>
              {file.stored ? <a href={`/api/files/${file.id}?download=1`} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 border border-black/15 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><Download className="size-3.5" />Baixar</a> : null}
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
  const [confirmando, setConfirmando] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ fullName: '', documentId: '', rg: '', birthDate: '', jobTitle: '', email: '', phone: '' });
  const [savingManual, setSavingManual] = useState(false);
  // Quantas listas assinadas já subiram nesta turma. O servidor exige uma no
  // último dia; aqui serve para avisar antes de o instrutor bater na trava.
  const [listasEnviadas, setListasEnviadas] = useState(0);

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
      const resultado = await requestJson<{ certificates?: number; trainingCompleted?: boolean; remainingDays?: number; certificatePublished?: boolean; certificateProblem?: string | null }>(`/api/instructor/trainings/${encodeURIComponent(training.id)}/complete`, { method: 'POST' });
      notify(!resultado.trainingCompleted
        ? `Seu dia foi encerrado. ${resultado.remainingDays === 1 ? 'Ainda falta 1 dia' : `Ainda faltam ${resultado.remainingDays} dias`} para a turma acabar — os documentos saem só no fim.`
        : !resultado.certificates
          ? 'Treinamento encerrado. A lista de presença foi congelada.'
          : resultado.certificatePublished
            ? `Treinamento encerrado. ${resultado.certificates} certificado(s) emitidos; certificado da empresa e atestado ficaram nos documentos da turma.`
            : `Treinamento encerrado, mas o PDF dos certificados não foi gerado: ${resultado.certificateProblem ?? 'motivo desconhecido'}. Avise a Space Light.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao encerrar o treinamento.'); }
    finally { setEnding(false); setConfirmando(false); }
  }
  async function addManual(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!training) return;
    const problemaDocumento = problemaCpf(manual.documentId) ?? problemaRg(manual.rg);
    if (problemaDocumento) {
      notify(problemaDocumento);
      return;
    }
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
    const header = ['Nome', 'Identificador', 'Presença (dias)', 'Função', 'E-mail', 'Telefone', 'Entrada'];
    const body = participants.map((p) => [p.full_name, p.document_id, `${p.days_present}/${p.days_total}`, p.job_title, p.email, p.phone, new Date(p.created_at).toLocaleString('pt-BR')]
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
  const { dias, atual: diaAtual, ultimoPendente } = meuDia(training, data.instructor.id);
  const janela = janelaDoDia(diaAtual);
  // No último dia a foto da lista assinada é obrigatória — é o comprovante do
  // treinamento inteiro, com uma coluna de assinatura por data.
  const travadoSemLista = ultimoPendente && listasEnviadas === 0;
  // Só quem tem check-in em todos os dias recebe certificado ao encerrar.
  const completos = participants.filter((p) => p.days_total > 0 && p.days_present >= p.days_total).length;
  // O instrutor já fechou o dia dele, mas a turma segue com os outros dias.
  const meuDiaFechado = diaAtual?.status === 'completed' && training.status !== 'completed';
  return <div className="space-y-6"><label className="block max-w-2xl"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em]">Treinamento</span><select value={training.id} onChange={(event) => selectTraining(event.target.value)} className="h-12 w-full border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]">{data.trainings.map((item) => { const rotulo = rotuloDoDia(item, data.instructor.id); return <option key={item.id} value={item.id}>{item.client_name} · {item.nr} · {item.internal_label ? `${item.internal_label} · ` : ''}{formatDate(item.training_date)}{rotulo ? ` · ${rotulo}` : ''}</option>; })}</select></label>{dias.length > 1 ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-4 border-[#f2ad19] bg-white p-4">
      <strong className="text-sm font-extrabold uppercase tracking-[0.06em]">Dia {diaAtual?.day_number ?? 1} de {dias.length}</strong>
      {janela ? <span className="text-xs text-[#666]">{janela}</span> : null}
      <span className="flex flex-wrap gap-1.5">{dias.map((dia) => <span key={dia.id} title={`Dia ${dia.day_number}: ${dia.instructor_name ?? 'sem instrutor'}`} className={`inline-flex size-7 items-center justify-center text-[11px] font-extrabold ${dia.status === 'completed' ? 'bg-[#daf2df] text-[#17642d]' : dia.id === diaAtual?.id ? 'bg-black text-[#f2ad19]' : 'bg-black/8 text-[#777]'}`}>{dia.day_number}</span>)}</span>
      <span className="text-xs text-[#777]">{training.status === 'completed'
        ? 'Treinamento concluído: os documentos já foram emitidos.'
        : meuDiaFechado
          ? 'Você já encerrou o seu dia. A turma continua com os dias restantes.'
          : ultimoPendente
            ? 'Este é o último dia: encerrar aqui emite os certificados.'
            : 'Os certificados só saem quando o último dia for encerrado.'}</span>
    </div> : null}<div><a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className="inline-flex h-12 w-full items-center justify-center gap-2 border-2 border-black bg-white px-5 text-[11px] font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-white sm:w-auto"><FileText className="size-5" />Gerar lista de presença (PDF)</a></div>{training.status !== 'in_progress' ? <section className="border-t-4 border-[#f2ad19] bg-white p-7 md:p-10"><span className="eyebrow text-[#8a6107]">{training.status === 'completed' ? 'Treinamento concluído' : 'Pronto para começar'}</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[0.02em]">{training.nr} · {training.title}</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#666]">{training.status === 'completed' ? 'Este treinamento foi encerrado. A lista de presença está congelada e pode ser exportada abaixo.' : 'Ao iniciar, o QR Code de presença será exibido e o formulário ficará disponível para os participantes.'}</p>{training.status === 'completed' ? <div className="mt-7 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 bg-[#daf2df] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#17642d]"><Check className="size-4" />Concluído · {participants.length} presença(s)</span><button type="button" onClick={exportCsv} disabled={participants.length === 0} className="inline-flex h-11 items-center gap-2 border border-black/15 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white disabled:opacity-40"><Download className="size-4" />Exportar CSV</button></div> : <button type="button" onClick={() => void start()} disabled={starting} className="mt-7 inline-flex h-14 items-center gap-3 bg-[#f2ad19] px-7 text-[10px] font-extrabold uppercase tracking-[.12em] text-black disabled:opacity-50">{starting ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />}Iniciar treinamento</button>}</section> : <><section className="grid gap-6 border border-black/10 bg-white p-6 lg:grid-cols-[380px_1fr] lg:p-8"><div className="flex min-h-[340px] items-center justify-center bg-[#f7f7f4] p-4">{image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={360} height={360} unoptimized className="h-auto w-full max-w-[360px]" /> : <Loader2 className="size-8 animate-spin text-[#8a6107]" />}</div><div className="flex flex-col justify-between"><div><span className="eyebrow text-[#8a6107]">Turma em andamento</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[0.02em]">{training.nr} · {training.title}</h2><p className="mt-2 text-sm font-bold text-[#8a6107]">{training.client_name}</p><p className="mt-6 break-all border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 font-mono text-[10px]">{url}</p></div><div className="mt-5 space-y-3">
        <button type="button" onClick={() => void copyUrl()} className="inline-flex h-12 w-full items-center justify-center gap-2 border border-black/15 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Link copiado' : 'Copiar link da lista'}</button>
        {meuDiaFechado ? <div className="border-l-4 border-[#17642d] bg-[#f2faf4] p-4">
          <strong className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.04em] text-[#17642d]"><Check className="size-4" />Dia {diaAtual?.day_number} encerrado</strong>
          <p className="mt-2 text-xs leading-relaxed text-[#666]">A turma continua nos dias seguintes, com quem estiver escalado. Os certificados saem quando o último dia for encerrado.</p>
        </div> : travadoSemLista ? <div className="border-2 border-[#b62525] bg-[#fff5f5] p-4">
          <strong className="block text-sm font-extrabold uppercase tracking-[0.04em] text-[#b62525]">Falta a foto da lista assinada</strong>
          <p className="mt-2 text-xs leading-relaxed text-[#666]">Este é o último dia do treinamento. Fotografe a lista de presença assinada em papel e envie no quadro abaixo — só depois dá para encerrar e emitir os certificados.</p>
        </div> : confirmando ? <div className="border-2 border-[#b62525] bg-[#fff5f5] p-4">
          <strong className="block text-sm font-extrabold uppercase tracking-[0.04em] text-[#b62525]">{ultimoPendente ? 'Encerrar esta turma?' : `Encerrar o dia ${diaAtual?.day_number ?? 1}?`}</strong>
          <p className="mt-2 text-xs leading-relaxed text-[#666]">{ultimoPendente
            ? `A lista de presença é congelada e os certificados são emitidos para ${completos} de ${participants.length} participante(s): só quem fez check-in em todos os dias. Não dá para reabrir.`
            : 'O seu dia é fechado e a turma segue com os outros dias. Os certificados saem só quando o último dia for encerrado.'}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setConfirmando(false)} className="inline-flex h-12 flex-1 items-center justify-center border border-black/20 bg-white text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">Voltar</button>
            <button type="button" onClick={() => void complete()} disabled={ending} className="inline-flex h-12 flex-[2] items-center justify-center gap-2 bg-[#b62525] text-[11px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-[#8f1c1c] disabled:opacity-50">{ending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}{ending ? 'Encerrando…' : 'Sim, encerrar'}</button>
          </div>
        </div> : <button type="button" onClick={() => setConfirmando(true)} disabled={ending || travadoSemLista} className="inline-flex h-16 w-full items-center justify-center gap-3 bg-black px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white hover:bg-[#b62525] disabled:opacity-40">{ending ? <Loader2 className="size-6 animate-spin" /> : <Check className="size-6" />}{ultimoPendente ? 'Encerrar treinamento' : `Encerrar o dia ${diaAtual?.day_number ?? 1}`}</button>}
      </div></div></section><section><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow text-[#8a6107]">Atualização automática</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Quem já preencheu</h2></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 text-xs font-bold text-[#777]"><RefreshCw className="size-3.5" />{participants.length} na lista</span><button type="button" onClick={exportCsv} disabled={participants.length === 0} className="inline-flex h-10 items-center gap-2 border border-black/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white disabled:opacity-40"><Download className="size-4" />CSV</button><button type="button" onClick={() => setShowManual((value) => !value)} className="inline-flex h-10 items-center gap-2 bg-[#f2ad19] px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Plus className="size-4" />Adicionar</button></div></div>{showManual ? <form onSubmit={addManual} className="mb-4 grid gap-3 border border-black/10 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3"><input required value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} placeholder="Nome completo *" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input required value={manual.documentId} onChange={(e) => setManual({ ...manual, documentId: limparDigitacaoCpf(e.target.value) })} inputMode="numeric" placeholder="CPF * (só números)" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input required value={manual.rg} onChange={(e) => setManual({ ...manual, rg: limparDigitacaoRg(e.target.value) })} placeholder="RG * (sem lembrar: o CPF)" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input type="date" value={manual.birthDate} onChange={(e) => setManual({ ...manual, birthDate: e.target.value })} title="Data de nascimento" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.jobTitle} onChange={(e) => setManual({ ...manual, jobTitle: e.target.value })} placeholder="Função" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="E-mail" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} placeholder="Telefone" className="h-11 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2ad19]" /><button type="submit" disabled={savingManual} className="inline-flex h-11 items-center justify-center gap-2 bg-black text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#f2ad19] hover:text-black disabled:opacity-50">{savingManual ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Adicionar à lista</button></form> : null}{participants.length ? <><ul className="space-y-2 md:hidden">{participants.map((participant) => <li key={participant.id} className="border border-black/10 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm leading-snug">{participant.full_name}</strong>
              <span className="mt-1 block text-xs text-[#666]">{participant.document_id}</span>
            </div>
            <button type="button" onClick={() => void removeParticipant(participant.id)} aria-label={`Remover ${participant.full_name}`} className="inline-flex size-10 shrink-0 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-black/8 pt-3 text-xs text-[#777]">
            <PresencaBadge present={participant.days_present} total={participant.days_total} />
            <span>{participant.job_title || 'Sem função'}</span>
            <span>{participant.email || participant.phone || 'Sem contato'}</span>
            <span>{new Date(participant.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </li>)}</ul><div className="hidden overflow-x-auto md:block border border-black/10 bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-black text-[10px] font-extrabold uppercase tracking-[0.12em] text-white"><tr><th className="p-4">Participante</th><th className="p-4">Identificador</th><th className="p-4">Presença</th><th className="p-4">Função</th><th className="p-4">Contato</th><th className="p-4">Entrada</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-black/8">{participants.map((participant) => <tr key={participant.id}><td className="p-4 font-bold">{participant.full_name}</td><td className="p-4 text-[#666]">{participant.document_id}</td><td className="p-4"><PresencaBadge present={participant.days_present} total={participant.days_total} /></td><td className="p-4 text-[#666]">{participant.job_title || '—'}</td><td className="p-4 text-[#666]">{participant.email || participant.phone || '—'}</td><td className="p-4 text-[#666]">{new Date(participant.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td className="p-4 text-right"><button type="button" onClick={() => void removeParticipant(participant.id)} aria-label={`Remover ${participant.full_name}`} className="inline-flex size-8 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button></td></tr>)}</tbody></table></div></> : <Empty icon={UsersRound} title="Aguardando participantes" text="Adicione manualmente ou aguarde o preenchimento pelo QR Code." />}</section></>}<TrainingFiles trainingId={training.id} notify={notify} onCount={setListasEnviadas} /></div>;
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
  const labelCls = 'mb-2 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#888]';
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
    <section className="h-fit bg-black p-7 text-white"><UserRound className="size-10 text-[#f2ad19]" /><span className="eyebrow mt-8 block text-[#f2ad19]">Instrutor aprovado</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[0.02em]">{data.instructor.name}</h2><p className="mt-4 text-sm leading-relaxed text-white/55">Atualize seus dados de contato e profissionais. CPF e e-mail de acesso são alterados apenas pela gestão da Space Light.</p></section>
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
                <strong className="text-base font-extrabold uppercase tracking-[0.06em]">{required.label}</strong>
                <span className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${cor}`}>{situacao?.label ?? 'Não enviado'}</span>
              </div>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-[#666]">{required.help}</p>
              {enviado ? <p className="mt-2 text-[10px] text-[#999]">{enviado.name} · {Math.max(1, Math.round(enviado.size / 1024))} KB · {formatMoment(enviado.createdAt)}</p> : null}
              {enviado?.status === 'rejected' ? <p className="mt-2 border-l-2 border-[#b62525] bg-[#f3d4d4]/50 px-3 py-2 text-[11px] leading-relaxed text-[#8f1717]">A Space Light recusou este documento. Envie outro arquivo, mais legível ou dentro da validade.</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {enviado ? <a href={`/api/instructor-documents/${enviado.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 border border-black/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">Ver</a> : null}
              <label className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] ${enviado ? 'border border-black/15 hover:bg-black hover:text-white' : 'bg-[#f2ad19] text-black hover:bg-[#ff9900]'} ${sending === required.category ? 'pointer-events-none opacity-60' : ''}`}>
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
      <h1 className="mt-3 text-3xl font-black uppercase leading-none tracking-[0.02em]">Falta pouco, {data.instructor.name.split(' ')[0]}</h1>
      <p className="mt-4 text-sm leading-relaxed text-[#666]">Envie os três documentos abaixo. A Space Light analisa e libera o seu acesso às turmas — você recebe o aviso pelo WhatsApp cadastrado.</p>
    </div>
    <div className="mt-6"><InstructorDocuments notify={notify} /></div>
    <form action="/api/auth/logout" method="post" className="mt-8">
      <button type="submit" className="inline-flex h-11 items-center gap-2 border border-black/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><LogOut className="size-4" />Sair</button>
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
    if (section === 'calendar') return <InstructorCalendar data={data} reload={reload} notify={setNotice} openTraining={openTraining} />;
    if (section === 'trainings') return <div className="grid gap-4 xl:grid-cols-2">{data.trainings.map((training) => <TrainingCard key={training.id} training={training} onStart={openTraining} />)}{data.trainings.length === 0 ? <div className="xl:col-span-2"><Empty icon={GraduationCap} title="Nenhuma turma atribuída" text="A gestão da Space Light vinculará seus próximos treinamentos aqui." /></div> : null}</div>;
    if (section === 'active') return <TrainingRoom data={data} selectedId={selectedTrainingId} selectTraining={setSelectedTrainingId} reload={reload} notify={setNotice} />;
    if (section === 'documents') return <InstructorDocuments notify={setNotice} />;
    return <Profile data={data} reload={reload} notify={setNotice} />;
  }, [data, reload, section, selectedTrainingId]);

  // Cadastro em análise: a única coisa que ele pode fazer é enviar documento.
  if (data.instructor.status === 'pending') {
    return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">{notice ? <output className="fixed inset-x-4 top-6 z-[70] border-l-4 border-[#f2ad19] bg-black p-4 text-sm text-white shadow-xl sm:inset-x-auto sm:right-6">{notice}</output> : null}<header className="flex h-[76px] items-center border-b border-black/10 bg-black px-5 sm:px-8"><Link href="/"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link></header><PendingApproval data={data} notify={setNotice} /></main>;
  }

  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">{notice ? <output className="fixed inset-x-4 top-20 z-[70] max-w-none border-l-4 border-[#f2ad19] bg-black p-4 text-sm text-white shadow-xl sm:inset-x-auto sm:right-4 sm:top-24 sm:max-w-sm">{notice}</output> : null}<header className="sticky top-0 z-50 flex h-[76px] items-center justify-between border-b border-white/10 bg-black px-4 text-white sm:px-7"><div className="flex items-center gap-5"><Link href="/"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link><span className="hidden h-8 w-px bg-white/15 sm:block" /><div className="hidden sm:block"><strong className="block text-xs">Área do Instrutor</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{data.instructor.name}</span></div></div><div className="flex gap-2"><button type="button" onClick={() => void reload()} aria-label="Atualizar dados" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><RefreshCw className="size-4" /></button><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sair" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><LogOut className="size-4" /></button></form></div></header><div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="hidden min-h-[calc(100vh-76px)] bg-[#171716] p-5 text-white lg:block"><div className="sticky top-[96px]"><span className="eyebrow px-3 text-[#f2ad19]">Minha rotina</span><nav className="mt-5 space-y-1" aria-label="Navegação do instrutor">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex h-12 w-full items-center gap-3 px-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] ${section === id ? 'bg-[#f2ad19] text-black' : 'text-white/58 hover:bg-white/8 hover:text-white'}`}><Icon className="size-4" />{label}</button>)}</nav></div></aside><div className="min-w-0"><nav className="flex overflow-x-auto border-b border-black/10 bg-white lg:hidden" aria-label="Navegação móvel do instrutor">{navigation.map(({ id, curto, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined} className={`flex shrink-0 flex-col items-center gap-1.5 border-r border-black/8 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] ${section === id ? 'bg-[#f2ad19]' : 'text-[#666]'}`}><Icon className="size-5" />{curto}</button>)}</nav><section className="p-4 sm:p-6 md:p-8 xl:p-11"><SectionHeader section={section} /><div className="mt-7">{content}</div></section></div></div></main>;
}
