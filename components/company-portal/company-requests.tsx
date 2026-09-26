'use client';

import { Inbox, Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';

import { formatDate } from '@/components/company-portal/company-ui';
import { botaoClasses, Cartao, Pilula, selectClasses, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import type { CompanyDashboardData } from '@/lib/company-types';
import { setTrainingRequestStatus } from '@/lib/mock-company-database';
import { cn } from '@/lib/utils';

const STATUS = { open: { tom: 'sinal', texto: 'Em aberto' }, scheduled: { tom: 'sucesso', texto: 'Agendada' }, declined: { tom: 'neutro', texto: 'Não atendida' } } as const;
type Status = keyof typeof STATUS;

/** Pedidos de nova turma que os clientes fazem pelo portal. */
export function CompanyRequests({ data, reload, notify, novaTurma }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (m: string) => void; novaTurma: () => void }) {
  const [filtro, setFiltro] = useState<Status | 'todas'>('open');
  const [salvando, setSalvando] = useState('');
  const lista = data.requests.filter((r) => filtro === 'todas' || r.status === filtro);
  const telefone = (clientId: string) => data.clients.find((c) => c.id === clientId)?.contact_phone ?? '';

  async function mudar(id: string, status: Status) {
    setSalvando(id);
    try { await setTrainingRequestStatus(id, status); notify('Solicitação atualizada. O cliente vê a situação no portal.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao atualizar a solicitação.'); }
    finally { setSalvando(''); }
  }

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Solicitações" subtitulo="Pedidos de nova turma feitos pelos clientes no portal. Marque como agendada quando criar a turma." acoes={<button type="button" onClick={novaTurma} className={botaoClasses('primario', 'M')}>Nova turma</button>} />
    <div className="flex gap-2 overflow-x-auto pb-1">
      {(['open', 'scheduled', 'declined', 'todas'] as const).map((id) => <Pilula key={id} ativa={filtro === id} onClick={() => setFiltro(id)}>{id === 'todas' ? 'Todas' : STATUS[id].texto} · {id === 'todas' ? data.requests.length : data.requests.filter((r) => r.status === id).length}</Pilula>)}
    </div>
    {lista.length ? <div className="grid gap-4 xl:grid-cols-2">{lista.map((r) => { const st = STATUS[(r.status as Status)] ?? STATUS.open; const fone = telefone(r.client_id).replace(/\D/g, ''); return <Cartao key={r.id} className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2"><Tag tom={st.tom}>{st.texto}</Tag><span className="ds-caption text-ds-texto-2">{formatDate(r.created_at)}{r.requested_by_name ? ` · por ${r.requested_by_name}` : ''}</span></div>
      <div><h3 className="ds-h4">{r.nr}{r.title ? ` · ${r.title}` : ''}</h3><p className="ds-body-s font-medium text-ds-amarelo-texto">{r.client_name}</p></div>
      <dl className="grid gap-x-4 gap-y-1 ds-body-s sm:grid-cols-[120px_1fr]">
        <dt className="text-ds-texto-2">Participantes</dt><dd>{r.participants || '—'}</dd>
        <dt className="text-ds-texto-2">Período</dt><dd>{r.preferred_period || '—'}</dd>
        <dt className="text-ds-texto-2">Local</dt><dd>{r.location || '—'}</dd>
        {r.notes ? <><dt className="text-ds-texto-2">Observações</dt><dd className="whitespace-pre-line">{r.notes}</dd></> : null}
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ds-borda pt-3">
        <select aria-label="Situação da solicitação" value={r.status} disabled={salvando === r.id} onChange={(e) => void mudar(r.id, e.target.value as Status)} className={cn(selectClasses, 'min-h-10 w-auto py-2 ds-body-s')}>
          <option value="open">Em aberto</option><option value="scheduled">Agendada</option><option value="declined">Não atendida</option>
        </select>
        {salvando === r.id ? <Loader2 className="size-4 animate-spin text-ds-amarelo-texto" /> : null}
        {fone ? <a href={`https://wa.me/55${fone}`} target="_blank" rel="noreferrer" className={botaoClasses('fantasma', 'P', 'ml-auto')}><MessageCircle />WhatsApp do cliente</a> : null}
      </div>
    </Cartao>; })}</div> : <Vazio icone={<Inbox />} titulo="Nenhuma solicitação aqui" texto="Quando um cliente pedir uma turma pelo portal, ela aparece nesta lista." />}
  </div>;
}
