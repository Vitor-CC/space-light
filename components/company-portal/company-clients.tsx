'use client';

import { ArrowLeft, Building2, Check, ChevronDown, Download, KeyRound, Loader2, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { pendenciasDaEquipe, SinoEquipe, ultimoDia } from '@/components/company-portal/company-topo';
import type { NavegarEquipe } from '@/components/company-portal/company-topo';
import { AccessCredentials, formatDayMonth, isoFromDate } from '@/components/company-portal/company-ui';
import { Avatar, BarraSuperior, Botao, botaoClasses, Campo, campoClasses, Faixa, Indicador, tabelaClasses as tb, Tag, Vazio } from '@/components/ds/base';
import type { Tom } from '@/components/ds/base';
import { Abas, PainelLateral } from '@/components/ds/interativo';
import type { CompanyClient, CompanyDashboardData, CompanyTraining } from '@/lib/company-types';
import { approveClient, createMockClient, deleteClient, resetUserPassword, saveClientAddress, setClientUsername, updateClient } from '@/lib/mock-company-database';
import { limparDigitacaoSigla, SIGLA_REGRA, sugerirSigla } from '@/lib/sigla';
import { limparDigitacaoUsuario, USUARIO_REGRA } from '@/lib/usuario';
import { cn } from '@/lib/utils';
import { whatsappLink } from '@/lib/whatsapp';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;

/** Só dígitos: o CNPJ é digitado com e sem pontuação, e as duas têm de achar. */
const digitos = (value: string) => (value ?? '').replace(/\D/g, '');
const enderecoCompleto = (c: CompanyClient) => Boolean(c.address && c.city && c.state);
const dataLocal = (iso: string) => new Date(`${iso}T12:00:00`);
const diasAte = (iso: string, hoje: string) => Math.round((dataLocal(iso).getTime() - dataLocal(hoje).getTime()) / 86_400_000);
const dataBr = (iso: string) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';

function somarMeses(iso: string, meses: number) {
  const d = dataLocal(iso);
  d.setMonth(d.getMonth() + meses);
  return isoFromDate(d);
}

/* ─── Reciclagens e situação ────────────────────────────────────────────── */

type Reciclagem = { training: CompanyTraining; vence: string; dias: number };

/**
 * Reciclagem prevista: a turma concluída mais recente de cada norma + título,
 * vencendo no último dia + validade. Sem validade informada não há o que prever.
 */
function reciclagensDoCliente(trainings: CompanyTraining[], hoje: string): Reciclagem[] {
  const ultimaPorCurso = new Map<string, CompanyTraining>();
  for (const t of trainings) {
    if (t.status !== 'completed') continue;
    const chave = `${t.nr}|${t.title}`;
    const atual = ultimaPorCurso.get(chave);
    if (!atual || ultimoDia(t) > ultimoDia(atual)) ultimaPorCurso.set(chave, t);
  }
  return [...ultimaPorCurso.values()]
    .filter((t) => (t.validity_months ?? 0) > 0)
    .map((t) => { const vence = somarMeses(ultimoDia(t), t.validity_months ?? 0); return { training: t, vence, dias: diasAte(vence, hoje) }; })
    .sort((a, b) => a.vence.localeCompare(b.vence));
}

function prazo(dias: number): { texto: string; tom: Tom } {
  if (dias < 0) return { texto: 'Vencida', tom: 'perigo' };
  const texto = dias === 0 ? 'Hoje' : `Em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return { texto, tom: dias <= 30 ? 'perigo' : dias <= 60 ? 'atencao' : 'neutro' };
}

function situacao(client: CompanyClient, reciclagens: Reciclagem[]): { texto: string; tom: Tom } {
  if (reciclagens.some((r) => r.dias < 0)) return { texto: 'Vencida', tom: 'perigo' };
  if (client.status === 'pending') return { texto: 'Aguardando', tom: 'atencao' };
  if (!client.username) return { texto: 'Sem acesso', tom: 'atencao' };
  return { texto: 'Ativo', tom: 'sucesso' };
}

/* ─── Formulários (painéis laterais) ────────────────────────────────────── */

type Dados = { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string; shortCode: string };
type Endereco = { address: string; district: string; city: string; state: string; postalCode: string };

/** Sigla do código das turmas: PETZ-JAC vira PETZ-JAC-01, -02... */
function CampoSigla({ valor, onChange, sugestao, ajuda }: { valor: string; onChange: (valor: string) => void; sugestao?: string; ajuda: string }) {
  return <Campo rotulo="Sigla (código das turmas)" ajuda={<>{ajuda} Turmas saem como <span className="whitespace-nowrap font-mono">{(valor || sugestao || 'PETZ-JAC').replace(/-$/, '')}-01</span>, -02... {SIGLA_REGRA}</>}>
    <input value={valor} onChange={(e) => onChange(limparDigitacaoSigla(e.target.value))} placeholder={sugestao || 'ex.: PETZ-JAC'} autoCapitalize="characters" spellCheck={false} maxLength={12} className={cn(campoClasses, 'font-mono')} />
  </Campo>;
}

function CamposDoCliente({ draft, setDraft }: { draft: Dados; setDraft: (d: Dados) => void }) {
  const campo = (chave: keyof Dados, rotulo: string, extra: { type?: string; required?: boolean } = {}) =>
    <Campo rotulo={rotulo}><input type={extra.type ?? 'text'} required={extra.required ?? true} value={draft[chave]} onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })} className={campoClasses} /></Campo>;
  return <>
    {campo('name', 'Nome de exibição')}
    {campo('legalName', 'Razão social')}
    {campo('document', 'CNPJ')}
    {campo('unit', 'Unidade / cidade')}
    {campo('contactName', 'Responsável na empresa')}
    {campo('contactEmail', 'E-mail do responsável', { type: 'email' })}
    {campo('contactPhone', 'Telefone', { required: false })}
  </>;
}

function NovoCliente({ aberto, onFechar, notify, reload, aoCriar }: { aberto: boolean; onFechar: () => void; notify: Notify; reload: Reload; aoCriar: (acesso: { username: string; temporaryPassword: string }) => void }) {
  const vazio: Dados & { username: string } = { name: '', legalName: '', document: '', unit: '', contactName: '', contactEmail: '', contactPhone: '', shortCode: '', username: '' };
  const [draft, setDraft] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      aoCriar(await createMockClient(draft));
      setDraft(vazio);
      onFechar();
      notify('Cliente cadastrado e acesso temporário gerado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao cadastrar cliente.'); }
    finally { setSalvando(false); }
  }
  return <PainelLateral aberto={aberto} onFechar={onFechar} titulo="Novo cliente" subtitulo="O endereço da edificação, que sai no atestado, é preenchido depois na ficha do cliente." largura={520}>
    <form id="form-novo-cliente" onSubmit={salvar} className="flex flex-col gap-4">
      <CamposDoCliente draft={draft} setDraft={(d) => setDraft({ ...draft, ...d })} />
      <Campo rotulo="Nome de usuário (login)" ajuda={USUARIO_REGRA}><input required minLength={3} maxLength={40} value={draft.username} onChange={(e) => setDraft({ ...draft, username: limparDigitacaoUsuario(e.target.value) })} placeholder="ex.: empresaexemplo1" autoCapitalize="none" spellCheck={false} className={cn(campoClasses, 'font-mono')} /></Campo>
      <CampoSigla valor={draft.shortCode} sugestao={sugerirSigla(draft.name)} onChange={(shortCode) => setDraft({ ...draft, shortCode })} ajuda="Em branco, fica a sugestão tirada do nome." />
      <Botao type="submit" disabled={salvando} className="w-full">{salvando ? <Loader2 className="animate-spin" /> : <Plus />}Salvar e gerar acesso</Botao>
    </form>
  </PainelLateral>;
}

function EditarCliente({ client, aberto, onFechar, notify, reload, aoExcluir }: { client: CompanyClient; aberto: boolean; onFechar: () => void; notify: Notify; reload: Reload; aoExcluir: () => void }) {
  const [draft, setDraft] = useState<Dados>({ name: client.name, legalName: client.legal_name, document: client.document, unit: client.unit, contactName: client.contact_name, contactEmail: client.contact_email, contactPhone: client.contact_phone ?? '', shortCode: client.short_code ?? '' });
  const [endereco, setEndereco] = useState<Endereco>({ address: client.address ?? '', district: client.district ?? '', city: client.city ?? '', state: client.state ?? '', postalCode: client.postal_code ?? '' });
  const [salvando, setSalvando] = useState(false);
  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await updateClient(client.id, draft);
      await saveClientAddress({ clientId: client.id, ...endereco });
      notify('Dados do cliente salvos.');
      onFechar();
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar os dados do cliente.'); }
    finally { setSalvando(false); }
  }
  async function excluir() {
    if (!window.confirm(`Excluir "${client.name}" e TODOS os seus treinamentos, participantes e arquivos? Esta ação não pode ser desfeita.`)) return;
    try { await deleteClient(client.id); notify('Cliente excluído.'); aoExcluir(); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o cliente.'); }
  }
  const campoEnd = (chave: keyof Endereco, rotulo: string, extra: { placeholder?: string; max?: number } = {}) =>
    <Campo rotulo={rotulo}><input value={endereco[chave]} maxLength={extra.max} placeholder={extra.placeholder} onChange={(e) => setEndereco({ ...endereco, [chave]: chave === 'state' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value })} className={campoClasses} /></Campo>;
  return <PainelLateral aberto={aberto} onFechar={onFechar} sobretitulo={client.short_code || undefined} titulo="Editar cliente" subtitulo="Razão social, CNPJ e endereço saem impressos nos documentos." largura={520}
    acoes={<><Botao type="submit" form="form-editar-cliente" disabled={salvando} className="flex-1">{salvando ? <Loader2 className="animate-spin" /> : <Check />}Salvar</Botao><Botao tipo="fantasma" onClick={() => void excluir()} className="text-ds-perigo"><Trash2 />Excluir cliente</Botao></>}>
    <form id="form-editar-cliente" onSubmit={salvar} className="flex flex-col gap-4">
      <CamposDoCliente draft={draft} setDraft={setDraft} />
      <CampoSigla valor={draft.shortCode} onChange={(shortCode) => setDraft({ ...draft, shortCode })} ajuda="Trocar a sigla só vale para as turmas novas; as que já existem mantêm o código." />
      <h3 className="mt-2 ds-caps text-ds-texto-2">Endereço da edificação (sai no atestado)</h3>
      {campoEnd('address', 'Logradouro e número', { placeholder: 'Ex.: Rua das Palmeiras, 120' })}
      <div className="grid gap-4 sm:grid-cols-2">{campoEnd('district', 'Bairro')}{campoEnd('postalCode', 'CEP', { placeholder: '01000-000' })}</div>
      <div className="grid gap-4 sm:grid-cols-[1fr_96px]">{campoEnd('city', 'Município')}{campoEnd('state', 'UF', { placeholder: 'SP', max: 2 })}</div>
    </form>
  </PainelLateral>;
}

/* ─── Ficha do cliente (Figma "Equipe · Ficha do cliente", 80:1545) ─────── */

type AbaFicha = 'resumo' | 'turmas' | 'participantes' | 'acesso';

function FichaDoCliente({ client, data, hoje, agora, reload, notify, navegar, voltar }: { client: CompanyClient; data: CompanyDashboardData; hoje: string; agora: number; reload: Reload; notify: Notify; navegar: NavegarEquipe; voltar: () => void }) {
  const [aba, setAba] = useState<AbaFicha>('resumo');
  const [editando, setEditando] = useState(false);
  const [usuario, setUsuario] = useState(client.username ?? '');
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [senhaNova, setSenhaNova] = useState<{ username: string | null; temporaryPassword: string; active: boolean } | null>(null);

  const turmas = useMemo(() => data.trainings.filter((t) => t.client_id === client.id).sort((a, b) => ultimoDia(b).localeCompare(ultimoDia(a))), [data.trainings, client.id]);
  const participantes = useMemo(() => { const ids = new Set(turmas.map((t) => t.id)); return data.participants.filter((p) => ids.has(p.training_id)); }, [data.participants, turmas]);
  const reciclagens = useMemo(() => reciclagensDoCliente(turmas, hoje), [turmas, hoje]);
  const ano = hoje.slice(0, 4);

  const numeros = useMemo(() => {
    const doAno = turmas.filter((t) => ultimoDia(t).startsWith(ano));
    const normas = new Set(doAno.map((t) => t.nr)).size;
    const certificadas = turmas.filter((t) => t.status === 'completed' && t.certificate_generated_at);
    const venceDe = (t: CompanyTraining) => (t.validity_months ?? 0) > 0 ? somarMeses(ultimoDia(t), t.validity_months ?? 0) : null;
    const validas = certificadas.filter((t) => { const v = venceDe(t); return !v || v >= hoje; });
    const em90 = validas.filter((t) => { const v = venceDe(t); return v && diasAte(v, hoje) <= 90; }).reduce((s, t) => s + t.participant_count, 0);
    const ultima = turmas.find((t) => ultimoDia(t) <= hoje) ?? turmas[turmas.length - 1];
    return {
      treinados: doAno.reduce((s, t) => s + t.participant_count, 0),
      normas,
      validos: validas.reduce((s, t) => s + t.participant_count, 0),
      em90,
      ultima,
    };
  }, [turmas, ano, hoje]);

  const desde = client.created_at ? `${client.created_at.slice(5, 7)}/${client.created_at.slice(0, 4)}` : '';
  const zap = whatsappLink(client.contact_phone ?? '', `Olá, ${client.contact_name.split(' ')[0]}! Aqui é da Space Light Engenharia.`);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  async function salvarUsuario(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvandoUsuario(true);
    try { await setClientUsername(client.id, usuario); notify('Nome de usuário salvo. Avise a empresa: é com ele que ela entra no portal.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o nome de usuário.'); }
    finally { setSalvandoUsuario(false); }
  }
  async function aprovar() {
    try { await approveClient(client.id); notify('Acesso do cliente aprovado.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao aprovar o cliente.'); }
  }
  async function novaSenha() {
    if (!window.confirm(`Gerar uma nova senha temporária para "${client.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try { setSenhaNova(await resetUserPassword({ clientId: client.id })); notify('Senha temporária gerada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.'); }
  }

  return <div className="flex flex-col gap-5">
    <button type="button" onClick={voltar} className={botaoClasses('link', 'P', 'w-fit min-h-0 gap-1.5 py-0 text-ds-texto-2 [&_svg]:size-4')}><ArrowLeft />Clientes</button>
    <BarraSuperior
      titulo={client.name}
      subtitulo={[`CNPJ ${client.document}`, client.unit, desde ? `cliente desde ${desde}` : ''].filter(Boolean).join(' · ')}
      acoes={<><Botao tipo="secundario" onClick={() => setEditando(true)}>Editar</Botao><Botao onClick={() => navegar('trainings', undefined, 'criar', { clienteId: client.id })}>Nova turma<Plus /></Botao></>}
      notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />}
    />

    <Abas rotulo="Seções do cliente" ativa={aba} onChange={setAba} abas={[
      { id: 'resumo', rotulo: 'Resumo' },
      { id: 'turmas', rotulo: 'Turmas', contador: turmas.length },
      { id: 'participantes', rotulo: 'Participantes', contador: participantes.length },
      { id: 'acesso', rotulo: 'Pessoas com acesso', contador: client.username ? 1 : 0 },
    ]} />

    {aba === 'resumo' ? <>
      {!enderecoCompleto(client) ? <Faixa tom="perigo" titulo="Endereço da edificação não preenchido" acao={<Botao tamanho="P" tipo="escuro" onClick={() => setEditando(true)}>Preencher</Botao>}>Sem ele, o atestado de treinamento sai incompleto.</Faixa> : null}
      {!client.username ? <Faixa tom="atencao" titulo="Sem nome de usuário" acao={<Botao tamanho="P" tipo="escuro" onClick={() => setAba('acesso')}>Definir</Botao>}>Sem ele, a empresa não consegue entrar no portal.</Faixa> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Indicador rotulo={`Treinados em ${ano}`} valor={numeros.treinados} apoio={numeros.normas ? `em ${numeros.normas} ${numeros.normas === 1 ? 'norma' : 'normas'}` : 'nenhuma turma no ano'} />
        <Indicador rotulo="Certificados válidos" valor={numeros.validos} apoio={numeros.em90 ? `${numeros.em90} vencem em 90 dias` : 'nenhum vence em 90 dias'} />
        <Indicador rotulo="Última turma" valor={numeros.ultima ? formatDayMonth(ultimoDia(numeros.ultima)) : '—'} apoio={numeros.ultima ? `${numeros.ultima.nr} · ${numeros.ultima.internal_label || numeros.ultima.title}` : 'nenhuma turma ainda'} />
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-ds-superficie">
          <div className="border-b border-ds-borda px-5 py-4"><h2 className="ds-h4">Reciclagens previstas</h2></div>
          {reciclagens.length ? reciclagens.map((r) => {
            const p = prazo(r.dias);
            return <div key={r.training.id} className="flex items-center gap-3 border-b border-ds-borda px-5 py-3.5 last:border-b-0">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate ds-body-s font-medium">{r.training.nr} · {r.training.title}</span>
                <span className="truncate ds-caption text-ds-texto-2">{r.training.participant_count} {r.training.participant_count === 1 ? 'pessoa' : 'pessoas'} · vence {dataBr(r.vence)}</span>
              </div>
              <Tag tom={p.tom} className="shrink-0">{p.texto}</Tag>
              <Botao tipo="secundario" onClick={() => navegar('trainings', undefined, 'criar', { clienteId: client.id, nr: r.training.nr })}>Agendar</Botao>
            </div>;
          }) : <p className="px-5 py-4 ds-body-s text-ds-texto-2">Nenhuma reciclagem prevista. A previsão sai da validade informada em cada turma concluída.</p>}
        </section>
        <section className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg bg-ds-superficie lg:w-[340px]">
          <div className="border-b border-ds-borda px-5 py-4"><h2 className="ds-h4">Contatos</h2></div>
          <div className="flex items-center gap-3 px-5 py-3">
            <Avatar nome={client.contact_name || client.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate ds-body-s font-medium">{client.contact_name}</span>
              <span className="truncate ds-caption text-ds-texto-2">{[client.contact_email, client.contact_phone].filter(Boolean).join(' · ')}</span>
            </div>
            <a href={zap ?? `mailto:${client.contact_email}`} target="_blank" rel="noreferrer" aria-label={zap ? `WhatsApp de ${client.contact_name}` : `E-mail para ${client.contact_name}`} className="rounded-md p-1 text-ds-texto hover:bg-ds-muted ds-foco"><MessageCircle className="size-[18px]" /></a>
          </div>
        </section>
      </div>
    </> : null}

    {aba === 'turmas' ? turmas.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[640px]')}>
      <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Data</th><th className={tb.th}>Pessoas</th><th className={tb.th}>Situação</th></tr></thead>
      <tbody>{turmas.map((t) => <tr key={t.id} onClick={() => navegar('trainings', t.id)} className={cn(tb.linha, tb.linhaClicavel)}>
        <td className={tb.td}><span className={tb.codigo}>{t.code}</span></td>
        <td className={cn(tb.td, 'w-full max-w-0')}><span className="block truncate font-medium">{t.nr} · {t.internal_label || t.title}</span></td>
        <td className={cn(tb.td, 'whitespace-nowrap')}>{dataBr(ultimoDia(t))}</td>
        <td className={tb.td}>{t.participant_count}</td>
        <td className={tb.td}><Tag tom={t.status === 'completed' ? 'sucesso' : t.status === 'in_progress' ? 'info' : 'neutro'}>{t.status === 'completed' ? 'Concluída' : t.status === 'in_progress' ? 'Em andamento' : 'Agendada'}</Tag></td>
      </tr>)}</tbody>
    </table></div></div> : <Vazio icone={<Building2 />} titulo="Nenhuma turma ainda" texto="Crie a primeira em Nova turma." /> : null}

    {aba === 'participantes' ? participantes.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[640px]')}>
      <thead className={tb.cabeca}><tr><th className={tb.th}>Participante</th><th className={tb.th}>CPF</th><th className={tb.th}>Turma</th></tr></thead>
      <tbody>{participantes.map((p) => { const t = turmas.find((x) => x.id === p.training_id); return <tr key={p.id} onClick={() => navegar('trainings', p.training_id)} className={cn(tb.linha, tb.linhaClicavel)}>
        <td className={cn(tb.td, 'w-full max-w-0')}><span className="block truncate font-medium">{p.full_name}</span></td>
        <td className={cn(tb.td, 'whitespace-nowrap')}><span className={tb.codigo}>{p.document_id}</span></td>
        <td className={cn(tb.td, 'whitespace-nowrap')}>{t ? `${t.code} · ${t.nr}` : '—'}</td>
      </tr>; })}</tbody>
    </table></div></div> : <Vazio icone={<Building2 />} titulo="Nenhum participante ainda" texto="Os participantes entram pelo QR de cada turma." /> : null}

    {aba === 'acesso' ? <div className="flex flex-col gap-4">
      {senhaNova ? <AccessCredentials eyebrow={`Nova senha de ${client.name}`} note={senhaNova.active ? 'Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o cliente terá de criar uma nova.' : 'Anote agora: a senha aparece somente desta vez. Atenção: este acesso ainda está inativo — aprove o cliente para ele conseguir entrar.'} loginLabel="Nome de usuário" email={senhaNova.username ?? 'Não definido — defina antes de enviar'} password={senhaNova.temporaryPassword} onDismiss={() => setSenhaNova(null)} /> : null}
      <section className="flex flex-col overflow-hidden rounded-lg bg-ds-superficie">
        <div className="flex items-center gap-3 border-b border-ds-borda px-5 py-4">
          <h2 className="min-w-0 flex-1 ds-h4">Acesso da empresa ao portal</h2>
          <Tag tom={client.status === 'pending' ? 'atencao' : client.username ? 'sucesso' : 'atencao'}>{client.status === 'pending' ? 'Aguardando aprovação' : client.username ? 'Ativo' : 'Sem acesso'}</Tag>
        </div>
        <form onSubmit={salvarUsuario} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end">
          <Campo rotulo="Nome de usuário (login)" ajuda={USUARIO_REGRA} className="flex-1"><input required minLength={3} maxLength={40} value={usuario} onChange={(e) => setUsuario(limparDigitacaoUsuario(e.target.value))} placeholder="ex.: empresaexemplo1" autoCapitalize="none" spellCheck={false} className={cn(campoClasses, 'font-mono')} /></Campo>
          <Botao type="submit" tipo="secundario" disabled={salvandoUsuario || usuario === (client.username ?? '')} className="sm:mb-6">{salvandoUsuario ? <Loader2 className="animate-spin" /> : <Check />}Salvar</Botao>
        </form>
        <div className="flex flex-wrap gap-2.5 border-t border-ds-borda px-5 py-4">
          {client.status === 'pending' ? <Botao onClick={() => void aprovar()}><Check />Aprovar acesso</Botao> : null}
          <Botao tipo="secundario" onClick={() => void novaSenha()}><KeyRound />Gerar nova senha</Botao>
        </div>
      </section>
    </div> : null}

    <EditarCliente key={`${client.id}-${editando}`} client={client} aberto={editando} onFechar={() => setEditando(false)} notify={notify} reload={reload} aoExcluir={voltar} />
  </div>;
}

/* ─── Lista (Figma "Equipe · Clientes", 80:1179) ────────────────────────── */

function Filtro({ rotulo, valor, onChange, opcoes }: { rotulo: string; valor: string; onChange: (v: string) => void; opcoes: Array<{ valor: string; texto: string }> }) {
  return <label className="relative inline-flex shrink-0">
    <span className="sr-only">{rotulo}</span>
    <select value={valor} onChange={(e) => onChange(e.target.value)} className="h-10 appearance-none rounded-md border border-ds-borda bg-ds-superficie py-2 pr-9 pl-3 font-ds-sans text-sm leading-5 font-medium text-ds-texto ds-foco">
      {opcoes.map((o) => <option key={o.valor} value={o.valor}>{rotulo}: {o.texto}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" />
  </label>;
}

export function CompanyClients({ data, reload, notify, navegar }: { data: CompanyDashboardData; reload: Reload; notify: Notify; navegar: NavegarEquipe }) {
  const [agora] = useState(() => Date.now());
  const hoje = isoFromDate(new Date(agora));
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [acessoCriado, setAcessoCriado] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [norma, setNorma] = useState('todas');
  const [periodo, setPeriodo] = useState(hoje.slice(0, 4));

  const normas = useMemo(() => [...new Set(data.trainings.map((t) => t.nr))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })), [data.trainings]);
  const anos = useMemo(() => [...new Set([hoje.slice(0, 4), ...data.trainings.map((t) => ultimoDia(t).slice(0, 4))])].sort().reverse(), [data.trainings, hoje]);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const numeros = digitos(busca);
    return data.clients
      .filter((c) => !termo || `${c.name} ${c.legal_name} ${c.short_code ?? ''} ${c.username ?? ''}`.toLowerCase().includes(termo) || (numeros.length > 0 && digitos(c.document).includes(numeros)))
      .map((c) => {
        const todas = data.trainings.filter((t) => t.client_id === c.id);
        const doFiltro = todas.filter((t) => (periodo === 'todos' || ultimoDia(t).startsWith(periodo)) && (norma === 'todas' || t.nr === norma));
        const reciclagens = reciclagensDoCliente(todas, hoje);
        return { client: c, turmas: doFiltro.length, temNorma: norma === 'todas' || todas.some((t) => t.nr === norma), reciclagens, situacao: situacao(c, reciclagens) };
      })
      .filter((l) => l.temNorma);
  }, [data, busca, norma, periodo, hoje]);

  const semEndereco = data.clients.filter((c) => !enderecoCompleto(c)).length;
  const cliente = aberto ? data.clients.find((c) => c.id === aberto) : null;
  if (cliente) return <FichaDoCliente key={cliente.id} client={cliente} data={data} hoje={hoje} agora={agora} reload={reload} notify={notify} navegar={navegar} voltar={() => setAberto(null)} />;

  function exportar() {
    const cab = ['Cliente', 'CNPJ', 'Sigla', 'Unidade', `Turmas ${periodo === 'todos' ? '' : periodo}`.trim(), 'Acesso', 'Próxima reciclagem', 'Situação'];
    const linhasCsv = linhas.map(({ client: c, turmas, reciclagens, situacao: s }) => [c.name, c.document, c.short_code ?? '', c.unit, String(turmas), c.username ? 'sim' : 'não', reciclagens[0] ? `${reciclagens[0].training.nr} ${dataBr(reciclagens[0].vence)}` : '', s.texto]);
    const csv = [cab, ...linhasCsv].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const proxima = (r: Reciclagem | undefined) => !r ? '—' : r.dias < 0 ? `${r.training.nr} · vencida` : `${r.training.nr} · ${r.dias === 0 ? 'hoje' : `em ${r.dias} ${r.dias === 1 ? 'dia' : 'dias'}`}`;

  return <div className="flex flex-col gap-5">
    <BarraSuperior titulo="Clientes" subtitulo="Empresas atendidas e o status de cada uma."
      acoes={<Botao onClick={() => setNovo(true)}>Novo cliente<Plus /></Botao>}
      notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />} />

    {acessoCriado ? <AccessCredentials eyebrow="Envie ao cliente" note="Esta senha temporária aparece somente agora. O cliente deverá trocá-la no primeiro acesso." loginLabel="Nome de usuário" email={acessoCriado.username} password={acessoCriado.temporaryPassword} onDismiss={() => setAcessoCriado(null)} /> : null}
    {semEndereco ? <Faixa tom="perigo" titulo={semEndereco === 1 ? '1 cliente sem endereço da edificação' : `${semEndereco} clientes sem endereço da edificação`}>Sem ele, o atestado sai incompleto. Abra o cliente e use Editar.</Faixa> : null}

    <section className="flex flex-col overflow-hidden rounded-lg bg-ds-superficie">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-ds-borda px-5 py-4">
        <label className="relative w-full sm:w-[320px]"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input aria-label="Buscar por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ" className={cn(campoClasses, 'min-h-10 py-2.5 pl-10 ds-body-s')} /></label>
        <Filtro rotulo="Norma" valor={norma} onChange={setNorma} opcoes={[{ valor: 'todas', texto: 'todas' }, ...normas.map((n) => ({ valor: n, texto: n }))]} />
        <Filtro rotulo="Período" valor={periodo} onChange={setPeriodo} opcoes={[...anos.map((a) => ({ valor: a, texto: a })), { valor: 'todos', texto: 'todos' }]} />
        <span className="hidden flex-1 sm:block" />
        <button type="button" onClick={exportar} className="inline-flex h-10 items-center gap-2 rounded-md border border-ds-borda px-3 font-ds-sans text-sm leading-5 font-medium text-ds-texto hover:border-ds-borda-forte ds-foco"><Download className="size-4" />Exportar</button>
      </div>
      {linhas.length ? <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[900px] table-fixed')}>
        <thead className={tb.cabeca}><tr>
          <th className={cn(tb.th, 'pl-5 first:pl-5')}>Cliente</th>
          <th className={cn(tb.th, 'w-[160px]')}>Unidade</th>
          <th className={cn(tb.th, 'w-[130px]')}>Turmas {periodo === 'todos' ? '' : periodo}</th>
          <th className={cn(tb.th, 'w-[100px]')}>Acessos</th>
          <th className={cn(tb.th, 'w-[190px]')}>Próxima reciclagem</th>
          <th className={cn(tb.th, 'w-[150px] pr-5 last:pr-5')}>Situação</th>
        </tr></thead>
        <tbody>{linhas.map(({ client: c, turmas, reciclagens, situacao: s }) => <tr key={c.id} onClick={() => setAberto(c.id)} className={cn(tb.linha, tb.linhaClicavel)}>
          <td className={cn(tb.td, 'py-3 pl-5 first:pl-5')}>
            <button type="button" aria-label={`Abrir ${c.name}`} onClick={(e) => { e.stopPropagation(); setAberto(c.id); }} className="flex w-full min-w-0 items-center gap-3 text-left ds-foco">
              <span className="flex shrink-0 rounded-lg bg-ds-muted p-2"><Building2 className="size-4" /></span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate ds-body-s font-medium">{c.name}</span>
                <span className="truncate ds-mono text-ds-texto-2">{c.document}</span>
              </span>
            </button>
          </td>
          <td className={cn(tb.td, 'truncate py-3')}>{c.unit || '—'}</td>
          <td className={cn(tb.td, 'py-3')}>{turmas}</td>
          <td className={cn(tb.td, 'py-3')}>{c.username ? 1 : 0}</td>
          <td className={cn(tb.td, 'truncate py-3')}>{proxima(reciclagens[0])}</td>
          <td className={cn(tb.td, 'py-3 pr-5 last:pr-5')}><Tag tom={s.tom}>{s.texto}</Tag></td>
        </tr>)}</tbody>
      </table></div> : <p className="px-5 py-6 ds-body-s text-ds-texto-2">Nenhum cliente encontrado. Ajuste a busca ou os filtros.</p>}
    </section>

    <NovoCliente aberto={novo} onFechar={() => setNovo(false)} notify={notify} reload={reload} aoCriar={setAcessoCriado} />
  </div>;
}

