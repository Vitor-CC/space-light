'use client';

import { BadgeCheck, Check, KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { AccessCredentials, EmptyState, fieldClass, formatDate } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyEmployee } from '@/lib/company-types';
import { createEmployee, deleteEmployee, readEmployees, resetUserPassword, setEmployeeActive } from '@/lib/mock-company-database';

export function CompanyTeam({ notify }: { notify: (message: string) => void }) {
  const [employees, setEmployees] = useState<CompanyEmployee[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '' });
  const [createdAccess, setCreatedAccess] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [resetAccess, setResetAccess] = useState<{ name: string; email: string; temporaryPassword: string; active: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEmployees(await readEmployees());
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao carregar funcionários.');
      setEmployees([]);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const access = await createEmployee(draft);
      setCreatedAccess(access);
      setDraft({ name: '', email: '' });
      setShowForm(false);
      notify('Funcionário criado e acesso temporário gerado.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao criar funcionário.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(employee: CompanyEmployee) {
    try {
      await setEmployeeActive(employee.id, employee.active !== 1);
      notify(employee.active === 1 ? 'Acesso desativado.' : 'Acesso reativado.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao atualizar o acesso.');
    }
  }

  async function remove(employee: CompanyEmployee) {
    if (!window.confirm(`Excluir definitivamente a conta de "${employee.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteEmployee(employee.id);
      notify('Funcionário excluído.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir o funcionário.');
    }
  }

  async function resetPassword(employee: CompanyEmployee) {
    if (!window.confirm(`Gerar uma nova senha temporária para "${employee.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try {
      setResetAccess(await resetUserPassword({ userId: employee.id }));
      notify('Senha temporária gerada.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.');
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 border-l-4 border-[#f2ad19] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#8a6107]" /><p className="text-xs leading-relaxed text-[#555]">Cada funcionário entra com o <strong>próprio login</strong>. Toda ação fica registrada com o nome de quem fez, na aba <strong>Atividade</strong>.</p></div>
      <Button type="button" onClick={() => setShowForm((value) => !value)} className="h-12 shrink-0 rounded-none bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]">{showForm ? <X className="size-4" /> : <Plus className="size-4" />}{showForm ? 'Fechar' : 'Novo funcionário'}</Button>
    </div>

    {createdAccess ? <AccessCredentials eyebrow="Envie ao funcionário" note="Esta senha temporária aparece somente agora. O funcionário deverá trocá-la no primeiro acesso." email={createdAccess.email} password={createdAccess.temporaryPassword} onDismiss={() => setCreatedAccess(null)} /> : null}

    {resetAccess ? <AccessCredentials eyebrow={`Nova senha de ${resetAccess.name}`} note="Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o funcionário terá de criar uma nova." email={resetAccess.email} password={resetAccess.temporaryPassword} onDismiss={() => setResetAccess(null)} /> : null}

    {showForm ? <form onSubmit={save} className="border border-black/10 bg-white p-6 md:p-7"><span className="eyebrow text-[#8a6107]">Novo acesso interno</span><h2 className="mt-2 text-2xl font-extrabold uppercase">Funcionário da Space</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome completo" className={fieldClass} /><Input required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="E-mail de acesso" className={fieldClass} /></div><Button disabled={busy} type="submit" className="mt-5 h-12 rounded-none bg-black px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#f2ad19] hover:text-black">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Criar acesso</Button></form> : null}

    {employees === null ? <div className="flex min-h-56 items-center justify-center border border-dashed border-black/20 bg-white"><Loader2 className="size-6 animate-spin text-[#8a6107]" /></div> : <div className="grid gap-4 xl:grid-cols-2">{employees.map((employee) => {
      const owner = employee.is_owner === 1;
      const active = employee.active === 1;
      return <article key={employee.id} className="border border-black/10 bg-white p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black text-[#f2ad19]">{owner ? <BadgeCheck className="size-5" /> : <UserRound className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{owner ? <span className="bg-[#f2ad19] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-black">Dono</span> : <span className={`px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] ${active ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f3d4d4] text-[#8f1717]'}`}>{active ? 'Ativo' : 'Desativado'}</span>}{employee.must_reset === 1 && active ? <span className="bg-[#fff0d2] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">1º acesso pendente</span> : null}</div><h2 className="mt-3 truncate text-xl font-extrabold uppercase tracking-[0.015em]">{employee.name}</h2><p className="mt-1 break-all text-xs text-[#777]">{employee.email}</p></div></div><dl className="mt-5 grid gap-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-[#777]">Último acesso</dt><dd className="text-right font-bold">{employee.last_login_at ? formatDate(employee.last_login_at) : 'Nunca'}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#777]">Criado em</dt><dd className="text-right font-bold">{formatDate(employee.created_at)}</dd></div></dl>{owner ? null : <div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={() => void toggle(employee)} className={`h-11 rounded-none px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] ${active ? 'bg-[#f3d4d4] text-[#8f1717] hover:bg-[#e9b9b9]' : 'bg-[#f2ad19] text-black hover:bg-[#ff9900]'}`}>{active ? 'Desativar acesso' : 'Reativar acesso'}</Button><button type="button" onClick={() => void resetPassword(employee)} className="inline-flex h-11 items-center gap-2 border border-black/15 px-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#555] hover:border-black hover:bg-black hover:text-white"><KeyRound className="size-3.5" />Redefinir senha</button><button type="button" onClick={() => void remove(employee)} className="inline-flex h-11 items-center gap-2 border border-[#b62525]/40 px-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#b62525] hover:bg-[#b62525] hover:text-white"><Trash2 className="size-3.5" />Excluir</button></div>}</article>;
    })}</div>}

    {employees && employees.length === 0 ? <EmptyState icon={UserRound} title="Nenhum funcionário ainda" text="Crie o primeiro acesso da equipe Space Light." /> : null}
  </div>;
}
