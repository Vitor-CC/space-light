'use client';

import { ArrowRight, Award, ChevronDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmitirCertificados } from '@/components/company-portal/company-trainings';
import { pendenciasDaEquipe, SinoEquipe } from '@/components/company-portal/company-topo';
import type { NavegarEquipe } from '@/components/company-portal/company-topo';
import { formatDayMonth, isoFromDate } from '@/components/company-portal/company-ui';
import { BarraSuperior, Botao, botaoClasses, campoClasses, Tag, tabelaClasses as tb, Vazio } from '@/components/ds/base';
import type { Tom } from '@/components/ds/base';
import type { CompanyDashboardData, CompanyTraining } from '@/lib/company-types';
import { dataDoDia as dataDaTurma } from '@/lib/dias-da-turma';
import { nomeCertificadoAluno } from '@/lib/nome-certificado';
import { cn } from '@/lib/utils';

type Situacao = 'valido' | 'vencendo' | 'vencido' | 'sem_validade';
const SITUACOES: Record<Situacao, { tom: Tom; texto: string }> = {
  valido: { tom: 'sucesso', texto: 'Válido' },
  vencendo: { tom: 'atencao', texto: 'Vencendo' },
  vencido: { tom: 'perigo', texto: 'Vencido' },
  sem_validade: { tom: 'neutro', texto: 'Sem validade' },
};
const POR_PAGINA = 20;
/** A partir de quantos dias antes do vencimento o certificado aparece como "Vencendo". */
const AVISO_DIAS = 60;

/** "2026-09-26" → "26/09/2026". */
function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
}

/** Soma meses a uma data ISO, sem fuso: o que importa é o dia do calendário. */
function somarMeses(iso: string, meses: number) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + meses, dia));
  return data.toISOString().slice(0, 10);
}

type Linha = { chave: string; participante: string; training: CompanyTraining; emissao: string; validade: string | null; situacao: Situacao; arquivoId: string | null };

/**
 * Certificados (Figma 86:1955): turmas aguardando emissão em cima e, embaixo,
 * um certificado por aluno, com validade e situação. O PDF de cada aluno é o
 * arquivo da turma com o nome padronizado (o mesmo que o portal do cliente usa).
 */
export function CompanyCertificates({ data, reload, notify, navegar }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (m: string) => void; navegar: NavegarEquipe }) {
  const [agora] = useState(() => Date.now());
  const hoje = isoFromDate(new Date(agora));
  const [busca, setBusca] = useState('');
  const [norma, setNorma] = useState('todas');
  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas');
  const [pagina, setPagina] = useState(1);
  const [emissao, setEmissao] = useState<string | null>(null);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  const aguardando = useMemo(() => data.trainings.filter((t) => t.status === 'completed' && !t.certificate_generated_at).sort((a, b) => dataDaTurma(b).localeCompare(dataDaTurma(a))), [data.trainings]);
  const aptos = (id: string) => data.participants.filter((p) => p.training_id === id && p.days_total > 0 && p.days_present >= p.days_total).length;
  const inscritos = (id: string) => data.participants.filter((p) => p.training_id === id).length;

  const linhas = useMemo<Linha[]>(() => {
    const limite = new Date(agora + AVISO_DIAS * 86_400_000).toISOString().slice(0, 10);
    const arquivoPorNome = new Map(data.files.map((f) => [`${f.training_id}|${f.name}`, f.id]));
    const turmas = new Map(data.trainings.filter((t) => t.status === 'completed' && t.certificate_generated_at).map((t) => [t.id, t]));
    const lista: Linha[] = [];
    for (const p of data.participants) {
      const training = turmas.get(p.training_id);
      if (!training || p.days_total === 0 || p.days_present < p.days_total) continue;
      const base = dataDaTurma(training);
      const validade = training.validity_months ? somarMeses(base, training.validity_months) : null;
      const situacaoDoCertificado: Situacao = !validade ? 'sem_validade' : validade < hoje ? 'vencido' : validade <= limite ? 'vencendo' : 'valido';
      lista.push({
        chave: p.id,
        participante: p.full_name,
        training,
        emissao: (training.certificate_generated_at as string).slice(0, 10),
        validade,
        situacao: situacaoDoCertificado,
        arquivoId: arquivoPorNome.get(`${training.id}|${nomeCertificadoAluno(p.full_name, training.nr)}`) ?? null,
      });
    }
    return lista.sort((a, b) => b.emissao.localeCompare(a.emissao) || a.participante.localeCompare(b.participante, 'pt-BR'));
  }, [data.participants, data.trainings, data.files, agora, hoje]);

  const normas = useMemo(() => [...new Set(linhas.map((l) => l.training.nr))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })), [linhas]);
  const termo = busca.trim().toLowerCase();
  const filtradas = linhas.filter((l) => (norma === 'todas' || l.training.nr === norma)
    && (situacao === 'todas' || l.situacao === situacao)
    && (!termo || `${l.participante} ${l.training.code} ${l.training.client_name} ${l.training.nr}`.toLowerCase().includes(termo)));
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const visiveis = filtradas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const turmaEmissao = emissao ? data.trainings.find((t) => t.id === emissao) : undefined;

  function exportar() {
    const cabecalho = ['Participante', 'Norma', 'Treinamento', 'Cliente', 'Turma', 'Emissão', 'Validade', 'Situação'];
    const corpo = filtradas.map((l) => [l.participante, l.training.nr, l.training.title, l.training.client_name, l.training.code, dataCurta(l.emissao), l.validade ? dataCurta(l.validade) : '', SITUACOES[l.situacao].texto]);
    const csv = [cabecalho, ...corpo].map((linha) => linha.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificados-${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtro = (rotulo: string, valor: string, mudar: (v: string) => void, opcoes: Array<[string, string]>) => <label className="relative inline-flex h-10 items-center gap-2 rounded-md border border-ds-borda bg-ds-superficie px-3 ds-body-s font-medium">
    <span className="pointer-events-none">{rotulo}: {opcoes.find(([v]) => v === valor)?.[1] ?? valor}</span>
    <ChevronDown className="pointer-events-none size-3.5" />
    <select aria-label={rotulo} value={valor} onChange={(e) => { mudar(e.target.value); setPagina(1); }} className="absolute inset-0 cursor-pointer opacity-0">{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
  </label>;

  return <div className="flex flex-col gap-5">
    <BarraSuperior titulo="Certificados" subtitulo="Emissão e consulta de todos os certificados." notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />} />

    {aguardando.length ? <section className="overflow-hidden rounded-lg bg-ds-superficie">
      <div className="flex items-center gap-3 px-5 py-4">
        <Award className="size-5 shrink-0" />
        <h2 className="flex-1 ds-h4">Aguardando emissão · {aguardando.length === 1 ? '1 turma' : `${aguardando.length} turmas`}</h2>
        <button type="button" onClick={() => navegar('trainings')} className={botaoClasses('link', 'P')}>Ver em Turmas<ArrowRight /></button>
      </div>
      {aguardando.map((t) => <div key={t.id} className="flex flex-wrap items-center gap-3 border-t border-ds-borda px-5 py-3 sm:flex-nowrap">
        <span className="w-[90px] shrink-0 ds-mono text-ds-texto-2">{t.code}</span>
        <span className="min-w-0 flex-1 truncate ds-body-s font-medium">{t.client_name}</span>
        <span className="w-[200px] shrink-0 truncate ds-body-s" title={t.title}>{t.nr} · {t.title}</span>
        <span className="w-[60px] shrink-0 ds-body-s">{formatDayMonth(dataDaTurma(t))}</span>
        <span className="w-[120px] shrink-0 ds-caption text-ds-texto-2">{aptos(t.id)} aptos de {inscritos(t.id)}</span>
        <Botao onClick={() => setEmissao(t.id)}>Emitir<Award /></Botao>
      </div>)}
    </section> : null}

    <section className="flex flex-col overflow-hidden rounded-lg bg-ds-superficie">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-ds-borda px-5 py-4">
        <label className="relative w-full sm:w-[320px]"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input aria-label="Buscar participante, turma ou cliente" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar participante, turma ou cliente" className={cn(campoClasses, 'min-h-10 py-2.5 pl-10 ds-body-s')} /></label>
        {filtro('Norma', norma, setNorma, [['todas', 'todas'], ...normas.map((n): [string, string] => [n, n])])}
        {filtro('Situação', situacao, (v) => setSituacao(v as Situacao | 'todas'), [['todas', 'todas'], ...Object.entries(SITUACOES).map(([v, s]): [string, string] => [v, s.texto.toLowerCase()])])}
        <span className="hidden flex-1 sm:block" />
        <button type="button" onClick={exportar} disabled={!filtradas.length} className="inline-flex h-10 items-center gap-2 rounded-md border border-ds-borda px-3 ds-body-s font-medium hover:border-ds-borda-forte disabled:opacity-50 ds-foco"><Download className="size-4" />Exportar</button>
      </div>
      {visiveis.length ? <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[900px]')}>
        <thead className={tb.cabeca}><tr><th className={tb.th}>Participante</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Cliente</th><th className={tb.th}>Turma</th><th className={tb.th}>Emissão</th><th className={tb.th}>Validade</th><th className={tb.th}>Situação</th><th className={tb.th}><span className="sr-only">Baixar</span></th></tr></thead>
        <tbody>{visiveis.map((l) => <tr key={l.chave} onClick={() => setEmissao(l.training.id)} className={cn(tb.linha, tb.linhaClicavel)}>
          <td className={cn(tb.td, 'font-medium')}>{l.participante}</td>
          <td className={cn(tb.td, 'max-w-[180px] truncate')} title={l.training.title}>{l.training.nr} · {l.training.title}</td>
          <td className={cn(tb.td, 'max-w-[180px] truncate')}>{l.training.client_name}</td>
          <td className={tb.td}><button type="button" onClick={(e) => { e.stopPropagation(); setEmissao(l.training.id); }} title="Ver a emissão desta turma e gerar de novo" className={cn(tb.codigo, 'underline decoration-ds-borda underline-offset-4 hover:decoration-ds-texto ds-foco')}>{l.training.code}</button></td>
          <td className={cn(tb.td, 'whitespace-nowrap')}>{dataCurta(l.emissao)}</td>
          <td className={cn(tb.td, 'whitespace-nowrap', !l.validade && 'text-ds-texto-2')}>{l.validade ? dataCurta(l.validade) : '—'}</td>
          <td className={tb.td}><Tag tom={SITUACOES[l.situacao].tom}>{SITUACOES[l.situacao].texto}</Tag></td>
          <td className={cn(tb.td, 'text-center')}>{l.arquivoId ? <a href={`/api/files/${l.arquivoId}?download=1`} onClick={(e) => e.stopPropagation()} aria-label={`Baixar o certificado de ${l.participante}`} className="inline-flex rounded p-1.5 hover:bg-ds-muted ds-foco"><Download className="size-[18px]" /></a> : <span className="ds-caption text-ds-texto-2" title="PDF não encontrado nos arquivos da turma">—</span>}</td>
        </tr>)}</tbody>
      </table></div> : <Vazio icone={<Award />} titulo={linhas.length ? 'Nenhum certificado neste filtro' : 'Nenhum certificado emitido ainda'} texto={linhas.length ? 'Ajuste a busca ou os filtros.' : 'O certificado sai sozinho quando o último dia da turma é encerrado.'} />}
      {filtradas.length ? <div className="flex items-center justify-between border-t border-ds-borda px-5 py-3">
        <span className="ds-body-s text-ds-texto-2">Mostrando {(atual - 1) * POR_PAGINA + 1}–{Math.min(atual * POR_PAGINA, filtradas.length)} de {filtradas.length.toLocaleString('pt-BR')} {filtradas.length === 1 ? 'certificado' : 'certificados'}</span>
        {paginas > 1 ? <div className="flex items-center gap-1">
          <button type="button" aria-label="Página anterior" disabled={atual === 1} onClick={() => setPagina(atual - 1)} className="flex size-8 items-center justify-center rounded-md border border-ds-borda disabled:opacity-40 ds-foco"><ChevronLeft className="size-4" /></button>
          {Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => n === 1 || n === paginas || Math.abs(n - atual) <= 1).map((n, i, lista) => <span key={n} className="flex items-center gap-1">
            {i > 0 && n - lista[i - 1] > 1 ? <span className="flex size-8 items-center justify-center rounded-md border border-ds-borda ds-body-s">…</span> : null}
            <button type="button" aria-current={n === atual ? 'page' : undefined} onClick={() => setPagina(n)} className={cn('flex size-8 items-center justify-center rounded-md ds-body-s font-medium ds-foco', n === atual ? 'bg-ds-inverso text-ds-texto-inv' : 'border border-ds-borda')}>{n}</button>
          </span>)}
          <button type="button" aria-label="Próxima página" disabled={atual === paginas} onClick={() => setPagina(atual + 1)} className="flex size-8 items-center justify-center rounded-md border border-ds-borda disabled:opacity-40 ds-foco"><ChevronRight className="size-4" /></button>
        </div> : null}
      </div> : null}
    </section>

    {turmaEmissao ? <EmitirCertificados key={turmaEmissao.id} training={turmaEmissao} data={data} aberto onFechar={() => setEmissao(null)} reload={reload} notify={notify} /> : null}
  </div>;
}
