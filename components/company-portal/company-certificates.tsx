'use client';

import { Award, FileText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmitirCertificados } from '@/components/company-portal/company-trainings';
import { formatDate, formatDayMonth } from '@/components/company-portal/company-ui';
import { Botao, campoClasses, Indicador, Pilula, tabelaClasses as tb, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import type { CompanyDashboardData } from '@/lib/company-types';
import { dataDoDia as dataDaTurma } from '@/lib/dias-da-turma';
import { cn } from '@/lib/utils';

type Filtro = 'todas' | 'aguardando' | 'emitidos' | 'sem_validade';

/** Turmas concluídas e a situação dos certificados de cada uma. */
export function CompanyCertificates({ data, reload, notify, abrirDocumentos }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (m: string) => void; abrirDocumentos: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const [emissao, setEmissao] = useState<string | null>(null);
  const concluidas = useMemo(() => data.trainings.filter((t) => t.status === 'completed').sort((a, b) => dataDaTurma(b).localeCompare(dataDaTurma(a))), [data.trainings]);
  const certificadosPorTurma = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const f of data.files) if (f.name.startsWith('certificado-aluno-')) mapa.set(f.training_id, (mapa.get(f.training_id) ?? 0) + 1);
    return mapa;
  }, [data.files]);
  const aptos = (id: string) => data.participants.filter((p) => p.training_id === id && p.days_total > 0 && p.days_present >= p.days_total).length;
  const regras: Record<Filtro, (t: (typeof concluidas)[number]) => boolean> = {
    todas: () => true,
    aguardando: (t) => !t.certificate_generated_at,
    emitidos: (t) => Boolean(t.certificate_generated_at),
    sem_validade: (t) => !t.validity_months,
  };
  const alvo = busca.trim().toLowerCase();
  const lista = concluidas.filter((t) => regras[filtro](t) && (!alvo || `${t.code} ${t.nr} ${t.title} ${t.client_name}`.toLowerCase().includes(alvo)));
  const totalEmitidos = [...certificadosPorTurma.values()].reduce((a, b) => a + b, 0);
  const turmaEmissao = emissao ? data.trainings.find((t) => t.id === emissao) : undefined;

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Certificados" subtitulo="O certificado sai sozinho quando a turma é encerrada. Aqui você confere, emite o que ficou pendente e define a validade." acoes={<Botao tipo="secundario" onClick={abrirDocumentos}>Documentos<FileText /></Botao>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <Indicador rotulo="Certificados emitidos" valor={totalEmitidos} apoio={`em ${concluidas.filter((t) => t.certificate_generated_at).length} turmas`} onClick={() => setFiltro('emitidos')} />
      <Indicador rotulo="Aguardando emissão" valor={concluidas.filter((t) => !t.certificate_generated_at).length} apoio="turmas concluídas sem certificado" onClick={() => setFiltro('aguardando')} />
      <Indicador rotulo="Sem validade informada" valor={concluidas.filter((t) => !t.validity_months).length} apoio="não entram nas reciclagens do cliente" onClick={() => setFiltro('sem_validade')} />
    </div>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([['todas', 'Todas'], ['aguardando', 'Aguardando'], ['emitidos', 'Emitidos'], ['sem_validade', 'Sem validade']] as Array<[Filtro, string]>).map(([id, rotulo]) => <Pilula key={id} ativa={filtro === id} onClick={() => setFiltro(id)}>{rotulo} · {concluidas.filter(regras[id]).length}</Pilula>)}
      </div>
      <label className="relative lg:ml-auto lg:w-72"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar turma ou cliente" className={cn(campoClasses, 'min-h-10 py-2 pl-10 ds-body-s')} /></label>
    </div>
    {lista.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[860px]')}>
      <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Cliente</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Encerrada</th><th className={tb.th}>Certificados</th><th className={tb.th}>Validade</th><th className={tb.th}><span className="sr-only">Ação</span></th></tr></thead>
      <tbody>{lista.map((t) => { const emitidos = certificadosPorTurma.get(t.id) ?? 0; return <tr key={t.id} className={tb.linha}>
        <td className={tb.td}><span className={tb.codigo}>{t.code}</span></td>
        <td className={cn(tb.td, 'font-medium')}>{t.client_name}</td>
        <td className={cn(tb.td, 'max-w-[220px] truncate')} title={t.title}>{t.nr} · {t.title}</td>
        <td className={cn(tb.td, 'whitespace-nowrap')}>{formatDayMonth(dataDaTurma(t))}</td>
        <td className={tb.td}>{t.certificate_generated_at ? <Tag tom="sucesso">{emitidos} de {aptos(t.id)} · {formatDate(t.certificate_generated_at)}</Tag> : <Tag tom="sinal">Aguardando</Tag>}</td>
        <td className={tb.td}>{t.validity_months ? `${t.validity_months} meses` : <span className="text-ds-texto-2">Não informada</span>}</td>
        <td className={cn(tb.td, 'text-right')}><Botao tamanho="P" tipo={t.certificate_generated_at ? 'fantasma' : 'primario'} onClick={() => setEmissao(t.id)}><Award />{t.certificate_generated_at ? 'Ver e gerar de novo' : 'Emitir'}</Botao></td>
      </tr>; })}</tbody>
    </table></div></div> : <Vazio icone={<Award />} titulo="Nenhuma turma neste filtro" texto="As turmas aparecem aqui quando o último dia é encerrado." />}
    {turmaEmissao ? <EmitirCertificados key={turmaEmissao.id} training={turmaEmissao} data={data} aberto onFechar={() => setEmissao(null)} reload={reload} notify={notify} /> : null}
  </div>;
}
