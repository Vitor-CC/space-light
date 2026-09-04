'use client';

import { Check, KeyRound, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import { AccessCredentials, EmptyState, fieldClass, formatDate } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyDashboardData } from '@/lib/company-types';
import { approveInstructor, createInstructor, deleteInstructor, resetUserPassword } from '@/lib/mock-company-database';

type Draft = {
  name: string;
  document: string;
  email: string;
  phone: string;
  professionalRegistry: string;
  specialties: string;
  baseCity: string;
};

const emptyDraft: Draft = { name: '', document: '', email: '', phone: '', professionalRegistry: '', specialties: '', baseCity: '' };

export function CompanyInstructors({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [createdAccess, setCreatedAccess] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [resetAccess, setResetAccess] = useState<{ name: string; email: string; temporaryPassword: string; active: boolean } | null>(null);
  const filtered = data.instructors.filter((item) => `${item.name} ${item.document} ${item.specialties}`.toLowerCase().includes(query.toLowerCase()));

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const access = await createInstructor(draft);
      setCreatedAccess(access); setDraft(emptyDraft); setShowForm(false);
      notify('Instrutor cadastrado e acesso temporário gerado.'); await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao cadastrar instrutor.'); }
  }

  async function approve(id: string) {
    try { await approveInstructor(id); notify('Acesso do instrutor aprovado.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao aprovar instrutor.'); }
  }

  async function remove(instructor: { id: string; name: string }) {
    if (!window.confirm(`Excluir o instrutor "${instructor.name}"? O acesso dele será removido. Os treinamentos ficam sem instrutor vinculado. Esta ação não pode ser desfeita.`)) return;
    try { await deleteInstructor(instructor.id); notify('Instrutor excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o instrutor.'); }
  }

  async function resetPassword(instructor: { id: string; name: string }) {
    if (!window.confirm(`Gerar uma nova senha temporária para "${instructor.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try { setResetAccess(await resetUserPassword({ instructorId: instructor.id })); notify('Senha temporária gerada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.'); }
  }

  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" /><Input aria-label="Buscar instrutor" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, CPF ou especialidade" className={`${fieldClass} pl-11`} /></div><Button type="button" onClick={() => setShowForm((value) => !value)} className="h-12 rounded-none bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900]">{showForm ? <X className="size-4" /> : <Plus className="size-4" />}{showForm ? 'Fechar cadastro' : 'Novo instrutor'}</Button></div>
    {createdAccess ? <AccessCredentials eyebrow="Envie ao instrutor" note="A senha temporária aparece somente agora e deverá ser trocada no primeiro acesso." email={createdAccess.email} password={createdAccess.temporaryPassword} onDismiss={() => setCreatedAccess(null)} /> : null}
    {resetAccess ? <AccessCredentials eyebrow={`Nova senha de ${resetAccess.name}`} note={resetAccess.active ? 'Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o instrutor terá de criar uma nova.' : 'Anote agora: a senha aparece somente desta vez. Atenção: este acesso ainda está inativo — aprove o instrutor para ele conseguir entrar.'} email={resetAccess.email} password={resetAccess.temporaryPassword} onDismiss={() => setResetAccess(null)} /> : null}
    {showForm ? <form onSubmit={save} className="border border-black/10 bg-white p-6 md:p-7"><span className="eyebrow text-[#8a6107]">Cadastro profissional</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-.04em]">Novo instrutor</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome completo" className={fieldClass} /><Input required value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })} placeholder="CPF" className={fieldClass} /><Input required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="E-mail" className={fieldClass} /><Input required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Telefone / WhatsApp" className={fieldClass} /><Input required value={draft.professionalRegistry} onChange={(e) => setDraft({ ...draft, professionalRegistry: e.target.value })} placeholder="Registro profissional" className={fieldClass} /><Input required value={draft.baseCity} onChange={(e) => setDraft({ ...draft, baseCity: e.target.value })} placeholder="Cidade base" className={fieldClass} /><Input required value={draft.specialties} onChange={(e) => setDraft({ ...draft, specialties: e.target.value })} placeholder="Especialidades / NRs" className={`${fieldClass} md:col-span-2`} /></div><Button type="submit" className="mt-5 h-12 rounded-none bg-black px-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-white hover:bg-[#f2ad19] hover:text-black"><Check className="size-4" />Salvar e gerar acesso</Button></form> : null}
    {data.instructorAvailability.length ? <section className="border border-black/10 bg-white p-5"><span className="eyebrow text-[#8a6107]">Agenda informada</span><h2 className="mt-2 text-xl font-extrabold uppercase">Próximas disponibilidades</h2><div className="mt-4 flex flex-wrap gap-2">{data.instructorAvailability.slice(0, 18).map((item) => <span key={item.id} className="border border-black/10 bg-[#fff8e8] px-3 py-2 text-[10px] font-bold"><strong>{item.instructor_name}</strong> · {formatDate(item.available_date)}</span>)}</div></section> : null}
    <div className="grid gap-4 xl:grid-cols-2">{filtered.map((instructor) => { const trainings = data.trainings.filter((item) => item.instructor_id === instructor.id); const pending = instructor.status === 'pending'; return <article key={instructor.id} className="border border-black/10 bg-white p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center bg-black text-[#f2ad19]"><UserRound className="size-5" /></span><div className="min-w-0"><span className={`px-2 py-1 text-[9px] font-extrabold uppercase ${pending ? 'bg-[#fff0d2] text-[#8a6107]' : 'bg-[#daf2df] text-[#17642d]'}`}>{pending ? 'Aguardando aprovação' : 'Ativo'}</span><h2 className="mt-3 text-xl font-extrabold uppercase tracking-[-.035em]">{instructor.name}</h2><p className="mt-1 text-xs text-[#777]">{instructor.document} · {instructor.base_city}</p></div></div><div className="mt-5 border-l-4 border-[#f2ad19] bg-[#fff8e8] p-3 text-xs font-bold text-[#6d5116]">{instructor.specialties}</div><dl className="mt-5 grid gap-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-[#777]">E-mail</dt><dd className="break-all text-right font-bold">{instructor.email}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#777]">Registro</dt><dd className="text-right font-bold">{instructor.professional_registry}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#777]">Treinamentos</dt><dd className="font-bold">{trainings.length}</dd></div></dl><div className="mt-5 flex flex-wrap gap-2">{pending ? <Button type="button" onClick={() => void approve(instructor.id)} className="h-11 rounded-none bg-[#f2ad19] px-4 text-[9px] font-extrabold uppercase tracking-[.1em] text-black hover:bg-[#ff9900]"><Check className="size-4" />Aprovar acesso</Button> : null}<button type="button" onClick={() => void resetPassword({ id: instructor.id, name: instructor.name })} className="inline-flex h-11 items-center gap-2 border border-black/15 px-3 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#555] hover:border-black hover:bg-black hover:text-white"><KeyRound className="size-3.5" />Redefinir senha</button><button type="button" onClick={() => void remove({ id: instructor.id, name: instructor.name })} className="inline-flex h-11 items-center gap-2 border border-[#b62525]/40 px-3 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#b62525] hover:bg-[#b62525] hover:text-white"><Trash2 className="size-3.5" />Excluir</button></div></article>; })}</div>
    {filtered.length === 0 ? <EmptyState icon={UserRound} title="Nenhum instrutor encontrado" text="Ajuste a busca ou cadastre um novo instrutor." /> : null}
  </div>;
}
