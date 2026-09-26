'use client';

import { Check, ChevronDown, KeyRound, Loader2, Pencil, Plus, Search, Trash2, TriangleAlert, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { CompanyAvailability } from '@/components/company-portal/company-availability';
import { AccessCredentials, EmptyState, fieldClass, labelClass, selectClass, SubTabs } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registroValido } from '@/lib/certificate-config';
import type { CompanyDashboardData, CompanyInstructor } from '@/lib/company-types';
import { INSTRUCTOR_DOCUMENT_STATUS, REQUIRED_INSTRUCTOR_DOCUMENTS } from '@/lib/instructor-documents';
import { approveInstructor, createInstructor, deleteInstructor, readInstructorDocuments, resetUserPassword, reviewInstructorDocument, updateInstructor } from '@/lib/mock-company-database';

type Aba = 'lista' | 'agenda' | 'criar';

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

type AdminInstructorDocument = { id: string; instructorId: string; category: string; name: string; status: string; size: number; createdAt: string };

function InstructorDocumentsReview({ instructorId, documents, onDecide }: {
  instructorId: string;
  documents: AdminInstructorDocument[];
  onDecide: (documentId: string, status: 'approved' | 'rejected') => void;
}) {
  const meus = documents.filter((item) => item.instructorId === instructorId);
  const porCategoria = new Map(meus.map((item) => [item.category, item]));
  const aprovados = REQUIRED_INSTRUCTOR_DOCUMENTS.filter((r) => porCategoria.get(r.category)?.status === 'approved').length;

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="ds-caps text-ds-amarelo-texto">Documentos obrigatórios</span>
      <span className={`px-2 py-1 ds-caps ${aprovados === REQUIRED_INSTRUCTOR_DOCUMENTS.length ? 'bg-ds-sucesso-suave text-ds-sucesso' : 'bg-ds-amarelo-suave text-ds-amarelo-texto'}`}>{aprovados} de {REQUIRED_INSTRUCTOR_DOCUMENTS.length} aprovados</span>
    </div>
    <ul className="mt-3 space-y-2">{REQUIRED_INSTRUCTOR_DOCUMENTS.map((required) => {
      const enviado = porCategoria.get(required.category);
      const situacao = enviado ? INSTRUCTOR_DOCUMENT_STATUS[enviado.status] : null;
      const cor = !situacao ? 'bg-ds-muted text-ds-texto-2'
        : situacao.tone === 'ok' ? 'bg-ds-sucesso-suave text-ds-sucesso'
        : situacao.tone === 'bad' ? 'bg-ds-perigo-suave text-ds-perigo'
        : 'bg-ds-amarelo-suave text-ds-amarelo-texto';
      return <li key={required.category} className="rounded-lg flex flex-wrap items-center gap-2 border border-ds-borda bg-ds-superficie p-3">
        <strong className="ds-caps">{required.label}</strong>
        <span className={`px-2 py-0.5 ds-caps ${cor}`}>{situacao?.label ?? 'Não enviado'}</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {enviado ? <>
            <a href={`/api/instructor-documents/${enviado.id}`} target="_blank" rel="noopener" className="rounded-md inline-flex h-9 items-center gap-1.5 border border-ds-borda px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">Ver</a>
            {enviado.status !== 'approved' ? <button type="button" onClick={() => onDecide(enviado.id, 'approved')} className="rounded-md inline-flex h-9 items-center gap-1.5 bg-ds-sucesso-suave px-3 ds-botao text-ds-sucesso hover:bg-ds-sucesso hover:text-ds-texto-inv">Aprovar</button> : null}
            {enviado.status !== 'rejected' ? <button type="button" onClick={() => onDecide(enviado.id, 'rejected')} className="rounded-md inline-flex h-9 items-center gap-1.5 border border-ds-perigo px-3 ds-botao text-ds-perigo hover:bg-ds-perigo hover:text-ds-texto-inv">Recusar</button> : null}
          </> : <span className="ds-caps text-ds-texto-2">Aguardando o instrutor</span>}
        </span>
      </li>;
    })}</ul>
  </div>;
}

type DadosInstrutor = { name: string; document: string; email: string; phone: string; professionalRegistry: string; specialties: string; baseCity: string };

/** A gestão edita qualquer dado do instrutor. O e-mail é o login dele. */
function InstructorEdit({ instructor, notify, reload }: { instructor: CompanyInstructor; notify: (message: string) => void; reload: () => Promise<void> }) {
  const inicial = (): DadosInstrutor => ({ name: instructor.name, document: instructor.document, email: instructor.email, phone: instructor.phone ?? '', professionalRegistry: instructor.professional_registry ?? '', specialties: instructor.specialties ?? '', baseCity: instructor.base_city ?? '' });
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<DadosInstrutor>(inicial);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trocouEmail = draft.email.trim().toLowerCase() !== instructor.email.toLowerCase();
    if (trocouEmail && !window.confirm(`O e-mail é o login do instrutor. Depois de salvar, ${instructor.name} passa a entrar com ${draft.email.trim()}. Continuar?`)) return;
    setSalvando(true);
    try {
      await updateInstructor(instructor.id, draft);
      notify(trocouEmail ? 'Dados salvos. Avise o instrutor do novo e-mail de acesso.' : 'Dados do instrutor salvos.');
      setAberto(false);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar os dados do instrutor.');
    } finally {
      setSalvando(false);
    }
  }

  const campo = (chave: keyof DadosInstrutor, rotulo: string, extra: { type?: string; required?: boolean; largo?: boolean } = {}) => <label key={chave} className={extra.largo ? 'sm:col-span-2' : ''} htmlFor={`instrutor-${instructor.id}-${chave}`}><span className="mb-1.5 block ds-caps">{rotulo}</span><Input id={`instrutor-${instructor.id}-${chave}`} type={extra.type ?? 'text'} required={extra.required ?? false} value={draft[chave]} onChange={(e) => setDraft({ ...draft, [chave]: e.target.value })} className={fieldClass} /></label>;

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="ds-caps text-ds-amarelo-texto">Dados do instrutor</span>
        <p className="mt-1 text-[11px] leading-relaxed text-ds-texto-2">O e-mail é o login. O nome e o registro MTE/RE saem nos documentos.</p>
      </div>
      <button type="button" onClick={() => { setDraft(inicial()); setAberto((v) => !v); }} className="rounded-md inline-flex h-10 shrink-0 items-center gap-2 border border-ds-borda bg-ds-superficie px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv">
        <Pencil className="size-3.5" />{aberto ? 'Fechar' : 'Editar dados'}
      </button>
    </div>

    {aberto ? <form onSubmit={salvar} className="rounded-lg mt-4 grid gap-3 border border-ds-borda bg-ds-superficie p-4 sm:grid-cols-2">
      {campo('name', 'Nome completo', { required: true })}
      {campo('document', 'CPF', { required: true })}
      {campo('email', 'E-mail (login)', { type: 'email', required: true })}
      {campo('phone', 'Telefone / WhatsApp')}
      {campo('professionalRegistry', 'Registro MTE / RE')}
      {campo('baseCity', 'Cidade base')}
      {campo('specialties', 'Especialidades / NRs', { largo: true })}
      <Button type="submit" disabled={salvando} className="mt-1 h-11 bg-ds-amarelo ds-botao text-ds-texto hover:bg-[#eab900] sm:col-span-2">
        {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar dados
      </Button>
    </form> : null}
  </div>;
}

function InstructorRow({ instructor, turmas, documents, aberta, alternar, acoes, onDecide, notify, reload }: {
  instructor: CompanyInstructor;
  turmas: number;
  documents: AdminInstructorDocument[];
  aberta: boolean;
  alternar: () => void;
  acoes: { approve: () => void; reset: () => void; remove: () => void };
  notify: (message: string) => void;
  reload: () => Promise<void>;
  onDecide: (documentId: string, status: 'approved' | 'rejected') => void;
}) {
  const pendente = instructor.status === 'pending';
  const semRegistro = !registroValido(instructor.professional_registry);

  return <article className="border border-ds-borda bg-ds-superficie">
    <button type="button" onClick={alternar} aria-expanded={aberta} className="flex w-full items-center gap-4 p-4 text-left hover:bg-ds-amarelo-suave">
      <span className="rounded-md flex size-11 shrink-0 items-center justify-center bg-black text-ds-amarelo"><UserRound className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate ds-body-s font-semibold">{instructor.name}</strong>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ds-texto-2">
          <span>{instructor.document}</span>
          <span>{instructor.base_city || 'Sem cidade base'}</span>
          <span className="truncate font-bold text-ds-amarelo-texto">{instructor.specialties}</span>
          <span>{turmas === 1 ? '1 turma' : `${turmas} turmas`}</span>
        </span>
      </span>
      {semRegistro ? <span className="hidden shrink-0 items-center gap-1.5 bg-ds-perigo-suave px-2.5 py-1 ds-caps text-ds-perigo md:inline-flex"><TriangleAlert className="size-3.5" />Sem registro</span> : null}
      <span className={`shrink-0 px-2.5 py-1 ds-caps ${pendente ? 'bg-ds-amarelo-suave text-ds-amarelo-texto' : 'bg-ds-sucesso-suave text-ds-sucesso'}`}>{pendente ? 'Aguardando' : 'Ativo'}</span>
      <ChevronDown className={`size-4 shrink-0 text-ds-texto-2 transition ${aberta ? 'rotate-180' : ''}`} />
    </button>

    {aberta ? <div className="space-y-5 border-t border-ds-borda bg-ds-muted p-5">
      {semRegistro ? <p className="border-l-4 border-ds-perigo bg-ds-perigo-suave p-3 text-xs leading-relaxed text-ds-perigo">
        <strong>Registro profissional em branco ou zerado.</strong> Nos documentos deste instrutor sai apenas a assinatura da responsável técnica — preencha o MTE/RE no cadastro para que ele volte a assinar.
      </p> : null}
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">E-mail</dt><dd className="break-all text-right font-bold">{instructor.email}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Telefone</dt><dd className="text-right font-bold">{instructor.phone || '—'}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Registro MTE/RE</dt><dd className={`text-right font-bold ${semRegistro ? 'text-ds-perigo' : ''}`}>{instructor.professional_registry || 'Não informado'}</dd></div>
        <div className="flex justify-between gap-4 border-b border-ds-borda pb-2"><dt className="text-ds-texto-2">Turmas atribuídas</dt><dd className="text-right font-bold">{turmas}</dd></div>
      </dl>
      <InstructorEdit instructor={instructor} notify={notify} reload={reload} />
      <InstructorDocumentsReview instructorId={instructor.id} documents={documents} onDecide={onDecide} />
      <div className="flex flex-wrap gap-2">
        {pendente ? <Button type="button" onClick={acoes.approve} className="h-11 bg-ds-amarelo px-4 ds-botao text-ds-texto hover:bg-[#eab900]"><Check className="size-4" />Aprovar acesso</Button> : null}
        <button type="button" onClick={acoes.reset} className="rounded-md inline-flex h-11 items-center gap-2 border border-ds-borda bg-ds-superficie px-4 ds-botao text-ds-texto-2 hover:border-black hover:bg-ds-inverso hover:text-ds-texto-inv"><KeyRound className="size-3.5" />Redefinir senha</button>
        <button type="button" onClick={acoes.remove} className="rounded-md ml-auto inline-flex h-11 items-center gap-2 border border-ds-perigo bg-ds-superficie px-4 ds-botao text-ds-perigo hover:bg-ds-perigo hover:text-ds-texto-inv"><Trash2 className="size-3.5" />Excluir</button>
      </div>
    </div> : null}
  </article>;
}

export function CompanyInstructors({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [aba, setAba] = useState<Aba>('lista');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'pending' | 'active' | 'sem_registro'>('todos');
  const [aberta, setAberta] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [createdAccess, setCreatedAccess] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [resetAccess, setResetAccess] = useState<{ name: string; email: string; temporaryPassword: string; active: boolean } | null>(null);
  const [instructorDocuments, setInstructorDocuments] = useState<AdminInstructorDocument[]>([]);

  const loadDocuments = useCallback(async () => {
    try { setInstructorDocuments(await readInstructorDocuments()); }
    catch { setInstructorDocuments([]); }
  }, []);
  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  // Uma turma conta para o instrutor quando ele tem ao menos um dia dela.
  const turmasPorInstrutor = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const training of data.trainings) {
      const meus = new Set((training.sessions ?? []).map((dia) => dia.instructor_id).filter(Boolean) as string[]);
      for (const id of meus) mapa.set(id, (mapa.get(id) ?? 0) + 1);
    }
    return mapa;
  }, [data.trainings]);

  const alvo = query.trim().toLowerCase();
  const filtered = useMemo(() => data.instructors.filter((item) => {
    if (alvo && !`${item.name} ${item.document} ${item.specialties} ${item.email}`.toLowerCase().includes(alvo)) return false;
    if (filtro === 'sem_registro') return !registroValido(item.professional_registry);
    if (filtro === 'todos') return true;
    return item.status === filtro;
  }), [data.instructors, alvo, filtro]);

  const semRegistro = data.instructors.filter((item) => !registroValido(item.professional_registry)).length;

  async function decideDocument(documentId: string, status: 'approved' | 'rejected') {
    try {
      const result = await reviewInstructorDocument(documentId, status);
      notify(result.activated
        ? 'Documento aprovado. Os três estão em ordem: o acesso do instrutor foi liberado.'
        : status === 'approved' ? 'Documento aprovado.' : 'Documento recusado.');
      await loadDocuments();
      if (result.activated) await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao avaliar o documento.'); }
  }

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const access = await createInstructor(draft);
      setCreatedAccess(access); setDraft(emptyDraft); setAba('lista');
      notify('Instrutor cadastrado e acesso temporário gerado.'); await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao cadastrar instrutor.'); }
  }

  // Liberar na mão continua possível, mas com aviso: normalmente o acesso se
  // libera sozinho quando os três documentos são aprovados.
  async function approve(id: string) {
    const aprovados = REQUIRED_INSTRUCTOR_DOCUMENTS.filter((required) =>
      instructorDocuments.some((doc) => doc.instructorId === id && doc.category === required.category && doc.status === 'approved'),
    ).length;
    if (aprovados < REQUIRED_INSTRUCTOR_DOCUMENTS.length) {
      const faltam = REQUIRED_INSTRUCTOR_DOCUMENTS.length - aprovados;
      if (!window.confirm(`Ainda ${faltam === 1 ? 'falta 1 documento aprovado' : `faltam ${faltam} documentos aprovados`}. Liberar o acesso mesmo assim?`)) return;
    }
    try { await approveInstructor(id); notify('Acesso do instrutor liberado.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao aprovar instrutor.'); }
  }

  async function remove(instructor: { id: string; name: string }) {
    if (!window.confirm(`Excluir o instrutor "${instructor.name}"? O acesso dele será removido e os dias em que estava escalado ficam sem instrutor. Esta ação não pode ser desfeita.`)) return;
    try { await deleteInstructor(instructor.id); notify('Instrutor excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o instrutor.'); }
  }

  async function resetPassword(instructor: { id: string; name: string }) {
    if (!window.confirm(`Gerar uma nova senha temporária para "${instructor.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try { setResetAccess(await resetUserPassword({ instructorId: instructor.id })); notify('Senha temporária gerada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.'); }
  }

  return <div className="space-y-6">
    <SubTabs label="Seções de instrutores" active={aba} onChange={setAba} tabs={[
      { id: 'lista', label: 'Instrutores', count: data.instructors.length },
      { id: 'agenda', label: 'Disponibilidade' },
      { id: 'criar', label: 'Cadastrar' },
    ]} />

    {createdAccess ? <AccessCredentials eyebrow="Envie ao instrutor" note="A senha temporária aparece somente agora e deverá ser trocada no primeiro acesso." email={createdAccess.email} password={createdAccess.temporaryPassword} onDismiss={() => setCreatedAccess(null)} /> : null}
    {resetAccess ? <AccessCredentials eyebrow={`Nova senha de ${resetAccess.name}`} note={resetAccess.active ? 'Anote agora: a senha aparece somente desta vez. A senha antiga já não funciona e, no próximo acesso, o instrutor terá de criar uma nova.' : 'Anote agora: a senha aparece somente desta vez. Atenção: este acesso ainda está inativo — aprove o instrutor para ele conseguir entrar.'} email={resetAccess.email} password={resetAccess.temporaryPassword} onDismiss={() => setResetAccess(null)} /> : null}

    {aba === 'lista' ? <>
      {semRegistro > 0 ? <button type="button" onClick={() => setFiltro('sem_registro')} className="flex w-full items-center gap-3 border-l-4 border-ds-perigo bg-ds-perigo-suave p-4 text-left hover:bg-ds-perigo-suave">
        <TriangleAlert className="size-5 shrink-0 text-ds-perigo" />
        <span className="text-xs font-bold text-ds-perigo">{semRegistro === 1 ? '1 instrutor está sem registro do MTE/RE' : `${semRegistro} instrutores estão sem registro do MTE/RE`} e não assinam os documentos. Ver quais →</span>
      </button> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ds-texto-2" /><Input aria-label="Buscar instrutor" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, CPF, e-mail ou especialidade" className={`${fieldClass} pl-11`} /></div>
        <label className="sm:w-60" htmlFor="instrutores-filtro"><span className="sr-only">Filtrar instrutores</span>
          <select id="instrutores-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={selectClass}>
            <option value="todos">Todos</option>
            <option value="active">Ativos</option>
            <option value="pending">Aguardando aprovação</option>
            <option value="sem_registro">Sem registro MTE/RE</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">{filtered.map((instructor) => <InstructorRow key={instructor.id} instructor={instructor}
        turmas={turmasPorInstrutor.get(instructor.id) ?? 0} documents={instructorDocuments}
        aberta={aberta === instructor.id} alternar={() => setAberta((atual) => (atual === instructor.id ? null : instructor.id))}
        onDecide={(id, status) => void decideDocument(id, status)}
        notify={notify} reload={reload}
        acoes={{
          approve: () => void approve(instructor.id),
          reset: () => void resetPassword({ id: instructor.id, name: instructor.name }),
          remove: () => void remove({ id: instructor.id, name: instructor.name }),
        }} />)}</div>
      {filtered.length === 0 ? <EmptyState icon={UserRound} title="Nenhum instrutor encontrado" text="Ajuste a busca ou cadastre um novo instrutor na aba Cadastrar." /> : null}
    </> : null}

    {aba === 'agenda' ? <CompanyAvailability data={data} /> : null}

    {aba === 'criar' ? <form onSubmit={save} className="rounded-lg max-w-3xl border border-ds-borda bg-ds-superficie p-6 md:p-8">
      <span className="eyebrow text-ds-amarelo-texto">Cadastro profissional</span>
      <h2 className="mt-2 ds-h4">Novo instrutor</h2>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-ds-texto-2">O registro do MTE/RE é o que autoriza a assinatura dele nos certificados. Deixado em branco (ou zerado), os documentos saem só com a assinatura da responsável técnica.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label htmlFor="instrutor-nome"><span className={labelClass}>Nome completo</span><Input id="instrutor-nome" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="instrutor-cpf"><span className={labelClass}>CPF</span><Input id="instrutor-cpf" required value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="instrutor-email"><span className={labelClass}>E-mail</span><Input id="instrutor-email" required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="instrutor-telefone"><span className={labelClass}>Telefone / WhatsApp</span><Input id="instrutor-telefone" required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="instrutor-registro"><span className={labelClass}>Registro MTE / RE</span><Input id="instrutor-registro" required value={draft.professionalRegistry} onChange={(e) => setDraft({ ...draft, professionalRegistry: e.target.value })} className={fieldClass} /></label>
        <label htmlFor="instrutor-cidade"><span className={labelClass}>Cidade base</span><Input id="instrutor-cidade" required value={draft.baseCity} onChange={(e) => setDraft({ ...draft, baseCity: e.target.value })} className={fieldClass} /></label>
        <label className="md:col-span-2" htmlFor="instrutor-especialidades"><span className={labelClass}>Especialidades / NRs</span><Input id="instrutor-especialidades" required value={draft.specialties} onChange={(e) => setDraft({ ...draft, specialties: e.target.value })} className={fieldClass} /></label>
      </div>
      <Button type="submit" className="mt-6 h-12 bg-ds-amarelo px-8 ds-botao text-ds-texto hover:bg-[#eab900]"><Plus className="size-4" />Salvar e gerar acesso</Button>
    </form> : null}
  </div>;
}
