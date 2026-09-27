'use client';

import { Inbox, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { PedidoDeDocumento } from '@/components/company-portal/company-avulsos';
import { formatDate } from '@/components/company-portal/company-ui';
import { botaoClasses, Cartao, Pilula, selectClasses, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import type { CompanyDashboardData, CompanyDocumentRequest, CompanySiteLead, CompanyTrainingRequest } from '@/lib/company-types';
import { removeRequest, setSiteLeadStatus, setTrainingRequestStatus } from '@/lib/mock-company-database';
import { OPCOES_DE_TREINAMENTO } from '@/lib/site-novo/normas';
import { cn } from '@/lib/utils';

const STATUS = { open: { tom: 'sinal', texto: 'Em aberto' }, scheduled: { tom: 'sucesso', texto: 'Agendada' }, declined: { tom: 'neutro', texto: 'Não atendida' } } as const;
type Status = keyof typeof STATUS;

/** Pedido de turma ou de documento no portal, ou pedido de proposta do formulário do site. */
type Item = { origem: 'portal'; pedido: CompanyTrainingRequest } | { origem: 'site'; pedido: CompanySiteLead } | { origem: 'documento'; pedido: CompanyDocumentRequest };

/** Documento enviado conta como atendido, junto com a turma agendada. */
const grupo = (item: Item) => (item.origem === 'documento' && item.pedido.status === 'sent' ? 'scheduled' : item.pedido.status);

/** Solicitações em aberto, do portal e do site: o número do menu e do painel. */
export function solicitacoesAbertas(data: CompanyDashboardData) {
  return data.requests.filter((r) => r.status === 'open').length + data.siteLeads.filter((l) => l.status === 'open').length + data.documentRequests.filter((r) => r.status === 'open').length;
}

/** Pedidos de nova turma que os clientes fazem pelo portal e pedidos de proposta do site. */
export function CompanyRequests({ data, reload, notify, novaTurma }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (m: string) => void; novaTurma: () => void }) {
  const [filtro, setFiltro] = useState<Status | 'todas'>('open');
  const [salvando, setSalvando] = useState('');
  const itens: Item[] = [
    ...data.requests.map((pedido) => ({ origem: 'portal' as const, pedido })),
    ...data.siteLeads.map((pedido) => ({ origem: 'site' as const, pedido })),
    ...data.documentRequests.map((pedido) => ({ origem: 'documento' as const, pedido })),
  ].sort((a, b) => b.pedido.created_at.localeCompare(a.pedido.created_at));
  const lista = itens.filter((item) => filtro === 'todas' || grupo(item) === filtro);
  const telefone = (clientId: string) => data.clients.find((c) => c.id === clientId)?.contact_phone ?? '';

  async function mudar(item: Exclude<Item, { origem: 'documento' }>, status: Status) {
    setSalvando(item.pedido.id);
    try {
      if (item.origem === 'site') {
        await setSiteLeadStatus(item.pedido.id, status);
        notify('Pedido do site atualizado.');
      } else {
        await setTrainingRequestStatus(item.pedido.id, status);
        notify('Solicitação atualizada. O cliente vê a situação no portal.');
      }
      await reload();
    }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao atualizar a solicitação.'); }
    finally { setSalvando(''); }
  }

  async function excluir(item: Item) {
    const aviso = item.origem === 'site'
      ? `Excluir o pedido de proposta de ${item.pedido.company || item.pedido.name}? Esta ação não pode ser desfeita.`
      : item.origem === 'documento'
        ? `Excluir o pedido de "${item.pedido.title}" de ${item.pedido.client_name}? O cliente deixa de ver o pedido no portal${item.pedido.status === 'sent' ? ', mas o documento enviado continua com ele' : ''}. Esta ação não pode ser desfeita.`
        : `Excluir o pedido de ${item.pedido.nr} de ${item.pedido.client_name}? O cliente deixa de ver o pedido no portal. Esta ação não pode ser desfeita.`;
    if (!window.confirm(aviso)) return;
    setSalvando(item.pedido.id);
    try { await removeRequest(item.pedido.id, item.origem); notify('Solicitação excluída.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir a solicitação.'); }
    finally { setSalvando(''); }
  }

  const lixeira = (item: Item) => <button type="button" onClick={() => void excluir(item)} disabled={salvando === item.pedido.id} aria-label="Excluir solicitação" title="Excluir solicitação" className="absolute top-3 right-3 rounded p-1.5 text-ds-texto-2 hover:bg-ds-perigo-suave hover:text-ds-perigo disabled:opacity-40"><Trash2 className="size-4" /></button>;

  const situacao = (item: Exclude<Item, { origem: 'documento' }>) => <div className="flex items-center gap-2">
    <select aria-label="Situação da solicitação" value={item.pedido.status} disabled={salvando === item.pedido.id} onChange={(e) => void mudar(item, e.target.value as Status)} className={cn(selectClasses, 'min-h-10 w-auto py-2 ds-body-s')}>
      <option value="open">Em aberto</option><option value="scheduled">Agendada</option><option value="declined">Não atendida</option>
    </select>
    {salvando === item.pedido.id ? <Loader2 className="size-4 animate-spin text-ds-amarelo-texto" /> : null}
  </div>;

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Solicitações" subtitulo="Pedidos de turma e de documento feitos pelos clientes no portal, e pedidos de proposta que chegam pelo site. Marque a turma como agendada quando criá-la; o pedido de documento fecha sozinho quando você envia o arquivo." acoes={<button type="button" onClick={novaTurma} className={botaoClasses('primario', 'M')}>Nova turma</button>} />
    <div className="flex gap-2 overflow-x-auto pb-1">
      {(['open', 'scheduled', 'declined', 'todas'] as const).map((id) => <Pilula key={id} ativa={filtro === id} onClick={() => setFiltro(id)}>{id === 'todas' ? 'Todas' : id === 'scheduled' ? 'Agendada ou enviada' : STATUS[id].texto} · {id === 'todas' ? itens.length : itens.filter((item) => grupo(item) === id).length}</Pilula>)}
    </div>
    {lista.length ? <div className="grid gap-4 xl:grid-cols-2">{lista.map((item) => {
      if (item.origem === 'documento') return <Cartao key={`doc-${item.pedido.id}`} className="relative p-5"><PedidoDeDocumento pedido={item.pedido} notify={notify} reload={reload} mostrarCliente acao={lixeira(item)} /></Cartao>;
      const st = STATUS[(item.pedido.status as Status)] ?? STATUS.open;
      if (item.origem === 'site') {
        const lead = item.pedido;
        const normas = lead.trainings.split(',').filter(Boolean).map((valor) => OPCOES_DE_TREINAMENTO.find((opcao) => opcao.valor === valor)?.rotulo ?? valor).join(' · ');
        const fone = lead.phone.replace(/\D/g, '');
        const empresa = [lead.company_size ? `${lead.company_size} funcionários` : '', lead.document ? `CNPJ ${lead.document}` : ''].filter(Boolean).join(' · ');
        return <Cartao key={`site-${lead.id}`} className="relative flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2 pr-8"><Tag tom={st.tom}>{st.texto}</Tag><Tag tom="info">Site</Tag><span className="ds-caption text-ds-texto-2">{formatDate(lead.created_at)}</span>{lixeira(item)}</div>
          <div><h3 className="ds-h4">{normas || 'Pedido de proposta'}</h3><p className="ds-body-s font-medium text-ds-amarelo-texto">{lead.company}</p></div>
          <dl className="grid gap-x-4 gap-y-1 ds-body-s sm:grid-cols-[120px_1fr]">
            <dt className="text-ds-texto-2">Contato</dt><dd>{lead.name}{lead.job_title ? ` · ${lead.job_title}` : ''}</dd>
            <dt className="text-ds-texto-2">E-mail</dt><dd className="break-all"><a href={`mailto:${lead.email}`} className="underline underline-offset-4">{lead.email}</a></dd>
            <dt className="text-ds-texto-2">Celular</dt><dd>{lead.phone || '—'}</dd>
            <dt className="text-ds-texto-2">Participantes</dt><dd>{lead.participants || '—'}</dd>
            <dt className="text-ds-texto-2">Modalidade</dt><dd>{[lead.modality, lead.state].filter(Boolean).join(' · ') || '—'}</dd>
            {lead.deadline ? <><dt className="text-ds-texto-2">Prazo</dt><dd>{lead.deadline}</dd></> : null}
            {empresa ? <><dt className="text-ds-texto-2">Empresa</dt><dd>{empresa}</dd></> : null}
            {lead.message ? <><dt className="text-ds-texto-2">Mensagem</dt><dd className="whitespace-pre-line">{lead.message}</dd></> : null}
          </dl>
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ds-borda pt-3">
            {situacao(item)}
            {fone ? <a href={`https://wa.me/55${fone}`} target="_blank" rel="noreferrer" className={botaoClasses('fantasma', 'P', 'ml-auto')}><MessageCircle />WhatsApp</a> : null}
          </div>
        </Cartao>;
      }
      const r = item.pedido;
      const fone = telefone(r.client_id).replace(/\D/g, '');
      return <Cartao key={`portal-${r.id}`} className="relative flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 pr-8"><Tag tom={st.tom}>{st.texto}</Tag><Tag tom="neutro">Portal</Tag><span className="ds-caption text-ds-texto-2">{formatDate(r.created_at)}{r.requested_by_name ? ` · por ${r.requested_by_name}` : ''}</span>{lixeira(item)}</div>
        <div><h3 className="ds-h4">{r.nr}{r.title ? ` · ${r.title}` : ''}</h3><p className="ds-body-s font-medium text-ds-amarelo-texto">{r.client_name}</p></div>
        <dl className="grid gap-x-4 gap-y-1 ds-body-s sm:grid-cols-[120px_1fr]">
          <dt className="text-ds-texto-2">Participantes</dt><dd>{r.participants || '—'}</dd>
          <dt className="text-ds-texto-2">Período</dt><dd>{r.preferred_period || '—'}</dd>
          <dt className="text-ds-texto-2">Local</dt><dd>{r.location || '—'}</dd>
          {r.notes ? <><dt className="text-ds-texto-2">Observações</dt><dd className="whitespace-pre-line">{r.notes}</dd></> : null}
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ds-borda pt-3">
          {situacao(item)}
          {fone ? <a href={`https://wa.me/55${fone}`} target="_blank" rel="noreferrer" className={botaoClasses('fantasma', 'P', 'ml-auto')}><MessageCircle />WhatsApp do cliente</a> : null}
        </div>
      </Cartao>;
    })}</div> : <Vazio icone={<Inbox />} titulo="Nenhuma solicitação aqui" texto="Quando um cliente pedir uma turma ou um documento pelo portal, ou alguém pedir proposta pelo site, o pedido aparece nesta lista." />}
  </div>;
}
