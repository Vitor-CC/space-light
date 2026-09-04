'use client';

import { Building2, Check, KeyRound, Loader2, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import { AccessCredentials, EmptyState, fieldClass } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyClient, CompanyDashboardData } from '@/lib/company-types';
import { approveClient, createMockClient, deleteClient, resetUserPassword, saveClientAddress } from '@/lib/mock-company-database';

type Draft = { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string };
const emptyDraft: Draft = { name: '', legalName: '', document: '', unit: '', contactName: '', contactEmail: '', contactPhone: '' };

type EnderecoDraft = { address: string; district: string; city: string; state: string; postalCode: string };

function ClientAddress({ client, notify, reload }: { client: CompanyClient; notify: (message: string) => void; reload: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<EnderecoDraft>({
    address: client.address ?? '',
    district: client.district ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    postalCode: client.postal_code ?? '',
  });

  const completo = Boolean(client.address && client.city && client.state);
  const resumo = completo
    ? `${client.address}${client.district ? ` - ${client.district}` : ''} · ${client.city}/${client.state}`
    : 'Endereço não preenchido';

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await saveClientAddress({ clientId: client.id, ...draft });
      notify('Endereço salvo.');
      setAberto(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar o endereço.');
    } finally {
      setSalvando(false);
    }
  }

  return <div className="mt-5 border-t border-black/8 pt-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">Endereço da edificação</span>
        <p className={`mt-1 text-xs ${completo ? 'text-[#555]' : 'font-bold text-[#b62525]'}`}>{resumo}</p>
        {!completo ? <p className="mt-1 text-[10px] leading-relaxed text-[#888]">Necessário para emitir o atestado de treinamento.</p> : null}
      </div>
      <button type="button" onClick={() => setAberto((v) => !v)} className="inline-flex h-9 shrink-0 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] hover:bg-black hover:text-white">
        <MapPin className="size-3.5" />{aberto ? 'Fechar' : completo ? 'Editar' : 'Preencher'}
      </button>
    </div>

    {aberto ? <form onSubmit={salvar} className="mt-4 grid gap-3 border border-black/10 bg-[#f7f7f4] p-4 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Logradouro e número</span><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Rua São Severo, 408" className={fieldClass} /></label>
      <label><span className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Bairro</span><Input value={draft.district} onChange={(e) => setDraft({ ...draft, district: e.target.value })} placeholder="Vila Ré" className={fieldClass} /></label>
      <label><span className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-[0.12em]">CEP</span><Input value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })} placeholder="03670-000" className={fieldClass} /></label>
      <label><span className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Município</span><Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="São Paulo" className={fieldClass} /></label>
      <label><span className="mb-1.5 block text-[9px] font-extrabold uppercase tracking-[0.12em]">UF</span><Input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SP" maxLength={2} className={fieldClass} /></label>
      <Button type="submit" disabled={salvando} className="mt-1 h-11 rounded-none bg-[#f2ad19] text-[9px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] sm:col-span-2">
        {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar endereço
      </Button>
    </form> : null}
  </div>;
}

export function CompanyClients({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [createdAccess, setCreatedAccess] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [resetAccess, setResetAccess] = useState<{ name: string; email: string; temporaryPassword: string; active: boolean } | null>(null);
  const filtered = data.clients.filter((client) => `${client.name} ${client.legal_name} ${client.document}`.toLowerCase().includes(query.toLowerCase()));

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const access = await createMockClient(draft);
      setCreatedAccess(access);
      setDraft(emptyDraft);
      setShowForm(false);
      notify('Cliente cadastrado e acesso temporário gerado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao cadastrar cliente.'); }
  }

  async function approve(id: string) {
    try { await approveClient(id); notify('Acesso do cliente aprovado.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao aprovar o cliente.'); }
  }

  async function remove(client: { id: string; name: string }) {
    if (!window.confirm(`Excluir "${client.name}" e TODOS os seus treinamentos, participantes e arquivos? Esta ação não pode ser desfeita.`)) return;
    try { await deleteClient(client.id); notify('Cliente excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o cliente.'); }
  }

  async function resetPassword(client: { id: string; name: string }) {
    if (!window.confirm(`Gerar uma nova senha temporária para "${client.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try { setResetAccess(await resetUserPassword({ clientId: client.id })); notify('Senha temporária gerada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.'); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" /><Input aria-label="Buscar cliente ou CNPJ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou CNPJ" className={`${fieldClass} pl-11`} /></div><Button type="button" onClick={() => setShowForm((value) => !value)} className="h-12 rounded-none bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]">{showForm ? <X className="size-4" /> : <Plus className="size-4" />}{showForm ? 'Fechar cadastro' : 'Novo cliente'}</Button></div>
    {createdAccess ? <AccessCredentials eyebrow="Envie ao cliente" note="Esta senha temporária aparece somente agora. O cliente deverá trocá-la no primeiro acesso." email={createdAccess.email} password={createdAccess.temporaryPassword} onDismiss={() => setCreatedAccess(null)} /> : null}
    {resetAccess ? <AccessCredentials eyebrow={`Nova senha de ${resetAccess.name}`} note={resetAccess.active ? 'Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o cliente terá de criar uma nova.' : 'Anote agora: a senha aparece somente desta vez. Atenção: este acesso ainda está inativo — aprove o cliente para ele conseguir entrar.'} email={resetAccess.email} password={resetAccess.temporaryPassword} onDismiss={() => setResetAccess(null)} /> : null}
    {showForm ? <form onSubmit={save} className="border border-black/10 bg-white p-6 md:p-7"><span className="eyebrow text-[#8a6107]">Cadastro corporativo</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Novo cliente</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome de exibição" className={fieldClass} /><Input required value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} placeholder="Razão social" className={fieldClass} /><Input required value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })} placeholder="CNPJ" className={fieldClass} /><Input required value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="Unidade / cidade" className={fieldClass} /><Input required value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Responsável na empresa" className={fieldClass} /><Input required type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} placeholder="E-mail do responsável" className={fieldClass} /><Input value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} placeholder="Telefone" className={fieldClass} /></div><Button type="submit" className="mt-5 h-12 rounded-none bg-black px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#f2ad19] hover:text-black"><Check className="size-4" />Salvar e gerar acesso</Button></form> : null}
    <div className="grid gap-4 xl:grid-cols-2">{filtered.map((client) => {
      const trainings = data.trainings.filter((item) => item.client_id === client.id);
      const files = data.files.filter((item) => item.client_id === client.id).length;
      const statusClass = client.status === 'pending' ? 'bg-[#fff0d2] text-[#8a6107]' : client.status === 'invited' ? 'bg-[#e7eef9] text-[#31598e]' : 'bg-[#daf2df] text-[#17642d]';
      const statusLabel = client.status === 'pending' ? 'Aguardando aprovação' : client.status === 'invited' ? 'Convite criado' : 'Ativo';
      return <article key={client.id} className="border border-black/10 bg-white p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black text-[#f2ad19]"><Building2 className="size-5" /></span><div className="min-w-0"><span className={`px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] ${statusClass}`}>{statusLabel}</span><h2 className="mt-3 text-xl font-extrabold uppercase tracking-[0.04em]">{client.name}</h2><p className="mt-1 text-xs text-[#777]">{client.legal_name} · {client.document}</p></div></div><div className="mt-6 grid grid-cols-3 gap-px bg-black/8 text-center"><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{trainings.length}</strong><span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#888]">Treinos</span></div><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{files}</strong><span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#888]">Arquivos</span></div><div className="bg-[#f7f7f4] p-3"><strong className="block text-lg">{trainings.reduce((sum, item) => sum + item.participant_count, 0)}</strong><span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#888]">Inscritos</span></div></div><dl className="mt-5 grid gap-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-[#777]">Unidade</dt><dd className="text-right font-bold">{client.unit}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#777]">Responsável</dt><dd className="text-right font-bold">{client.contact_name}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#777]">E-mail</dt><dd className="break-all text-right font-bold">{client.contact_email}</dd></div></dl><ClientAddress client={client} notify={notify} reload={reload} /><div className="mt-5 flex flex-wrap gap-2">{client.status === 'pending' ? <Button type="button" onClick={() => void approve(client.id)} className="h-11 rounded-none bg-[#f2ad19] px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Check className="size-4" /> Aprovar acesso</Button> : null}<button type="button" onClick={() => void resetPassword({ id: client.id, name: client.name })} className="inline-flex h-11 items-center gap-2 border border-black/15 px-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#555] hover:border-black hover:bg-black hover:text-white"><KeyRound className="size-3.5" />Redefinir senha</button><button type="button" onClick={() => void remove({ id: client.id, name: client.name })} className="inline-flex h-11 items-center gap-2 border border-[#b62525]/40 px-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#b62525] hover:bg-[#b62525] hover:text-white"><Trash2 className="size-3.5" />Excluir</button></div></article>;
    })}</div>
    {filtered.length === 0 ? <EmptyState icon={Building2} title="Nenhum cliente encontrado" text="Ajuste a busca ou cadastre uma nova empresa." /> : null}
  </div>;
}
