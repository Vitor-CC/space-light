'use client';

import { ArrowLeft, CalendarDays, Check, Copy, Eye, FileText, KeyRound, Loader2, MessageCircle, Pencil, Plus, Trash2, TriangleAlert, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { CompanyAvailability } from '@/components/company-portal/company-availability';
import { FotoDePerfil } from '@/components/foto-de-perfil';
import { pendenciasDaEquipe, SinoEquipe } from '@/components/company-portal/company-topo';
import type { NavegarEquipe } from '@/components/company-portal/company-topo';
import { situacaoDaTurma } from '@/components/company-portal/company-trainings';
import { AccessCredentials, dateFromIso, formatDate, formatDayMonth, isoFromDate } from '@/components/company-portal/company-ui';
import { Avatar, BarraSuperior, Botao, botaoClasses, Campo, campoClasses, Faixa, tabelaClasses as tb, Tag, Vazio } from '@/components/ds/base';
import type { Tom } from '@/components/ds/base';
import { Abas, PainelLateral } from '@/components/ds/interativo';
import { Calendar } from '@/components/ui/calendar';
import { registroValido } from '@/lib/certificate-config';
import type { CompanyDashboardData, CompanyInstructor } from '@/lib/company-types';
import { REQUIRED_INSTRUCTOR_DOCUMENTS } from '@/lib/instructor-documents';
import { approveInstructor, createInstructor, deleteInstructor, readInstructorDocuments, resetUserPassword, reviewInstructorDocument, updateInstructor } from '@/lib/mock-company-database';
import { urlDaFoto } from '@/lib/fotos';
import { cn } from '@/lib/utils';
import { whatsappLink } from '@/lib/whatsapp';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;
type Documento = { id: string; instructorId: string; category: string; name: string; status: string; size: number; createdAt: string };
type Dados = { name: string; document: string; email: string; phone: string; professionalRegistry: string; specialties: string; baseCity: string };
type AbaLista = 'ativos' | 'aguardando' | 'documentos' | 'inativos';
type AbaFicha = 'documentos' | 'disponibilidade' | 'turmas' | 'dados';

const DADOS_VAZIOS: Dados = { name: '', document: '', email: '', phone: '', professionalRegistry: '', specialties: '', baseCity: '' };

/** "NR 23, NR 35, NR 10" vira "NR 10, 23, 35", como na tabela do Figma (81:1719). */
function normasCurtas(especialidades: string) {
  const numeros = [...new Set((especialidades.match(/\d+/g) ?? []).map(Number))].sort((a, b) => a - b);
  return numeros.length ? `NR ${numeros.map((n) => String(n).padStart(2, '0')).join(', ')}` : especialidades || '—';
}

/** Situação dos três documentos obrigatórios de um instrutor, numa etiqueta. */
function situacaoDosDocumentos(docs: Documento[]): { tom: Tom; texto: string } {
  const porCategoria = new Map(docs.map((d) => [d.category, d]));
  const paraAvaliar = docs.filter((d) => d.status === 'pending').length;
  if (paraAvaliar) return { tom: 'info', texto: paraAvaliar === 1 ? '1 para avaliar' : `${paraAvaliar} para avaliar` };
  if (REQUIRED_INSTRUCTOR_DOCUMENTS.some((r) => porCategoria.get(r.category)?.status === 'rejected')) return { tom: 'perigo', texto: 'Recusado' };
  const faltam = REQUIRED_INSTRUCTOR_DOCUMENTS.filter((r) => !porCategoria.has(r.category)).length;
  if (faltam) return { tom: 'atencao', texto: faltam === 1 ? 'Falta 1' : `Faltam ${faltam}` };
  return { tom: 'sucesso', texto: 'Em dia' };
}

/** PDF ou imagem enviada pelo instrutor, dentro do painel de avaliação. */
function PreVisualizacao({ doc }: { doc: Documento }) {
  const url = `/api/instructor-documents/${doc.id}`;
  const imagem = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(doc.name);
  return <div className="flex h-[300px] items-center justify-center overflow-hidden rounded-md border border-ds-borda bg-ds-muted">
    {imagem
      // eslint-disable-next-line @next/next/no-img-element -- arquivo privado servido pela rota do portal
      ? <img src={url} alt={doc.name} className="max-h-full max-w-full object-contain" />
      : /\.pdf$/i.test(doc.name) ? <iframe src={url} title={doc.name} className="size-full" />
      : <span className="flex flex-col items-center gap-2 ds-caption text-ds-texto-2"><FileText className="size-10" />Sem pré-visualização</span>}
  </div>;
}

/** Aba Documentos da ficha (Figma 81:1971): lista à esquerda, avaliação à direita. */
function DocumentosDoInstrutor({ docs, onDecidir }: { docs: Documento[]; onDecidir: (id: string, status: 'approved' | 'rejected') => Promise<void> }) {
  const linhas = REQUIRED_INSTRUCTOR_DOCUMENTS.map((r) => ({ requisito: r, doc: docs.find((d) => d.category === r.category) }));
  const primeiroParaAvaliar = linhas.find((l) => l.doc?.status === 'pending')?.doc ?? linhas.find((l) => l.doc)?.doc;
  const [selecionado, setSelecionado] = useState<string | null>(primeiroParaAvaliar?.id ?? null);
  const [decidindo, setDecidindo] = useState('');
  const atual = docs.find((d) => d.id === selecionado);
  const rotulo = (categoria: string) => REQUIRED_INSTRUCTOR_DOCUMENTS.find((r) => r.category === categoria)?.label ?? categoria;

  async function decidir(status: 'approved' | 'rejected') {
    if (!atual) return;
    setDecidindo(status);
    try { await onDecidir(atual.id, status); } finally { setDecidindo(''); }
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
    <div className="overflow-hidden rounded-lg bg-ds-superficie">
      {linhas.map(({ requisito, doc }) => {
        const ativo = doc && doc.id === selecionado;
        const tag: { tom: Tom; texto: string } = !doc ? { tom: 'neutro', texto: 'Não enviado' } : doc.status === 'approved' ? { tom: 'sucesso', texto: 'Aprovado' } : doc.status === 'rejected' ? { tom: 'perigo', texto: 'Recusado' } : { tom: 'info', texto: 'Para avaliar' };
        return <button key={requisito.category} type="button" disabled={!doc} onClick={() => doc && setSelecionado(doc.id)} className={cn('flex w-full items-center gap-3.5 border-b border-l-[3px] border-b-ds-borda px-5 py-3.5 text-left ds-foco disabled:cursor-default', ativo ? 'border-l-ds-amarelo bg-ds-amarelo-suave' : 'border-l-transparent hover:bg-ds-muted')}>
          <span className="flex shrink-0 rounded-lg border border-ds-borda bg-ds-superficie p-2"><FileText className="size-[18px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate ds-body-s font-medium">{requisito.label}</span>
            <span className="block truncate ds-caption text-ds-texto-2">{doc ? `${doc.name} · ${doc.status === 'pending' ? `enviado em ${formatDayMonth(doc.createdAt.slice(0, 10))}` : doc.status === 'approved' ? 'aprovado' : 'recusado'}` : 'Aguardando o instrutor'}</span>
          </span>
          <Tag tom={tag.tom}>{tag.texto}</Tag>
        </button>;
      })}
    </div>
    <div className="flex flex-col gap-3.5 rounded-lg bg-ds-superficie p-5">
      {atual ? <>
        <h3 className="ds-h4">{rotulo(atual.category)}</h3>
        <PreVisualizacao doc={atual} />
        <a href={`/api/instructor-documents/${atual.id}`} target="_blank" rel="noopener" className={botaoClasses('link', 'P', 'w-fit')}><Eye />Abrir em outra aba</a>
        <div className="flex gap-2.5">
          <Botao tipo="secundario" className="flex-1" disabled={Boolean(decidindo) || atual.status === 'rejected'} onClick={() => void decidir('rejected')}>{decidindo === 'rejected' ? <Loader2 className="animate-spin" /> : null}Recusar<X /></Botao>
          <Botao className="flex-1" disabled={Boolean(decidindo) || atual.status === 'approved'} onClick={() => void decidir('approved')}>{decidindo === 'approved' ? <Loader2 className="animate-spin" /> : null}Aprovar<Check /></Botao>
        </div>
      </> : <Vazio icone={<FileText />} titulo="Nenhum documento enviado" texto="O instrutor envia CNH, assinatura e registro pelo portal dele. Aparecem aqui para você avaliar." />}
    </div>
  </div>;
}

/** Aba Disponibilidade: os dias livres que o instrutor informou e as turmas dele no calendário. */
function DisponibilidadeDoInstrutor({ instructor, data, hoje }: { instructor: CompanyInstructor; data: CompanyDashboardData; hoje: string }) {
  const [mes, setMes] = useState<Date>(() => dateFromIso(hoje));
  const livres = data.instructorAvailability.filter((a) => a.instructor_id === instructor.id).map((a) => a.available_date);
  const comTurma = data.trainings.flatMap((t) => (t.sessions ?? []).filter((s) => s.instructor_id === instructor.id).map((s) => s.session_date));
  const proximos = livres.filter((d) => d >= hoje).sort();
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="flex flex-col gap-3 rounded-lg bg-ds-superficie p-5">
      <div><h3 className="ds-h4">Dias disponíveis</h3><p className="ds-body-s text-ds-texto-2">Informados pelo instrutor no portal dele. Dia com turma sai da lista.</p></div>
      {proximos.length
        ? <ul className="flex flex-wrap gap-2">{proximos.map((d) => <li key={d} className="rounded-md bg-ds-amarelo-suave px-3 py-1.5 ds-body-s font-medium">{formatDate(d)}</li>)}</ul>
        : <p className="rounded-md border border-dashed border-ds-borda p-4 ds-body-s text-ds-texto-2">Nenhum dia livre informado daqui para a frente.</p>}
      <p className="mt-auto flex items-center gap-2 ds-caption text-ds-texto-2"><CalendarDays className="size-4 shrink-0" />Só o instrutor altera a disponibilidade. A equipe vê e usa na escala.</p>
    </div>
    <div className="h-fit rounded-lg border border-ds-borda bg-ds-superficie p-4">
      <Calendar mode="single" month={mes} onMonthChange={setMes} locale={ptBR} modifiers={{ livre: livres.map(dateFromIso), turma: comTurma.map(dateFromIso), hoje: [dateFromIso(hoje)] }} modifiersClassNames={{ livre: '[&>button]:bg-ds-amarelo-suave', turma: '[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-ds-amarelo [&>button]:relative', hoje: '[&>button]:ring-2 [&>button]:ring-ds-amarelo [&>button]:ring-inset' }} className="mx-auto w-full bg-transparent p-0 [--cell-size:--spacing(10)]" />
      <div className="mt-3 flex flex-wrap gap-4 border-t border-ds-borda pt-3 ds-caption text-ds-texto-2">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-ds-amarelo" />Com turma</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-ds-amarelo-suave" />Livre</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm ring-2 ring-ds-amarelo ring-inset" />Hoje</span>
      </div>
    </div>
  </div>;
}

/** Aba Dados: o cadastro do instrutor (o e-mail é o login) e as ações de acesso. */
function DadosDoInstrutor({ instructor, notify, reload, aprovar, novaSenha, excluir }: { instructor: CompanyInstructor; notify: Notify; reload: Reload; aprovar: () => void; novaSenha: () => void; excluir: () => void }) {
  const inicial = (): Dados => ({ name: instructor.name, document: instructor.document, email: instructor.email, phone: instructor.phone ?? '', professionalRegistry: instructor.professional_registry ?? '', specialties: instructor.specialties ?? '', baseCity: instructor.base_city ?? '' });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draft, setDraft] = useState<Dados>(inicial);
  const semRegistro = !registroValido(instructor.professional_registry);

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trocouEmail = draft.email.trim().toLowerCase() !== instructor.email.toLowerCase();
    if (trocouEmail && !window.confirm(`O e-mail é o login do instrutor. Depois de salvar, ${instructor.name} passa a entrar com ${draft.email.trim()}. Continuar?`)) return;
    setSalvando(true);
    try {
      await updateInstructor(instructor.id, draft);
      notify(trocouEmail ? 'Dados salvos. Avise o instrutor do novo e-mail de acesso.' : 'Dados do instrutor salvos.');
      setEditando(false);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar os dados do instrutor.'); }
    finally { setSalvando(false); }
  }

  const campo = (chave: keyof Dados, rotulo: string, extra: { type?: string; largo?: boolean } = {}) => <Campo key={chave} rotulo={rotulo} className={extra.largo ? 'sm:col-span-2' : ''}><input type={extra.type ?? 'text'} required={chave === 'name' || chave === 'document' || chave === 'email'} value={draft[chave]} onChange={(e) => { const valor = e.target.value; setDraft((atual) => ({ ...atual, [chave]: valor })); }} className={campoClasses} /></Campo>;
  const linha = (rotulo: string, valor: string, perigo = false) => <div className="flex justify-between gap-4 border-b border-ds-borda py-2.5 last:border-b-0"><dt className="text-ds-texto-2">{rotulo}</dt><dd className={cn('text-right font-medium break-all', perigo && 'text-ds-perigo')}>{valor || '—'}</dd></div>;

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="flex flex-col gap-4 rounded-lg bg-ds-superficie p-5">
      <FotoDePerfil tipo="instrutor" id={instructor.id} nome={instructor.name} chave={instructor.photo_key} aoMudar={reload} notify={notify} className="border-b border-ds-borda pb-4" />
      {semRegistro ? <Faixa tom="perigo" titulo="Registro profissional em branco ou zerado">Nos documentos deste instrutor sai só a assinatura da responsável técnica. Preencha o MTE/RE para ele voltar a assinar.</Faixa> : null}
      {editando ? <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        {campo('name', 'Nome completo')}
        {campo('document', 'CPF')}
        {campo('email', 'E-mail (login)', { type: 'email' })}
        {campo('phone', 'Telefone / WhatsApp')}
        {campo('professionalRegistry', 'Registro MTE / RE')}
        {campo('baseCity', 'Cidade base')}
        {campo('specialties', 'Especialidades / NRs', { largo: true })}
        <div className="flex gap-2 sm:col-span-2"><Botao type="submit" disabled={salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Check />}Salvar dados</Botao><Botao tipo="fantasma" onClick={() => setEditando(false)}>Cancelar</Botao></div>
      </form> : <>
        <dl className="ds-body-s">
          {linha('E-mail (login)', instructor.email)}
          {linha('Telefone', instructor.phone)}
          {linha('CPF', instructor.document)}
          {linha('Registro MTE/RE', instructor.professional_registry || 'Não informado', semRegistro)}
          {linha('Cidade base', instructor.base_city)}
          {linha('Especialidades', instructor.specialties)}
        </dl>
        <button type="button" onClick={() => { setDraft(inicial()); setEditando(true); }} className={botaoClasses('secundario', 'M', 'w-fit')}><Pencil />Editar dados</button>
      </>}
    </div>
    <div className="flex h-fit flex-col gap-3 rounded-lg bg-ds-superficie p-5">
      <h3 className="ds-h4">Acesso</h3>
      <p className="ds-body-s text-ds-texto-2">{instructor.status === 'pending' ? 'Aguardando aprovação. O acesso se libera sozinho quando os três documentos são aprovados.' : instructor.status === 'suspended' ? 'Acesso inativo.' : 'Acesso liberado.'}</p>
      {instructor.status === 'pending' ? <Botao onClick={aprovar}><Check />Aprovar acesso</Botao> : null}
      <Botao tipo="secundario" onClick={novaSenha}><KeyRound />Gerar senha temporária</Botao>
      <button type="button" onClick={excluir} className={botaoClasses('fantasma', 'M', 'text-ds-perigo hover:border-ds-perigo')}><Trash2 />Excluir instrutor</button>
    </div>
  </div>;
}

export function CompanyInstructors({ data, reload, notify, navegar }: { data: CompanyDashboardData; reload: Reload; notify: Notify; navegar: NavegarEquipe }) {
  const [agora] = useState(() => Date.now());
  const hoje = isoFromDate(new Date(agora));
  const [aba, setAba] = useState<AbaLista>('ativos');
  const [agenda, setAgenda] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [abaFicha, setAbaFicha] = useState<AbaFicha>('documentos');
  const [cadastrando, setCadastrando] = useState(false);
  const [novo, setNovo] = useState<Dados>(DADOS_VAZIOS);
  const [salvando, setSalvando] = useState(false);
  const [acessoCriado, setAcessoCriado] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [senhaNova, setSenhaNova] = useState<{ name: string; email: string; temporaryPassword: string; active: boolean } | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  const carregarDocumentos = useCallback(async () => {
    try { setDocumentos(await readInstructorDocuments()); }
    catch { setDocumentos([]); }
  }, []);
  useEffect(() => {
    let ativo = true;
    readInstructorDocuments().then((docs) => { if (ativo) setDocumentos(docs); }).catch(() => { if (ativo) setDocumentos([]); });
    return () => { ativo = false; };
  }, []);

  const docsDe = useCallback((id: string) => documentos.filter((d) => d.instructorId === id), [documentos]);
  const mes = hoje.slice(0, 7);
  // Uma turma conta no mês quando ele tem ao menos um dia dela nesse mês.
  const turmasNoMes = (id: string) => data.trainings.filter((t) => (t.sessions ?? []).some((s) => s.instructor_id === id && s.session_date.startsWith(mes))).length;
  const livresNos30 = (id: string) => {
    const limite = isoFromDate(new Date(agora + 30 * 86_400_000));
    return data.instructorAvailability.filter((a) => a.instructor_id === id && a.available_date >= hoje && a.available_date <= limite).length;
  };
  const regras: Record<AbaLista, (i: CompanyInstructor) => boolean> = {
    ativos: (i) => i.status === 'active' || i.status === 'invited',
    aguardando: (i) => i.status === 'pending',
    documentos: (i) => docsDe(i.id).some((d) => d.status === 'pending'),
    inativos: (i) => i.status === 'suspended',
  };
  const lista = data.instructors.filter(regras[aba]);
  const semRegistro = data.instructors.filter((i) => !registroValido(i.professional_registry));
  const instrutor = aberto ? data.instructors.find((i) => i.id === aberto) : undefined;

  async function decidir(id: string, status: 'approved' | 'rejected') {
    try {
      const resultado = await reviewInstructorDocument(id, status);
      notify(resultado.activated ? 'Documento aprovado. Os três estão em ordem: o acesso do instrutor foi liberado.' : status === 'approved' ? 'Documento aprovado.' : 'Documento recusado.');
      await carregarDocumentos();
      if (resultado.activated) await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao avaliar o documento.'); }
  }
  // Liberar na mão continua possível, com aviso: normalmente o acesso se
  // libera sozinho quando os três documentos são aprovados.
  async function aprovar(i: CompanyInstructor) {
    const aprovados = REQUIRED_INSTRUCTOR_DOCUMENTS.filter((r) => docsDe(i.id).some((d) => d.category === r.category && d.status === 'approved')).length;
    const faltam = REQUIRED_INSTRUCTOR_DOCUMENTS.length - aprovados;
    if (faltam > 0 && !window.confirm(`Ainda ${faltam === 1 ? 'falta 1 documento aprovado' : `faltam ${faltam} documentos aprovados`}. Liberar o acesso mesmo assim?`)) return;
    try { await approveInstructor(i.id); notify('Acesso do instrutor liberado.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao aprovar instrutor.'); }
  }
  async function excluir(i: CompanyInstructor) {
    if (!window.confirm(`Excluir o instrutor "${i.name}"? O acesso dele será removido e os dias em que estava escalado ficam sem instrutor. Esta ação não pode ser desfeita.`)) return;
    try { await deleteInstructor(i.id); notify('Instrutor excluído.'); setAberto(null); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o instrutor.'); }
  }
  async function novaSenha(i: CompanyInstructor) {
    if (!window.confirm(`Gerar uma nova senha temporária para "${i.name}"? A senha atual deixa de funcionar imediatamente.`)) return;
    try { setSenhaNova(await resetUserPassword({ instructorId: i.id })); notify('Senha temporária gerada.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao redefinir a senha.'); }
  }
  async function cadastrar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    try {
      setAcessoCriado(await createInstructor(novo));
      setNovo(DADOS_VAZIOS);
      setCadastrando(false);
      notify('Instrutor cadastrado e acesso temporário gerado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao cadastrar instrutor.'); }
    finally { setSalvando(false); }
  }
  async function copiarLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/instrutor/cadastro`); notify('Link de cadastro copiado. Mande para o instrutor preencher.'); }
    catch { notify(`Não foi possível copiar. O link é ${window.location.origin}/instrutor/cadastro`); }
  }

  const credenciais = <>
    {acessoCriado ? <AccessCredentials eyebrow="Envie ao instrutor" note="A senha temporária aparece somente agora e deverá ser trocada no primeiro acesso." email={acessoCriado.email} password={acessoCriado.temporaryPassword} onDismiss={() => setAcessoCriado(null)} /> : null}
    {senhaNova ? <AccessCredentials eyebrow={`Nova senha de ${senhaNova.name}`} note={senhaNova.active ? 'Anote agora: a senha aparece somente desta vez. A antiga já não funciona e, no próximo acesso, o instrutor cria uma nova.' : 'Anote agora: a senha aparece somente desta vez. Este acesso ainda está inativo: aprove o instrutor para ele conseguir entrar.'} email={senhaNova.email} password={senhaNova.temporaryPassword} onDismiss={() => setSenhaNova(null)} /> : null}
  </>;

  // Ficha do instrutor (Figma 81:1858 e 94:11100).
  if (instrutor) {
    const docs = docsDe(instrutor.id);
    const turmas = data.trainings.filter((t) => (t.sessions ?? []).some((s) => s.instructor_id === instrutor.id)).sort((a, b) => b.training_date.localeCompare(a.training_date));
    const desde = instrutor.created_at ? `${instrutor.created_at.slice(5, 7)}/${instrutor.created_at.slice(0, 4)}` : '';
    const whats = instrutor.phone ? whatsappLink(instrutor.phone, `Olá, ${instrutor.name.split(' ')[0]}!`) : null;
    return <div className="flex flex-col gap-5">
      <button type="button" onClick={() => setAberto(null)} className={botaoClasses('link', 'P', 'w-fit min-h-0 gap-1.5 py-0 text-ds-texto-2 [&_svg]:size-4')}><ArrowLeft />Instrutores</button>
      <BarraSuperior titulo={instrutor.name}
        subtitulo={[desde ? `Instrutor desde ${desde}` : '', instrutor.base_city, normasCurtas(instrutor.specialties)].filter(Boolean).join(' · ')}
        acoes={whats ? <a href={whats} target="_blank" rel="noreferrer" className={botaoClasses('secundario', 'M')}>WhatsApp<MessageCircle /></a> : null}
        notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />} />
      {credenciais}
      <Abas rotulo="Seções do instrutor" ativa={abaFicha} onChange={setAbaFicha} abas={[
        { id: 'documentos', rotulo: 'Documentos', contador: docs.filter((d) => d.status === 'pending').length || undefined },
        { id: 'disponibilidade', rotulo: 'Disponibilidade' },
        { id: 'turmas', rotulo: 'Turmas', contador: turmas.length },
        { id: 'dados', rotulo: 'Dados' },
      ]} />
      {abaFicha === 'documentos' ? <DocumentosDoInstrutor key={instrutor.id} docs={docs} onDecidir={decidir} /> : null}
      {abaFicha === 'disponibilidade' ? <DisponibilidadeDoInstrutor instructor={instrutor} data={data} hoje={hoje} /> : null}
      {abaFicha === 'turmas' ? (turmas.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[720px]')}>
        <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Cliente</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Dias dele</th><th className={tb.th}>Status</th></tr></thead>
        <tbody>{turmas.map((t) => {
          const dias = (t.sessions ?? []).filter((s) => s.instructor_id === instrutor.id);
          const sit = situacaoDaTurma(t, hoje);
          return <tr key={t.id} onClick={() => navegar('trainings', t.id)} className={cn(tb.linha, tb.linhaClicavel)}>
            <td className={tb.td}><span className={tb.codigo}>{t.code}</span></td>
            <td className={cn(tb.td, 'font-medium')}>{t.client_name}</td>
            <td className={cn(tb.td, 'max-w-[220px] truncate')}>{t.nr} · {t.title}</td>
            <td className={cn(tb.td, 'whitespace-nowrap')}>{dias.map((d) => formatDayMonth(d.session_date)).join(', ')}</td>
            <td className={tb.td}><Tag tom={sit.tom}>{sit.texto}</Tag></td>
          </tr>;
        })}</tbody>
      </table></div></div> : <Vazio icone={<CalendarDays />} titulo="Nenhuma turma ainda" texto="As turmas em que ele for escalado aparecem aqui." />) : null}
      {abaFicha === 'dados' ? <DadosDoInstrutor key={instrutor.id} instructor={instrutor} notify={notify} reload={reload} aprovar={() => void aprovar(instrutor)} novaSenha={() => void novaSenha(instrutor)} excluir={() => void excluir(instrutor)} /> : null}
    </div>;
  }

  // Lista (Figma 81:1719).
  return <div className="flex flex-col gap-5">
    <BarraSuperior titulo="Instrutores" subtitulo="Cadastros, documentos e disponibilidade."
      acoes={<>
        <Botao tipo="secundario" onClick={() => void copiarLink()}>Copiar link de cadastro<Copy /></Botao>
        <Botao tipo="secundario" onClick={() => setAgenda((v) => !v)}>{agenda ? 'Lista' : 'Disponibilidade'}<CalendarDays /></Botao>
        <Botao onClick={() => setCadastrando(true)}>Cadastrar<Plus /></Botao>
      </>}
      notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />} />
    {credenciais}

    {agenda ? <CompanyAvailability data={data} /> : <>
      {semRegistro.length ? <Faixa tom="perigo" titulo={semRegistro.length === 1 ? '1 instrutor sem registro MTE/RE' : `${semRegistro.length} instrutores sem registro MTE/RE`}>Nos documentos {semRegistro.length === 1 ? 'dele' : 'deles'} sai só a assinatura da responsável técnica: {semRegistro.map((i) => i.name).join(', ')}.</Faixa> : null}
      <Abas rotulo="Situação dos instrutores" ativa={aba} onChange={setAba} abas={[
        { id: 'ativos', rotulo: 'Ativos', contador: data.instructors.filter(regras.ativos).length },
        { id: 'aguardando', rotulo: 'Aguardando aprovação', contador: data.instructors.filter(regras.aguardando).length },
        { id: 'documentos', rotulo: 'Documentos para avaliar', contador: data.instructors.filter(regras.documentos).length },
        { id: 'inativos', rotulo: 'Inativos', contador: data.instructors.filter(regras.inativos).length },
      ]} />
      {lista.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[820px]')}>
        <thead className={tb.cabeca}><tr><th className={tb.th}>Instrutor</th><th className={tb.th}>Normas</th><th className={tb.th}>Turmas no mês</th><th className={tb.th}>Disponível</th><th className={tb.th}>Documentos</th></tr></thead>
        <tbody>{lista.map((i) => {
          const docs = situacaoDosDocumentos(docsDe(i.id));
          const livres = livresNos30(i.id);
          return <tr key={i.id} onClick={() => { setAberto(i.id); setAbaFicha(regras.documentos(i) ? 'documentos' : 'dados'); }} className={cn(tb.linha, tb.linhaClicavel)}>
            <td className={tb.td}><button type="button" onClick={(e) => { e.stopPropagation(); setAberto(i.id); }} className="flex items-center gap-3 text-left ds-foco">
              <Avatar nome={i.name} foto={urlDaFoto('instrutor', i.id, i.photo_key)} tamanho={36} />
              <span className="min-w-0"><span className="block truncate ds-body-s font-medium">{i.name}</span><span className="flex items-center gap-1.5 ds-caption text-ds-texto-2">{i.base_city || 'Sem cidade base'}{!registroValido(i.professional_registry) ? <span className="inline-flex items-center gap-1 text-ds-perigo"><TriangleAlert className="size-3" />sem registro</span> : null}</span></span>
            </button></td>
            <td className={tb.td}>{normasCurtas(i.specialties)}</td>
            <td className={tb.td}>{turmasNoMes(i.id)}</td>
            <td className={cn(tb.td, !livres && 'text-ds-texto-2')}>{livres ? `${livres} ${livres === 1 ? 'dia' : 'dias'} nos próx. 30` : 'Não informou'}</td>
            <td className={tb.td}><Tag tom={docs.tom}>{docs.texto}</Tag></td>
          </tr>;
        })}</tbody>
      </table></div></div> : <Vazio icone={<UserRound />} titulo="Ninguém nesta aba" texto={aba === 'ativos' ? 'Cadastre um instrutor ou mande o link de cadastro.' : 'Quando houver, aparece aqui.'} />}
    </>}

    <PainelLateral aberto={cadastrando} onFechar={() => setCadastrando(false)} largura={520} sobretitulo="Cadastro" titulo="Novo instrutor" subtitulo="O registro MTE/RE autoriza a assinatura dele nos certificados."
      acoes={<><Botao tipo="secundario" onClick={() => setCadastrando(false)}>Cancelar</Botao><Botao type="submit" form="novo-instrutor" className="flex-1" disabled={salvando}>{salvando ? <Loader2 className="animate-spin" /> : null}Salvar e gerar acesso</Botao></>}>
      <form id="novo-instrutor" onSubmit={cadastrar} className="grid gap-4 sm:grid-cols-2">
        {([['name', 'Nome completo'], ['document', 'CPF'], ['email', 'E-mail (login)'], ['phone', 'Telefone / WhatsApp'], ['professionalRegistry', 'Registro MTE / RE'], ['baseCity', 'Cidade base'], ['specialties', 'Especialidades / NRs']] as const).map(([chave, rotulo]) =>
          <Campo key={chave} rotulo={rotulo} className={chave === 'specialties' ? 'sm:col-span-2' : ''}><input required type={chave === 'email' ? 'email' : 'text'} value={novo[chave]} onChange={(e) => { const valor = e.target.value; setNovo((atual) => ({ ...atual, [chave]: valor })); }} placeholder={chave === 'specialties' ? 'Ex.: NR 10, NR 23, NR 35' : undefined} className={campoClasses} /></Campo>)}
      </form>
    </PainelLateral>
  </div>;
}
