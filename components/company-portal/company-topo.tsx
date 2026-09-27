'use client';

import { Award, Bell, CalendarClock, ChevronRight, FileCheck, Inbox, Search, Signature, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { formatDayMonth } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import { BotaoIcone, campoClasses } from '@/components/ds/base';
import type { CompanyDashboardData, CompanyTraining } from '@/lib/company-types';
import { cn } from '@/lib/utils';

/** Turma nova já com cliente (e norma) escolhidos: vem da ficha do cliente. */
export type NovaTurmaPreset = { clienteId?: string; nr?: string };
export type NavegarEquipe = (section: CompanySection, trainingId?: string, vista?: 'agenda' | 'criar', preset?: NovaTurmaPreset) => void;

/** "Rafael Souza" → "Rafael S.", como o Figma escreve o instrutor. */
export function nomeCurto(nome: string | null | undefined) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return partes[0] ?? '';
  return `${partes[0]} ${partes[partes.length - 1]?.[0] ?? ''}.`;
}

/** Último dia da turma: é ele que diz se ela já venceu. */
export function ultimoDia(training: CompanyTraining) {
  return (training.sessions ?? []).reduce((maior, dia) => (dia.session_date > maior ? dia.session_date : maior), training.training_date);
}

const DOIS_DIAS = 2 * 24 * 60 * 60 * 1000;
/** Pedidos em aberto há mais de 2 dias (created_at do banco vem em UTC). */
export const paradosHaMaisDe2Dias = (pedidos: { created_at: string }[], agora: number) =>
  pedidos.filter((p) => agora - new Date(`${p.created_at.replace(' ', 'T')}Z`).getTime() > DOIS_DIAS).length;

export type Pendencia = {
  id: string;
  titulo: string;
  detalhe: string;
  tom: 'perigo' | 'atencao';
  icone: ReactNode;
  ir: [CompanySection, string?];
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Pendências da operação, na ordem do Figma; as que o desenho não tem vêm no fim. */
export function pendenciasDaEquipe(data: CompanyDashboardData, hoje: string, agora: number): Pendencia[] {
  const lista: Pendencia[] = [];
  const abertas = data.trainings.filter((t) => t.status !== 'completed');

  const semCertificado = data.trainings.filter((t) => t.status === 'completed' && !t.certificate_generated_at);
  if (semCertificado.length) lista.push({ id: 'certificados', titulo: 'Emitir certificados', detalhe: plural(semCertificado.length, 'turma concluída', 'turmas concluídas'), tom: 'atencao', icone: <Award />, ir: ['certificates'] });

  const comLista = new Set(data.files.filter((f) => f.kind === 'attendance').map((f) => f.training_id));
  const semLista = data.trainings.filter((t) => ultimoDia(t) < hoje && !comLista.has(t.id)).sort((a, b) => ultimoDia(b).localeCompare(ultimoDia(a)));
  if (semLista.length) {
    const t = semLista[0]!;
    const instrutor = nomeCurto([...(t.sessions ?? [])].sort((a, b) => b.day_number - a.day_number)[0]?.instructor_name ?? t.instructor);
    lista.push({ id: 'lista', titulo: 'Lista assinada não enviada', detalhe: semLista.length === 1 ? `Turma ${t.code}${instrutor ? ` · ${instrutor}` : ''}` : plural(semLista.length, 'turma', 'turmas'), tom: 'perigo', icone: <Signature />, ir: ['trainings', semLista.length === 1 ? t.id : undefined] });
  }

  const semInstrutor = abertas
    .map((t) => ({ t, dia: (t.sessions ?? []).filter((s) => !s.instructor_id && s.session_date >= hoje).sort((a, b) => a.session_date.localeCompare(b.session_date))[0] }))
    .filter((x) => x.dia)
    .sort((a, b) => a.dia!.session_date.localeCompare(b.dia!.session_date));
  if (semInstrutor.length) {
    const { t, dia } = semInstrutor[0]!;
    lista.push({ id: 'instrutor', titulo: 'Turma sem instrutor', detalhe: semInstrutor.length === 1 ? `${t.code} · ${t.nr} · ${formatDayMonth(dia!.session_date)}` : `${plural(semInstrutor.length, 'turma', 'turmas')} · a próxima em ${formatDayMonth(dia!.session_date)}`, tom: 'perigo', icone: <UsersRound />, ir: ['trainings', semInstrutor.length === 1 ? t.id : undefined] });
  }

  const comDocumento = data.instructors.filter((i) => i.pending_document_count > 0);
  const documentos = comDocumento.reduce((soma, i) => soma + i.pending_document_count, 0);
  if (documentos) lista.push({ id: 'documentos', titulo: 'Documentos para avaliar', detalhe: `${plural(documentos, 'documento', 'documentos')} de ${plural(comDocumento.length, 'instrutor', 'instrutores')}`, tom: 'atencao', icone: <FileCheck />, ir: ['instructors'] });

  const pedidos = [...data.requests.filter((r) => r.status === 'open'), ...data.siteLeads.filter((l) => l.status === 'open'), ...data.documentRequests.filter((r) => r.status === 'open')];
  if (pedidos.length) {
    const paradas = paradosHaMaisDe2Dias(pedidos, agora);
    lista.push({ id: 'solicitacoes', titulo: 'Solicitações sem resposta', detalhe: paradas ? `${paradas} há mais de 2 dias` : plural(pedidos.length, 'em aberto', 'em aberto'), tom: 'atencao', icone: <Inbox />, ir: ['requests'] });
  }

  // Fora do desenho, mas já eram pendências do portal: não podem sumir.
  const vencidas = abertas.filter((t) => ultimoDia(t) < hoje);
  if (vencidas.length) lista.push({ id: 'vencidas', titulo: 'Dia vencido sem encerrar', detalhe: vencidas.length === 1 ? `Turma ${vencidas[0]!.code} · ${formatDayMonth(ultimoDia(vencidas[0]!))}` : plural(vencidas.length, 'turma', 'turmas'), tom: 'perigo', icone: <CalendarClock />, ir: ['trainings', vencidas.length === 1 ? vencidas[0]!.id : undefined] });

  const clientes = data.clients.filter((c) => c.status === 'pending').length;
  const instrutores = data.instructors.filter((i) => i.status === 'pending').length;
  if (clientes + instrutores) lista.push({ id: 'cadastros', titulo: 'Cadastros para aprovar', detalhe: [clientes ? plural(clientes, 'cliente', 'clientes') : '', instrutores ? plural(instrutores, 'instrutor', 'instrutores') : ''].filter(Boolean).join(' · '), tom: 'atencao', icone: <UserCheck />, ir: [clientes ? 'clients' : 'instructors'] });

  return lista;
}

/** Linha de pendência do Figma: ícone em círculo suave, título, detalhe e seta. */
export function LinhaPendencia({ item, onClick }: { item: Pendencia; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-ds-borda px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-ds-muted ds-foco">
    <span className={cn('flex shrink-0 rounded-full p-2 [&_svg]:size-4', item.tom === 'perigo' ? 'bg-ds-perigo-suave text-ds-perigo' : 'bg-ds-atencao-suave text-ds-atencao')}>{item.icone}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate ds-body-s font-medium text-ds-texto">{item.titulo}</span>
      <span className="truncate ds-caption text-ds-texto-2">{item.detalhe}</span>
    </span>
    <ChevronRight className="size-4 shrink-0 text-ds-texto" />
  </button>;
}

function useFecharFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) fechar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto, fechar]);
  return ref;
}

/** Busca da barra superior: turma (código, título, cliente), colaborador (nome ou CPF) ou NR. */
export function BuscaEquipe({ data, navegar }: { data: CompanyDashboardData; navegar: NavegarEquipe }) {
  const [q, setQ] = useState('');
  const termo = q.trim().toLowerCase();
  const ref = useFecharFora(termo.length >= 2, () => setQ(''));
  const resultados = useMemo(() => {
    if (termo.length < 2) return [];
    const digitos = termo.replace(/\D/g, '');
    const turmas = data.trainings
      .filter((t) => `${t.code} ${t.nr} ${t.title} ${t.internal_label} ${t.client_name}`.toLowerCase().includes(termo))
      .map((t) => ({ id: `t-${t.id}`, turma: t.id, titulo: `${t.nr} · ${t.internal_label || t.title}`, detalhe: `Turma ${t.code} · ${t.client_name} · ${formatDayMonth(t.training_date)}` }));
    const pessoas = data.participants
      .filter((p) => p.full_name.toLowerCase().includes(termo) || (digitos.length >= 3 && p.document_id.replace(/\D/g, '').includes(digitos)))
      .map((p) => {
        const t = data.trainings.find((x) => x.id === p.training_id);
        return { id: `p-${p.id}`, turma: p.training_id, titulo: p.full_name, detalhe: t ? `${t.nr} · turma ${t.code} · ${t.client_name}` : '' };
      });
    return [...turmas, ...pessoas].slice(0, 8);
  }, [termo, data]);

  return <div ref={ref} className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" />
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar turma, colaborador ou NR" aria-label="Buscar turma, colaborador ou NR" className={cn(campoClasses, 'min-h-10 py-2.5 pl-10 ds-body-s')} />
    {termo.length >= 2 ? <div className="absolute right-0 left-0 z-40 mt-2 overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie shadow-xl sm:left-auto sm:w-[360px]">
      {resultados.length
        ? resultados.map((r) => <button key={r.id} type="button" onClick={() => { setQ(''); navegar('trainings', r.turma); }} className="flex w-full flex-col items-start border-b border-ds-borda px-4 py-2.5 text-left last:border-b-0 hover:bg-ds-muted"><span className="ds-body-s font-medium">{r.titulo}</span><span className="ds-caption text-ds-texto-2">{r.detalhe}</span></button>)
        : <p className="px-4 py-3 ds-body-s text-ds-texto-2">Nada encontrado.</p>}
    </div> : null}
  </div>;
}

/** Sino da barra superior: o ponto amarelo avisa que há pendência; abrir mostra a lista. */
export function SinoEquipe({ pendencias, navegar }: { pendencias: Pendencia[]; navegar: NavegarEquipe }) {
  const [aberto, setAberto] = useState(false);
  const ref = useFecharFora(aberto, () => setAberto(false));
  return <div ref={ref} className="relative">
    <BotaoIcone rotulo={pendencias.length ? `Notificações (${pendencias.length} pendências)` : 'Notificações'} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}><Bell /></BotaoIcone>
    {pendencias.length ? <span aria-hidden className="pointer-events-none absolute top-1.5 left-[23px] size-[9px] rounded-full border-[1.5px] border-ds-superficie bg-ds-amarelo" /> : null}
    {aberto ? <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie shadow-xl">
      <div className="border-b border-ds-borda px-5 py-3 ds-h4">Pendências · {pendencias.length}</div>
      {pendencias.length
        ? <div className="max-h-96 overflow-y-auto">{pendencias.map((p) => <LinhaPendencia key={p.id} item={p} onClick={() => { setAberto(false); navegar(...p.ir); }} />)}</div>
        : <p className="px-5 py-6 ds-body-s text-ds-texto-2">Nada pendente.</p>}
    </div> : null}
  </div>;
}
