'use client';

import { Building2, Check, ChevronDown, KeyRound, Loader2, MapPin, Pencil, Plus, Search, Trash2, TriangleAlert, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { AccessCredentials, EmptyState, fieldClass, labelClass, selectClass, SubTabs } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyClient, CompanyDashboardData } from '@/lib/company-types';
import { approveClient, createMockClient, deleteClient, resetUserPassword, saveClientAddress, setClientUsername, updateClient } from '@/lib/mock-company-database';
import { limparDigitacaoUsuario, USUARIO_REGRA } from '@/lib/usuario';

type Aba = 'lista' | 'criar';

type Draft = { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string; username: string };
const emptyDraft: Draft = { name: '', legalName: '', document: '', unit: '', contactName: '', contactEmail: '', contactPhone: '', username: '' };

type EnderecoDraft = { address: string; district: string; city: string; state: string; postalCode: string };

/** Só dígitos: o CNPJ é digitado com e sem pontuação, e as duas têm de achar. */
function digitos(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

function enderecoCompleto(client: CompanyClient) {
  return Boolean(client.address && client.city && client.state);
}

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

  const completo = enderecoCompleto(client);
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

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="ds-caps text-ds-amarelo-texto">Endereço da edificação</span>
        <p className={`mt-1 text-xs ${completo ? 'text-ds-texto-2' : 'font-bold text-ds-perigo'}`}>{resumo}</p>
        {!completo ? <p className="mt-1 text-[11px] leading-relaxed text-ds-texto-2">Necessário para emitir o atestado de treinamento.</p> : null}
      </div>
      <button type="button" onClick={() => setAberto((v) => !v)} className="rounded-md inline-flex h-10 shrink-0 items-center gap-2 border border-ds-borda bg-ds-superficie px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">
        <MapPin className="size-3.5" />{aberto ? 'Fechar' : completo ? 'Editar' : 'Preencher'}
      </button>
    </div>

    {aberto ? <form onSubmit={salvar} className="rounded-lg mt-4 grid gap-3 border border-ds-borda bg-ds-superficie p-4 sm:grid-cols-2">
      <label className="sm:col-span-2" htmlFor={`endereco-${client.id}-logradouro`}><span className="mb-1.5 block ds-caps">Logradouro e número</span><Input id={`endereco-${client.id}-logradouro`} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Ex.: Rua das Palmeiras, 120" className={fieldClass} /></label>
      <label htmlFor={`endereco-${client.id}-bairro`}><span className="mb-1.5 block ds-caps">Bairro</span><Input id={`endereco-${client.id}-bairro`} value={draft.district} onChange={(e) => setDraft({ ...draft, district: e.target.value })} placeholder="Ex.: Centro" className={fieldClass} /></label>
      <label htmlFor={`endereco-${client.id}-cep`}><span className="mb-1.5 block ds-caps">CEP</span><Input id={`endereco-${client.id}-cep`} value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })} placeholder="Ex.: 01000-000" className={fieldClass} /></label>
      <label htmlFor={`endereco-${client.id}-municipio`}><span className="mb-1.5 block ds-caps">Município</span><Input id={`endereco-${client.id}-municipio`} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Ex.: São Paulo" className={fieldClass} /></label>
      <label htmlFor={`endereco-${client.id}-uf`}><span className="mb-1.5 block ds-caps">UF</span><Input id={`endereco-${client.id}-uf`} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="Ex.: SP" maxLength={2} className={fieldClass} /></label>
      <Button type="submit" disabled={salvando} className="mt-1 h-11 bg-ds-amarelo ds-botao text-ds-texto hover:bg-[#eab900] sm:col-span-2">
        {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar endereço
      </Button>
    </form> : null}
  </div>;
}

type DadosCliente = { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string };

/** A gestão edita qualquer dado cadastral da empresa. */
function ClientEdit({ client, notify, reload }: { client: CompanyClient; notify: (message: string) => void; reload: () => Promise<void> }) {
  const inicial = (): DadosCliente => ({ name: client.name, legalName: client.legal_name, document: client.document, unit: client.unit, contactName: client.contact_name, contactEmail: client.contact_email, contactPhone: client.contact_phone ?? '' });
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosCliente>(inicial);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await updateClient(client.id, draft);
      notify('Dados do cliente salvos.');
      setAberto(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar os dados do cliente.');
    } finally {
      setSalvando(false);
    }
  }

  const campo = (chave: keyof DadosCliente, rotulo: string, extra: { type?: string; required?: boolean } = {}) => <label key={chave} htmlFor={`cliente-${client.id}-${chave}`}><span className="mb-1.5 block ds-caps">{rotulo}</span><Input id={`cliente-${client.id}-${chave}`} type={extra.type ?? 'text'} required={extra.required ?? true} value={draft[chave]} onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })} className={fieldClass} /></label>;

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="ds-caps text-ds-amarelo-texto">Dados cadastrais</span>
        <p className="mt-1 text-[11px] leading-relaxed text-ds-texto-2">Razão social e CNPJ saem impressos nos documentos.</p>
      </div>
      <button type="button" onClick={() => { setDraft(inicial()); setAberto((v) => !v); }} className="rounded-md inline-flex h-10 shrink-0 items-center gap-2 border border-ds-borda bg-ds-superficie px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">
        <Pencil className="size-3.5" />{aberto ? 'Fechar' : 'Editar dados'}
      </button>
    </div>

    {aberto ? <form onSubmit={salvar} className="rounded-lg mt-4 grid gap-3 border border-ds-borda bg-ds-superficie p-4 sm:grid-cols-2">
      {campo('name', 'Nome de exibição')}
      {campo('legalName', 'Razão social')}
      {campo('document', 'CNPJ')}
      {campo('unit', 'Unidade / cidade')}
      {campo('contactName', 'Responsável na empresa')}
      {campo('contactEmail', 'E-mail do responsável (contato)', { type: 'email' })}
      {campo('contactPhone', 'Telefone', { required: false })}
      <Button type="submit" disabled={salvando} className="mt-1 h-11 bg-ds-amarelo ds-botao text-ds-texto hover:bg-[#eab900] sm:col-span-2">
        {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar dados
      </Button>
    </form> : null}
  </div>;
}

/** Login da empresa no portal. Sem ele, ninguém da empresa consegue entrar. */
function ClientUsername({ client, notify, reload }: { client: CompanyClient; notify: (message: string) => void; reload: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valor, setValor] = useState(client.username ?? '');

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await setClientUsername(client.id, valor);
      notify('Nome de usuário salvo. Avise a empresa: é com ele que ela entra no portal.');
      setAberto(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar o nome de usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="ds-caps text-ds-amarelo-texto">Nome de usuário (login)</span>
        <p className={`mt-1 text-xs ${client.username ? 'font-mono font-bold text-ds-texto' : 'font-bold text-ds-perigo'}`}>{client.username ?? 'Não definido'}</p>
        {!client.username ? <p className="mt-1 text-[11px] leading-relaxed text-ds-texto-2">Sem ele, a empresa não consegue entrar no portal.</p> : null}
      </div>
      <button type="button" onClick={() => setAberto((v) => !v)} className="rounded-md inline-flex h-10 shrink-0 items-center gap-2 border border-ds-borda bg-ds-superficie px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">
        <UserRound className="size-3.5" />{aberto ? 'Fechar' : client.username ? 'Alterar' : 'Definir'}
      </button>
    </div>

    {aberto ? <form onSubmit={salvar} className="rounded-lg mt-4 flex flex-col gap-3 border border-ds-borda bg-ds-superficie p-4 sm:flex-row sm:items-start">
      <label className="flex-1" htmlFor={`usuario-${client.id}`}><span className="mb-1.5 block ds-caps">Nome de usuário</span><Input id={`usuario-${client.id}`} required minLength={3} maxLength={40} value={valor} onChange={(e) => setValor(limparDigitacaoUsuario(e.target.value))} placeholder="ex.: empresaexemplo1" autoCapitalize="none" spellCheck={false} className={`${fieldClass} font-mono`} /><span className="mt-1.5 block text-[11px] leading-relaxed text-ds-texto-2">{USUARIO_REGRA}</span></label>
      <Button type="submit" disabled={salvando} className="h-11 bg-ds-amarelo px-5 ds-botao text-ds-texto hover:bg-[#eab900] sm:mt-[22px]">
        {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar
      </Button>
    </form> : null}
  </div>;
}

function ClientRow({ client, turmas, arquivos, inscritos, aberta, alternar, acoes, notify, reload }: {
  client: CompanyClient;
  turmas: number;
  arquivos: number;
  inscritos: number;
  aberta: boolean;
  alternar: () => void;
  acoes: { approve: () => void; reset: () => void; remove: () => void };
  notify: (message: string) => void;
  reload: () => Promise<void>;
}) {
  const pendente = client.status === 'pending';
  const tom = pendente ? 'bg-ds-amarelo-suave text-ds-amarelo-texto' : client.status === 'invited' ? 'bg-ds-info-suave text-ds-info' : 'bg-ds-sucesso-suave text-ds-sucesso';
  const rotulo = pendente ? 'Aguardando' : client.status === 'invited' ? 'Convidado' : 'Ativo';
  const semEndereco = !enderecoCompleto(client);

  return <article className="border border-ds-borda bg-ds-superficie">
    <button type="button" onClick={alternar} aria-expanded={aberta} className="flex w-full items-center gap-4 p-4 text-left hover:bg-ds-amarelo-suave">
      <span className="rounded-md flex size-11 shrink-0 items-center justify-center bg-black text-ds-amarelo"><Building2 className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate ds-body-s font-semibold">{client.name}</strong>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ds-texto-2">
          <span className="truncate">{client.document}</span>
          <span className="truncate">{client.unit}</span>
          <span>{turmas === 1 ? '1 turma' : `${turmas} turmas`}</span>
          <span>{inscritos} inscrito(s)</span>
        </span>
      </span>
      {semEndereco ? <span className="hidden shrink-0 items-center gap-1.5 bg-ds-perigo-suave px-2.5 py-1 ds-caps text-ds-perigo md:inline-flex"><TriangleAlert className="size-3.5" />Sem endereço</span> : null}
      {!client.username ? <span className="hidden shrink-0 items-center gap-1.5 bg-ds-perigo-suave px-2.5 py-1 ds-caps text-ds-perigo md:inline-flex"><TriangleAlert className="size-3.5" />Sem usuário</span> : null}
      <span className={`shrink-0 px-2.5 py-1 ds-caps ${tom}`}>{rotulo}</span>
      <ChevronDown className={`size-4 shrink-0 text-ds-texto-2 transition ${aberta ? 'rotate-180' : ''}`} />
    </button>

    {aberta ? <div className="space-y-5 border-t border-ds-borda bg-ds-muted p-5">
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Razão social</dt><dd className="text-right font-bold">{client.legal_name}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Responsável</dt><dd className="text-right font-bold">{client.contact_name}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">E-mail de contato</dt><dd className="break-all text-right font-bold">{client.contact_email}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Telefone</dt><dd className="text-right font-bold">{client.contact_phone || '—'}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Arquivos</dt><dd className="text-right font-bold">{arquivos}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Treinamentos</dt><dd className="text-right font-bold">{turmas}</dd></div>
      </dl>
      <ClientEdit client={client} notify={notify} reload={reload} />
      <ClientUsername client={client} notify={notify} reload={reload} />
      <ClientAddress client={client} notify={notify} reload={reload} />
      <div className="flex flex-wrap gap-2">
        {pendente ? <Button type="button" onClick={acoes.approve} className="h-11 bg-ds-amarelo px-4 ds-botao text-ds-texto hover:bg-[#eab900]"><Check className="size-4" />Aprovar acesso</Button> : null}
        <button type="button" onClick={acoes.reset} className="rounded-md inline-flex h-11 items-center gap-2 border border-ds-borda bg-ds-superficie px-4 ds-botao text-ds-texto-2 hover:border-black hover:bg-ds-inverso hover:text-ds-texto-inv"><KeyRound className="size-3.5" />Redefinir senha</button>
        <button type="button" onClick={acoes.remove} className="rounded-md ml-auto inline-flex h-11 items-center gap-2 border border-ds-perigo bg-ds-superficie px-4 ds-botao text-ds-perigo hover:bg-ds-perigo hover:text-ds-texto-inv"><Trash2 className="size-3.5" />Excluir</button>
      </div>
    </div> : null}
  </article>;
}

export function CompanyClients({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [aba, setAba] = useState<Aba>('lista');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'pending' | 'active' | 'sem_endereco' | 'sem_usuario'>('todos');
  const [aberta, setAberta] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [createdAccess, setCreatedAccess] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [resetAccess, setResetAccess] = useState<{ name: string; username: string | null; temporaryPassword: string; active: boolean } | null>(null);

  const alvo = query.trim().toLowerCase();
  const alvoDigitos = digitos(query);
  const filtered = useMemo(() => data.clients.filter((client) => {
    const casa = !alvo
      || `${client.name} ${client.legal_name} ${client.contact_email} ${client.username ?? ''}`.toLowerCase().includes(alvo)
      || (alvoDigitos.length > 0 && digitos(client.document).includes(alvoDigitos));
    if (!casa) return false;
    if (filtro === 'sem_endereco') return !enderecoCompleto(client);
    if (filtro === 'sem_usuario') return !client.username;
    if (filtro === 'todos') return true;
    return client.status === filtro;
  }), [data.clients, alvo, alvoDigitos, filtro]);

  const semEndereco = data.clients.filter((client) => !enderecoCompleto(client)).length;
  const semUsuario = data.clients.filter((client) => !client.username).length;

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const access = await createMockClient(draft);
      setCreatedAccess(access);
      setDraft(emptyDraft);
      setAba('lista');
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
    <SubTabs label="Seções de clientes" active={aba} onChange={setAba} tabs={[
      { id: 'lista', label: 'Clientes', count: data.clients.length },
      { id: 'criar', label: 'Cadastrar' },
    ]} />

    {createdAccess ? <AccessCredentials eyebrow="Envie ao cliente" note="Esta senha temporária aparece somente agora. O cliente deverá trocá-la no primeiro acesso." loginLabel="Nome de usuário" email={createdAccess.username} password={createdAccess.temporaryPassword} onDismiss={() => setCreatedAccess(null)} /> : null}
    {resetAccess ? <AccessCredentials eyebrow={`Nova senha de ${resetAccess.name}`} note={resetAccess.active ? 'Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o cliente terá de criar uma nova.' : 'Anote agora: a senha aparece somente desta vez. Atenção: este acesso ainda está inativo — aprove o cliente para ele conseguir entrar.'} loginLabel="Nome de usuário" email={resetAccess.username ?? 'Não definido — defina antes de enviar'} password={resetAccess.temporaryPassword} onDismiss={() => setResetAccess(null)} /> : null}

    {aba === 'lista' ? <>
      {semUsuario > 0 ? <button type="button" onClick={() => setFiltro('sem_usuario')} className="flex w-full items-center gap-3 border-l-4 border-ds-perigo bg-ds-perigo-suave p-4 text-left hover:bg-ds-perigo-suave">
        <TriangleAlert className="size-5 shrink-0 text-ds-perigo" />
        <span className="text-xs font-bold text-ds-perigo">{semUsuario === 1 ? '1 cliente está sem nome de usuário' : `${semUsuario} clientes estão sem nome de usuário`} — sem ele a empresa não consegue entrar no portal. Ver quais →</span>
      </button> : null}

      {semEndereco > 0 ? <button type="button" onClick={() => setFiltro('sem_endereco')} className="flex w-full items-center gap-3 border-l-4 border-ds-perigo bg-ds-perigo-suave p-4 text-left hover:bg-ds-perigo-suave">
        <TriangleAlert className="size-5 shrink-0 text-ds-perigo" />
        <span className="text-xs font-bold text-ds-perigo">{semEndereco === 1 ? '1 cliente está sem endereço da edificação' : `${semEndereco} clientes estão sem endereço da edificação`} — sem ele o atestado sai incompleto. Ver quais →</span>
      </button> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ds-texto-2" /><Input aria-label="Buscar cliente ou CNPJ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, usuário, CNPJ ou e-mail" className={`${fieldClass} pl-11`} /></div>
        <label className="sm:w-60" htmlFor="clientes-filtro"><span className="sr-only">Filtrar clientes</span>
          <select id="clientes-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={selectClass}>
            <option value="todos">Todos</option>
            <option value="active">Ativos</option>
            <option value="pending">Aguardando aprovação</option>
            <option value="sem_endereco">Sem endereço</option>
            <option value="sem_usuario">Sem nome de usuário</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">{filtered.map((client) => {
        const turmas = data.trainings.filter((item) => item.client_id === client.id);
        return <ClientRow key={client.id} client={client} notify={notify} reload={reload}
          turmas={turmas.length}
          arquivos={data.files.filter((item) => item.client_id === client.id).length}
          inscritos={turmas.reduce((soma, item) => soma + item.participant_count, 0)}
          aberta={aberta === client.id} alternar={() => setAberta((atual) => (atual === client.id ? null : client.id))}
          acoes={{
            approve: () => void approve(client.id),
            reset: () => void resetPassword({ id: client.id, name: client.name }),
            remove: () => void remove({ id: client.id, name: client.name }),
          }} />;
      })}</div>
      {filtered.length === 0 ? <EmptyState icon={Building2} title="Nenhum cliente encontrado" text="Ajuste a busca ou cadastre uma nova empresa na aba Cadastrar." /> : null}
    </> : null}

    {aba === 'criar' ? <form onSubmit={save} className="rounded-lg max-w-3xl border border-ds-borda bg-ds-superficie p-6 md:p-8">
      <span className="eyebrow text-ds-amarelo-texto">Cadastro corporativo</span>
      <h2 className="mt-2 ds-h4">Novo cliente</h2>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-ds-texto-2">O endereço da edificação é preenchido depois, na própria lista — é ele que sai impresso no atestado de treinamento.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label htmlFor="cliente-nome"><span className={labelClass}>Nome de exibição</span><Input id="cliente-nome" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-razao"><span className={labelClass}>Razão social</span><Input id="cliente-razao" required value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-cnpj"><span className={labelClass}>CNPJ</span><Input id="cliente-cnpj" required value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-unidade"><span className={labelClass}>Unidade / cidade</span><Input id="cliente-unidade" required value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-responsavel"><span className={labelClass}>Responsável na empresa</span><Input id="cliente-responsavel" required value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-email"><span className={labelClass}>E-mail do responsável (contato)</span><Input id="cliente-email" required type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="cliente-usuario"><span className={labelClass}>Nome de usuário (login)</span><Input id="cliente-usuario" required minLength={3} maxLength={40} value={draft.username} onChange={(e) => setDraft({ ...draft, username: limparDigitacaoUsuario(e.target.value) })} placeholder="ex.: empresaexemplo1" autoCapitalize="none" spellCheck={false} className={`${fieldClass} font-mono`} /><span className="mt-1.5 block text-[11px] leading-relaxed text-ds-texto-2">{USUARIO_REGRA}</span></label>
        <label htmlFor="cliente-telefone"><span className={labelClass}>Telefone</span><Input id="cliente-telefone" value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} className={fieldClass} /></label>
      </div>
      <Button type="submit" className="mt-6 h-12 bg-ds-amarelo px-8 ds-botao text-ds-texto hover:bg-[#eab900]"><Plus className="size-4" />Salvar e gerar acesso</Button>
    </form> : null}
  </div>;
}
