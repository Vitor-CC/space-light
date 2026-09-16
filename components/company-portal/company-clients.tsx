'use client';

import {
  Check,
  ChevronRight,
  FileArchive,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import { TabelaDeTurmas } from '@/components/company-portal/company-turmas';
import {
  AccessCredentials,
  digitos,
  type DadosDaGestao,
  type Notify,
  type Reload,
} from '@/components/company-portal/company-ui';
import {
  Cabecalho,
  Confirmar,
  Dados,
  Vazio,
  botao,
  botaoPerigo,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import type { CompanyClient } from '@/lib/company-types';
import { downloadFilesAsZip } from '@/lib/download-zip';
import {
  approveClient,
  createMockClient,
  deleteClient,
  resetUserPassword,
  saveClientAddress,
  setClientUsername,
  updateClient,
} from '@/lib/mock-company-database';
import { limparDigitacaoUsuario, USUARIO_REGRA } from '@/lib/usuario';
import { cn } from '@/lib/utils';

export type FiltroDeCliente =
  | 'todos'
  | 'pending'
  | 'active'
  | 'sem_endereco'
  | 'sem_usuario';

export function enderecoCompleto(client: CompanyClient) {
  return Boolean(client.address && client.city && client.state);
}

function situacao(client: CompanyClient) {
  if (client.status === 'pending') return 'Aguardando aprovação';
  if (client.status === 'invited') return 'Convidado';
  return 'Ativo';
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export function ListaDeClientes({
  data,
  abrir,
  cadastrar,
  filtroInicial = 'todos',
}: {
  data: DadosDaGestao;
  abrir: (id: string) => void;
  cadastrar: () => void;
  filtroInicial?: FiltroDeCliente;
}) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeCliente>(filtroInicial);
  const alvo = busca.trim().toLowerCase();
  const alvoDigitos = digitos(busca);
  const clientes = data.clients.filter((client) => {
    const casa =
      !alvo ||
      `${client.name} ${client.legal_name} ${client.contact_email} ${client.username ?? ''}`
        .toLowerCase()
        .includes(alvo) ||
      (alvoDigitos.length > 0 &&
        digitos(client.document).includes(alvoDigitos));
    if (!casa) return false;
    if (filtro === 'sem_endereco') return !enderecoCompleto(client);
    if (filtro === 'sem_usuario') return !client.username;
    if (filtro === 'todos') return true;
    return client.status === filtro;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Buscar cliente</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, usuário, CNPJ ou e-mail"
            className={campo}
          />
        </label>
        <label className="sm:w-60">
          <span className="sr-only">Filtrar clientes</span>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroDeCliente)}
            className={campo}
          >
            <option value="todos">Todos</option>
            <option value="active">Ativos</option>
            <option value="pending">Aguardando aprovação</option>
            <option value="sem_endereco">Sem endereço</option>
            <option value="sem_usuario">Sem nome de usuário</option>
          </select>
        </label>
        <button
          type="button"
          onClick={cadastrar}
          className={botao({ tamanho: 'lg' })}
        >
          <Plus className="size-4" aria-hidden="true" />
          Cadastrar cliente
        </button>
      </div>
      {clientes.length === 0 ? (
        <Vazio
          titulo="Nenhum cliente encontrado"
          texto="Ajuste a busca ou cadastre um cliente."
        />
      ) : (
        <ul className="border-t border-doc-ink">
          {clientes.map((client) => {
            const turmas = data.trainings.filter(
              (item) => item.client_id === client.id,
            ).length;
            const faltas = [
              !client.username && 'sem usuário',
              !enderecoCompleto(client) && 'sem endereço',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={client.id} className="border-b border-doc-rule-strong">
                <button
                  type="button"
                  onClick={() => abrir(client.id)}
                  className="doc-focus grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 text-left hover:bg-doc-sheet md:grid-cols-[minmax(0,1.3fr)_11rem_5rem_minmax(0,1fr)_1rem] md:items-center"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{client.name}</span>
                    <span className="block truncate text-sm text-doc-ink-muted">
                      {client.legal_name}
                    </span>
                  </span>
                  <span className={cn(mono, 'text-xs md:text-sm')}>
                    {client.document}
                  </span>
                  <span
                    className={cn(
                      mono,
                      'text-xs text-doc-ink-muted md:text-sm',
                    )}
                  >
                    {turmas} turma(s)
                  </span>
                  <span className="text-sm">
                    <span
                      className={
                        client.status === 'pending'
                          ? 'font-semibold text-doc-mark'
                          : ''
                      }
                    >
                      {situacao(client)}
                    </span>
                    {faltas ? (
                      <span className="block text-doc-error">{faltas}</span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="hidden size-4 text-doc-ink-muted md:block"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------

type DadosCliente = {
  name: string;
  legalName: string;
  document: string;
  unit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export function FichaDoCliente({
  data,
  client,
  voltar,
  abrirTurma,
  reload,
  notify,
}: {
  data: DadosDaGestao;
  client: CompanyClient;
  voltar: () => void;
  abrirTurma: (id: string) => void;
  reload: Reload;
  notify: Notify;
}) {
  const [resetAccess, setResetAccess] = useState<{
    username: string | null;
    temporaryPassword: string;
    active: boolean;
  } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [redefinindo, setRedefinindo] = useState(false);
  const turmas = data.trainings.filter((item) => item.client_id === client.id);

  async function approve() {
    try {
      await approveClient(client.id);
      notify('Acesso do cliente aprovado.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao aprovar o cliente.',
      );
    }
  }
  async function remove() {
    try {
      await deleteClient(client.id);
      notify('Cliente excluído.');
      await reload();
      voltar();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao excluir o cliente.',
      );
    }
  }
  async function resetPassword() {
    setRedefinindo(false);
    try {
      setResetAccess(await resetUserPassword({ clientId: client.id }));
      notify('Senha temporária gerada.');
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao redefinir a senha.',
      );
    }
  }

  return (
    <div className="space-y-10">
      <Cabecalho
        voltar={{ rotulo: 'Clientes', aoVoltar: voltar }}
        titulo={client.name}
        meta={
          <>
            <span className={mono}>{client.document}</span>
            <span>{situacao(client)}</span>
          </>
        }
        acoes={
          <>
            {client.status === 'pending' ? (
              <button
                type="button"
                onClick={() => void approve()}
                className={botao()}
              >
                <Check className="size-4" aria-hidden="true" />
                Aprovar acesso
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setRedefinindo(true)}
              className={botao({ variante: 'contorno' })}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Redefinir senha
            </button>
          </>
        }
      />
      {redefinindo ? (
        <Confirmar
          titulo={`Gerar senha temporária para ${client.name}?`}
          texto="A senha atual deixa de funcionar na hora."
          confirmar="Gerar senha"
          aoConfirmar={() => void resetPassword()}
          aoCancelar={() => setRedefinindo(false)}
        />
      ) : null}
      {resetAccess ? (
        <AccessCredentials
          eyebrow={`Nova senha de ${client.name}`}
          note={
            resetAccess.active
              ? 'Aparece só agora. No próximo acesso, o cliente cria uma senha nova.'
              : 'Aparece só agora. O acesso ainda está inativo: aprove o cliente para ele entrar.'
          }
          loginLabel="Nome de usuário"
          email={
            resetAccess.username ?? 'Não definido — defina antes de enviar'
          }
          password={resetAccess.temporaryPassword}
          onDismiss={() => setResetAccess(null)}
        />
      ) : null}

      <DadosCadastrais client={client} reload={reload} notify={notify} />
      <NomeDeUsuario client={client} reload={reload} notify={notify} />
      <Endereco client={client} reload={reload} notify={notify} />

      <section className="space-y-4">
        <h2 className={tituloBloco}>
          Turmas{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {turmas.length}
          </span>
        </h2>
        <TabelaDeTurmas
          turmas={[...turmas].sort((a, b) =>
            b.training_date.localeCompare(a.training_date),
          )}
          abrir={abrirTurma}
          vazio={<Vazio titulo="Nenhuma turma para este cliente" />}
        />
      </section>

      <ArquivosDoCliente data={data} client={client} notify={notify} />

      <section className="border-t border-doc-rule-strong pt-6">
        {excluindo ? (
          <Confirmar
            perigo
            titulo={`Excluir ${client.name}?`}
            texto="Saem junto TODAS as turmas, participantes e arquivos deste cliente. Não dá para desfazer."
            confirmar="Excluir cliente"
            aoConfirmar={() => void remove()}
            aoCancelar={() => setExcluindo(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExcluindo(true)}
            className={botaoPerigo}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir cliente
          </button>
        )}
      </section>
    </div>
  );
}

function DadosCadastrais({
  client,
  reload,
  notify,
}: {
  client: CompanyClient;
  reload: Reload;
  notify: Notify;
}) {
  const inicial = (): DadosCliente => ({
    name: client.name,
    legalName: client.legal_name,
    document: client.document,
    unit: client.unit,
    contactName: client.contact_name,
    contactEmail: client.contact_email,
    contactPhone: client.contact_phone ?? '',
  });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosCliente>(inicial);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await updateClient(client.id, draft);
      notify('Dados do cliente salvos.');
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar os dados do cliente.',
      );
    } finally {
      setSalvando(false);
    }
  }

  const campoDoCliente = (
    chave: keyof DadosCliente,
    texto: string,
    extra: { type?: string; required?: boolean } = {},
  ) => (
    <label key={chave}>
      <span className={rotulo}>{texto}</span>
      <input
        type={extra.type ?? 'text'}
        required={extra.required ?? true}
        value={draft[chave]}
        onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })}
        className={campo}
      />
    </label>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={tituloBloco}>Dados cadastrais</h2>
        {editando ? null : (
          <button
            type="button"
            onClick={() => {
              setDraft(inicial());
              setEditando(true);
            }}
            className={botao({ variante: 'contorno' })}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </button>
        )}
      </div>
      {editando ? (
        <form onSubmit={salvar} className="grid max-w-3xl gap-5 sm:grid-cols-2">
          {campoDoCliente('name', 'Nome de exibição')}
          {campoDoCliente('legalName', 'Razão social')}
          {campoDoCliente('document', 'CNPJ')}
          {campoDoCliente('unit', 'Unidade / cidade')}
          {campoDoCliente('contactName', 'Responsável na empresa')}
          {campoDoCliente('contactEmail', 'E-mail do responsável', {
            type: 'email',
          })}
          {campoDoCliente('contactPhone', 'Telefone', { required: false })}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className={botao({ variante: 'contorno' })}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <Dados
          itens={[
            ['Razão social', client.legal_name],
            [
              'CNPJ',
              <span key="cnpj" className={mono}>
                {client.document}
              </span>,
            ],
            ['Unidade', client.unit],
            ['Responsável', client.contact_name],
            ['E-mail', client.contact_email],
            ['Telefone', client.contact_phone || '—'],
          ]}
        />
      )}
    </section>
  );
}

function NomeDeUsuario({
  client,
  reload,
  notify,
}: {
  client: CompanyClient;
  reload: Reload;
  notify: Notify;
}) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valor, setValor] = useState(client.username ?? '');

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await setClientUsername(client.id, valor);
      notify(
        'Nome de usuário salvo. Avise a empresa: é com ele que ela entra.',
      );
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar o nome de usuário.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={tituloBloco}>Nome de usuário</h2>
        {editando ? null : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={botao({ variante: 'contorno' })}
          >
            {client.username ? 'Alterar' : 'Definir'}
          </button>
        )}
      </div>
      {editando ? (
        <form
          onSubmit={salvar}
          className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start"
        >
          <label className="flex-1">
            <span className="sr-only">Nome de usuário</span>
            <input
              required
              minLength={3}
              maxLength={40}
              value={valor}
              onChange={(e) => setValor(limparDigitacaoUsuario(e.target.value))}
              placeholder="ex.: empresaexemplo1"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="usuario-regra"
              className={cn(campo, mono)}
            />
            <span
              id="usuario-regra"
              className="mt-1.5 block text-sm text-doc-ink-muted"
            >
              {USUARIO_REGRA}
            </span>
          </label>
          <button
            type="submit"
            disabled={salvando}
            className={botao({
              tamanho: 'lg',
              className: 'disabled:opacity-60',
            })}
          >
            {salvando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className={botao({ variante: 'contorno', tamanho: 'lg' })}
          >
            Cancelar
          </button>
        </form>
      ) : client.username ? (
        <p className={cn(mono, 'font-semibold')}>{client.username}</p>
      ) : (
        <p className="font-semibold text-doc-error">
          Não definido. Sem ele a empresa não entra no portal.
        </p>
      )}
    </section>
  );
}

function Endereco({
  client,
  reload,
  notify,
}: {
  client: CompanyClient;
  reload: Reload;
  notify: Notify;
}) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState({
    address: client.address ?? '',
    district: client.district ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    postalCode: client.postal_code ?? '',
  });
  const completo = enderecoCompleto(client);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      await saveClientAddress({ clientId: client.id, ...draft });
      notify('Endereço salvo.');
      setEditando(false);
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao salvar o endereço.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={tituloBloco}>Endereço da edificação</h2>
        {editando ? null : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={botao({ variante: 'contorno' })}
          >
            {completo ? 'Editar' : 'Preencher'}
          </button>
        )}
      </div>
      {editando ? (
        <form onSubmit={salvar} className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={rotulo}>Logradouro e número</span>
            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Bairro</span>
            <input
              value={draft.district}
              onChange={(e) => setDraft({ ...draft, district: e.target.value })}
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>CEP</span>
            <input
              value={draft.postalCode}
              onChange={(e) =>
                setDraft({ ...draft, postalCode: e.target.value })
              }
              className={cn(campo, mono)}
            />
          </label>
          <label>
            <span className={rotulo}>Município</span>
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>UF</span>
            <input
              value={draft.state}
              maxLength={2}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  state: e.target.value.toUpperCase().slice(0, 2),
                })
              }
              className={cn(campo, mono)}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Salvar endereço
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className={botao({ variante: 'contorno' })}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : completo ? (
        <p>
          {client.address}
          {client.district ? ` - ${client.district}` : ''} · {client.city}/
          {client.state}
          {client.postal_code ? ` · ${client.postal_code}` : ''}
        </p>
      ) : (
        <p className="font-semibold text-doc-error">
          Não preenchido. Sem ele o atestado sai incompleto.
        </p>
      )}
    </section>
  );
}

/** Todas as fotos ou todos os documentos do cliente num zip, como na antiga aba Arquivos. */
function ArquivosDoCliente({
  data,
  client,
  notify,
}: {
  data: DadosDaGestao;
  client: CompanyClient;
  notify: Notify;
}) {
  const [zipando, setZipando] = useState('');
  const arquivos = data.files.filter(
    (file) => file.client_id === client.id && file.status === 'stored',
  );
  const grupos = [
    {
      id: 'fotos',
      rotulo: 'fotos',
      itens: arquivos.filter((file) => file.kind === 'photo'),
    },
    {
      id: 'documentos',
      rotulo: 'documentos',
      itens: arquivos.filter((file) => file.kind !== 'photo'),
    },
  ];

  async function baixar(grupo: (typeof grupos)[number]) {
    setZipando(grupo.id);
    try {
      const result = await downloadFilesAsZip({
        entries: grupo.itens.map((file) => ({ id: file.id, name: file.name })),
        zipName: `${grupo.rotulo}-${client.name}`.replace(/\s+/g, '-'),
      });
      notify(
        result.failed.length
          ? `${result.zipped} arquivo(s) no zip. Falhou: ${result.failed.join(', ')}.`
          : `${result.zipped} arquivo(s) baixados em zip.`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao montar o zip.');
    } finally {
      setZipando('');
    }
  }

  return (
    <section className="space-y-3">
      <h2 className={tituloBloco}>Arquivos de todas as turmas</h2>
      <div className="flex flex-wrap gap-2">
        {grupos.map((grupo) => (
          <button
            key={grupo.id}
            type="button"
            onClick={() => void baixar(grupo)}
            disabled={grupo.itens.length === 0 || Boolean(zipando)}
            className={botao({
              variante: 'contorno',
              className: 'disabled:opacity-40',
            })}
          >
            {zipando === grupo.id ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileArchive className="size-4" aria-hidden="true" />
            )}
            Baixar {grupo.itens.length} {grupo.rotulo} em zip
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------

type Draft = DadosCliente & { username: string };
const emptyDraft: Draft = {
  name: '',
  legalName: '',
  document: '',
  unit: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  username: '',
};

export function CadastrarCliente({
  reload,
  notify,
  voltar,
}: {
  reload: Reload;
  notify: Notify;
  voltar: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState<{
    username: string;
    temporaryPassword: string;
  } | null>(null);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      const access = await createMockClient(draft);
      setCriado(access);
      setDraft(emptyDraft);
      notify('Cliente cadastrado e acesso temporário gerado.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao cadastrar cliente.',
      );
    } finally {
      setSalvando(false);
    }
  }

  const campoNovo = (
    chave: keyof Draft,
    texto: string,
    extra: { type?: string; required?: boolean } = {},
  ) => (
    <label key={chave}>
      <span className={rotulo}>{texto}</span>
      <input
        id={`cliente-${chave}`}
        type={extra.type ?? 'text'}
        required={extra.required ?? true}
        value={draft[chave]}
        onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })}
        className={campo}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <Cabecalho
        voltar={{ rotulo: 'Clientes', aoVoltar: voltar }}
        titulo="Cadastrar cliente"
      />
      {criado ? (
        <AccessCredentials
          eyebrow="Envie ao cliente"
          note="A senha temporária aparece só agora. O cliente troca no primeiro acesso."
          loginLabel="Nome de usuário"
          email={criado.username}
          password={criado.temporaryPassword}
          onDismiss={() => setCriado(null)}
        />
      ) : null}
      <form onSubmit={save} className="grid max-w-3xl gap-5 sm:grid-cols-2">
        {campoNovo('name', 'Nome de exibição')}
        {campoNovo('legalName', 'Razão social')}
        {campoNovo('document', 'CNPJ')}
        {campoNovo('unit', 'Unidade / cidade')}
        {campoNovo('contactName', 'Responsável na empresa')}
        {campoNovo(
          'contactEmail',
          'E-mail do responsável (pode repetir em outra unidade)',
          { type: 'email' },
        )}
        <label>
          <span className={rotulo}>Nome de usuário (login)</span>
          <input
            required
            minLength={3}
            maxLength={40}
            value={draft.username}
            onChange={(e) =>
              setDraft({
                ...draft,
                username: limparDigitacaoUsuario(e.target.value),
              })
            }
            placeholder="ex.: empresaexemplo1"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="novo-usuario-regra"
            className={cn(campo, mono)}
          />
          <span
            id="novo-usuario-regra"
            className="mt-1.5 block text-sm text-doc-ink-muted"
          >
            {USUARIO_REGRA}
          </span>
        </label>
        {campoNovo('contactPhone', 'Telefone', { required: false })}
        <p className="text-sm text-doc-ink-muted sm:col-span-2">
          O endereço da edificação se preenche depois, na ficha do cliente.
        </p>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={salvando}
            className={botao({
              tamanho: 'lg',
              className: 'disabled:opacity-60',
            })}
          >
            {salvando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Salvar e gerar acesso
          </button>
        </div>
      </form>
      {criado ? null : (
        <button type="button" onClick={voltar} className={botaoTexto}>
          Voltar para a lista
        </button>
      )}
    </div>
  );
}
