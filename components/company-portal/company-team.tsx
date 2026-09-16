'use client';

import { Check, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import {
  AccessCredentials,
  formatDate,
  type Notify,
} from '@/components/company-portal/company-ui';
import {
  Carregando,
  Confirmar,
  ErroAoCarregar,
  SemPermissao,
  Vazio,
  botao,
  botaoPerigo,
  campo,
  mono,
  rotulo,
} from '@/components/portal/kit';
import type { CompanyEmployee } from '@/lib/company-types';
import {
  RequestError,
  createEmployee,
  deleteEmployee,
  readEmployees,
  resetUserPassword,
  setEmployeeActive,
} from '@/lib/mock-company-database';
import { cn } from '@/lib/utils';

type Carga =
  | { estado: 'carregando' }
  | { estado: 'ok'; lista: CompanyEmployee[] }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'restrito'; mensagem: string };

export function CompanyTeam({ notify }: { notify: Notify }) {
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' });
  const [criando, setCriando] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '' });
  const [createdAccess, setCreatedAccess] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [resetAccess, setResetAccess] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [confirmando, setConfirmando] = useState<{
    tipo: 'senha' | 'excluir';
    employee: CompanyEmployee;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCarga({ estado: 'ok', lista: await readEmployees() });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a equipe.';
      setCarga(
        error instanceof RequestError && error.status === 403
          ? { estado: 'restrito', mensagem }
          : { estado: 'erro', mensagem },
      );
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    readEmployees()
      .then((lista) => {
        if (ativo) setCarga({ estado: 'ok', lista });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a equipe.';
        setCarga(
          error instanceof RequestError && error.status === 403
            ? { estado: 'restrito', mensagem }
            : { estado: 'erro', mensagem },
        );
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      setCreatedAccess(await createEmployee(draft));
      setDraft({ name: '', email: '' });
      setCriando(false);
      notify('Funcionário criado e acesso temporário gerado.');
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao criar funcionário.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(employee: CompanyEmployee) {
    try {
      await setEmployeeActive(employee.id, employee.active !== 1);
      notify(
        employee.active === 1 ? 'Acesso desativado.' : 'Acesso reativado.',
      );
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao atualizar o acesso.',
      );
    }
  }

  async function confirmar() {
    if (!confirmando) return;
    const { tipo, employee } = confirmando;
    setConfirmando(null);
    try {
      if (tipo === 'excluir') {
        await deleteEmployee(employee.id);
        notify('Funcionário excluído.');
      } else {
        setResetAccess(await resetUserPassword({ userId: employee.id }));
        notify('Senha temporária gerada.');
      }
      await load();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : tipo === 'excluir'
            ? 'Erro ao excluir o funcionário.'
            : 'Erro ao redefinir a senha.',
      );
    }
  }

  if (carga.estado === 'carregando') return <Carregando />;
  if (carga.estado === 'restrito')
    return <SemPermissao texto="A equipe é gerida só pelo dono da conta." />;
  if (carga.estado === 'erro')
    return (
      <ErroAoCarregar mensagem={carga.mensagem} aoTentar={() => void load()} />
    );

  return (
    <div className="space-y-6">
      {createdAccess ? (
        <AccessCredentials
          eyebrow="Envie ao funcionário"
          note="A senha temporária aparece só agora. O funcionário troca no primeiro acesso."
          email={createdAccess.email}
          password={createdAccess.temporaryPassword}
          onDismiss={() => setCreatedAccess(null)}
        />
      ) : null}
      {resetAccess ? (
        <AccessCredentials
          eyebrow={`Nova senha de ${resetAccess.name}`}
          note="Aparece só agora. A senha antiga já não funciona."
          email={resetAccess.email}
          password={resetAccess.temporaryPassword}
          onDismiss={() => setResetAccess(null)}
        />
      ) : null}
      {confirmando ? (
        <Confirmar
          perigo={confirmando.tipo === 'excluir'}
          titulo={
            confirmando.tipo === 'excluir'
              ? `Excluir a conta de ${confirmando.employee.name}?`
              : `Gerar senha temporária para ${confirmando.employee.name}?`
          }
          texto={
            confirmando.tipo === 'excluir'
              ? 'Não dá para desfazer.'
              : 'A senha atual deixa de funcionar na hora.'
          }
          confirmar={confirmando.tipo === 'excluir' ? 'Excluir' : 'Gerar senha'}
          aoConfirmar={() => void confirmar()}
          aoCancelar={() => setConfirmando(null)}
        />
      ) : null}

      {criando ? (
        <form
          onSubmit={save}
          className="grid max-w-3xl gap-5 border border-doc-rule-strong bg-doc-sheet p-4 sm:grid-cols-2"
        >
          <label>
            <span className={rotulo}>Nome completo</span>
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>E-mail de acesso</span>
            <input
              required
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={campo}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              disabled={busy}
              type="submit"
              className={botao({ className: 'disabled:opacity-60' })}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Criar acesso
            </button>
            <button
              type="button"
              onClick={() => setCriando(false)}
              className={botao({ variante: 'contorno' })}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className={botao()}
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo funcionário
        </button>
      )}

      {carga.lista.length === 0 ? (
        <Vazio titulo="Nenhum funcionário ainda" />
      ) : (
        <ul className="border-t border-doc-ink">
          {carga.lista.map((employee) => {
            const owner = employee.is_owner === 1;
            const active = employee.active === 1;
            return (
              <li
                key={employee.id}
                className="flex flex-col gap-3 border-b border-doc-rule-strong py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {employee.name}{' '}
                    <span
                      className={cn(
                        mono,
                        'ml-1 text-xs',
                        !owner && !active ? 'text-doc-error' : 'text-doc-mark',
                      )}
                    >
                      {owner ? 'Dono' : active ? 'Ativo' : 'Desativado'}
                      {employee.must_reset === 1 && active
                        ? ' · 1º acesso pendente'
                        : ''}
                    </span>
                  </p>
                  <p className="text-sm break-all text-doc-ink-muted">
                    {employee.email}
                  </p>
                  <p className={cn(mono, 'text-xs text-doc-ink-muted')}>
                    Último acesso{' '}
                    {employee.last_login_at
                      ? formatDate(employee.last_login_at)
                      : 'nunca'}{' '}
                    · criado em {formatDate(employee.created_at)}
                  </p>
                </div>
                {owner ? null : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggle(employee)}
                      className={active ? botaoPerigo : botao()}
                    >
                      {active ? 'Desativar acesso' : 'Reativar acesso'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmando({ tipo: 'senha', employee })
                      }
                      className={botao({ variante: 'contorno' })}
                    >
                      <KeyRound className="size-4" aria-hidden="true" />
                      Redefinir senha
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmando({ tipo: 'excluir', employee })
                      }
                      className={botaoPerigo}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Excluir
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
