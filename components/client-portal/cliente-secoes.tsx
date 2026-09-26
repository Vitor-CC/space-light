'use client';

import { Award, Bell, Building2, CheckCircle2, Download, Eye, FileText, ImageIcon, Loader2, MessageCircle, Search, Send } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { BotaoZip, NORMAS_PEDIDO, dataCurta, diasAte, situacaoCertificado, slug, type Secao } from '@/components/client-portal/cliente-util';
import { areaClasses, botaoClasses, BotaoIcone, Campo, campoClasses, Cartao, CartaoCabecalho, Faixa, LinhaArquivo, selectClasses, tabelaClasses as tb, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import { Segmentado } from '@/components/ds/interativo';
import type { ClientPortalData } from '@/lib/client-portal-data';
import { cn } from '@/lib/utils';

/* ─── Certificados (todas as turmas) ────────────────────────────────────── */

export function Certificados({ data, abrirTurma }: { data: ClientPortalData; abrirTurma: (id: string) => void }) {
  const [turmaId, setTurmaId] = useState('todas');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const turmas = useMemo(() => new Map(data.trainings.map((t) => [t.id, t])), [data.trainings]);
  const linhas = data.participants.filter((p) => {
    const t = turmas.get(p.trainingId);
    if (!t || t.status !== 'Concluído') return false;
    if (turmaId !== 'todas' && p.trainingId !== turmaId) return false;
    const q = busca.trim().toLowerCase();
    return !q || p.fullName.toLowerCase().includes(q) || `${t.nr} ${t.title}`.toLowerCase().includes(q);
  });
  const ordemDaTurma = new Map(data.trainings.map((t, i) => [t.id, i]));
  linhas.sort((x, y) => (ordemDaTurma.get(x.trainingId) ?? 0) - (ordemDaTurma.get(y.trainingId) ?? 0) || x.fullName.localeCompare(y.fullName, 'pt-BR'));
  const baixaveis = linhas.filter((p) => p.certificateFileId);
  const escolhidos = baixaveis.filter((p) => selecionados.has(p.id));
  const disponiveis = data.participants.filter((p) => p.certificateFileId).length;
  const alternar = (id: string) => setSelecionados((atual) => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });
  const todos = baixaveis.length > 0 && escolhidos.length === baixaveis.length;

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Certificados" subtitulo={`${disponiveis} ${disponiveis === 1 ? 'certificado pronto' : 'certificados prontos'} para download. Cada participante tem o seu PDF.`} />
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar participante ou treinamento" className={cn(campoClasses, 'pl-10')} /></label>
      <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} aria-label="Filtrar por turma" className={cn(selectClasses, 'sm:max-w-xs')}>
        <option value="todas">Todas as turmas concluídas</option>
        {data.trainings.filter((t) => t.status === 'Concluído').map((t) => <option key={t.id} value={t.id}>{t.code} · {t.nr} · {t.title}</option>)}
      </select>
    </div>
    {linhas.length === 0 ? <Vazio icone={<Award />} titulo="Nenhum certificado por aqui ainda" texto="Os certificados aparecem quando a turma é concluída e a Space Light publica os documentos." /> : <div className={tb.moldura}>
      {escolhidos.length ? <div className="flex flex-wrap items-center gap-3 bg-ds-amarelo-suave px-5 py-3"><span className="flex-1 ds-body-s font-medium">{escolhidos.length} {escolhidos.length === 1 ? 'selecionado' : 'selecionados'}</span><BotaoZip tipo="escuro" rotulo="Baixar selecionados" entries={escolhidos.map((p) => ({ id: p.certificateFileId as string, name: `${slug(p.fullName)}.pdf` }))} zipName="certificados" /></div> : null}
      <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[720px]')}>
        <thead className={tb.cabeca}><tr>
          <th className={cn(tb.th, 'w-12')}><input type="checkbox" aria-label="Selecionar todos" checked={todos} onChange={() => setSelecionados(todos ? new Set() : new Set(baixaveis.map((p) => p.id)))} className="size-[18px] accent-ds-inverso" /></th>
          <th className={tb.th}>Participante</th><th className={tb.th}>Turma</th><th className={tb.th}>Status</th><th className={cn(tb.th, 'w-12')}><span className="sr-only">Baixar</span></th>
        </tr></thead>
        <tbody>{linhas.map((p) => {
          const t = turmas.get(p.trainingId);
          const sit = situacaoCertificado(p, t);
          return <tr key={p.id} className={tb.linha}>
            <td className={tb.td}><input type="checkbox" disabled={!p.certificateFileId} aria-label={`Selecionar ${p.fullName}`} checked={selecionados.has(p.id)} onChange={() => alternar(p.id)} className="size-[18px] accent-ds-inverso disabled:opacity-30" /></td>
            <td className={cn(tb.td, 'font-medium')}>{p.fullName}<span className="block ds-caption text-ds-texto-2">{p.jobTitle || '—'}</span></td>
            <td className={tb.td}><button type="button" onClick={() => t && abrirTurma(t.id)} className="text-left hover:underline underline-offset-4"><span className="ds-mono text-ds-texto-2">{t?.code}</span> · {t?.nr}</button></td>
            <td className={tb.td}><Tag tom={sit.tom}>{sit.texto}</Tag></td>
            <td className={tb.td}>{p.certificateFileId ? <a href={`/api/files/${p.certificateFileId}?download=1`} aria-label={`Baixar certificado de ${p.fullName}`} className="inline-flex rounded p-1 hover:bg-ds-muted"><Download className="size-[18px]" /></a> : null}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>}
  </div>;
}

/* ─── Documentos e fotos (todas as turmas) ─────────────────────────────── */

export function Documentos({ data }: { data: ClientPortalData }) {
  const [tipo, setTipo] = useState<'docs' | 'fotos'>('docs');
  const [turmaId, setTurmaId] = useState('todas');
  const turmas = useMemo(() => new Map(data.trainings.map((t) => [t.id, t])), [data.trainings]);
  const docs = data.documents.filter((d) => !d.isCertificate && (turmaId === 'todas' || d.trainingId === turmaId));
  const fotos = data.photos.filter((f) => turmaId === 'todas' || f.trainingId === turmaId);
  const nomeZip = turmaId === 'todas' ? `${tipo === 'docs' ? 'documentos' : 'fotos'}-space-light` : slug(`${turmas.get(turmaId)?.nr}-${turmas.get(turmaId)?.title}`);

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Documentos" subtitulo="Listas de presença, relatórios e fotos publicados pela Space Light, por turma." acoes={<BotaoZip entries={tipo === 'docs' ? docs.map((d) => ({ id: d.id, name: d.title })) : fotos.map((f) => ({ id: f.id, name: f.alt }))} zipName={nomeZip} rotulo={turmaId === 'todas' ? 'Baixar tudo (.zip)' : 'Baixar esta turma (.zip)'} />} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Segmentado rotulo="Tipo de arquivo" ativa={tipo} onChange={setTipo} className="sm:w-72" opcoes={[{ id: 'docs', rotulo: `Documentos · ${data.documents.filter((d) => !d.isCertificate).length}`, icone: <FileText /> }, { id: 'fotos', rotulo: `Fotos · ${data.photos.length}`, icone: <ImageIcon /> }]} />
      <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} aria-label="Filtrar por turma" className={cn(selectClasses, 'sm:max-w-sm')}>
        <option value="todas">Todas as turmas</option>
        {data.trainings.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.nr} · {t.title}</option>)}
      </select>
    </div>
    {tipo === 'docs'
      ? docs.length ? <Cartao className="px-5 pb-2 sm:px-6">{docs.map((d) => { const t = d.trainingId ? turmas.get(d.trainingId) : undefined; return <LinhaArquivo key={d.id} className="first:border-t-0" icone={<FileText />} titulo={d.title} detalhe={`${t ? `${t.code} · ${t.nr} · ` : ''}${d.format} · ${d.size} · ${d.updatedAt}`} acoes={<><a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Eye className="size-4" /></a><a href={`/api/files/${d.id}?download=1`} aria-label={`Baixar ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Download className="size-4" /></a></>} />; })}</Cartao> : <Vazio icone={<FileText />} titulo="Nenhum documento publicado" texto="Os documentos aparecem aqui assim que a Space Light publicar." />
      : fotos.length ? <Galeria fotos={fotos} /> : <Vazio icone={<ImageIcon />} titulo="Nenhuma foto publicada" texto="As fotos da prática aparecem aqui depois da aula." />}
  </div>;
}

export function Galeria({ fotos }: { fotos: ClientPortalData['photos'] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {fotos.map((foto) => <figure key={foto.id} className="group overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie">
      <a href={foto.src} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden bg-ds-muted" aria-label={`Ver ${foto.alt} em tamanho cheio`}>
        <Image src={foto.src} alt={foto.alt} fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
      </a>
      <figcaption className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1"><p className="truncate ds-body-s font-medium" title={foto.alt}>{foto.alt}</p><p className="ds-caption text-ds-texto-2">{foto.dateLabel}</p></div>
        <a href={`${foto.src}?download=1`} aria-label={`Baixar ${foto.alt}`} className="rounded p-1.5 hover:bg-ds-muted"><Download className="size-4" /></a>
      </figcaption>
    </figure>)}
  </div>;
}

/* ─── Solicitar treinamento ────────────────────────────────────────────── */

const statusPedido: Record<string, { tom: 'sinal' | 'sucesso' | 'neutro'; texto: string }> = {
  open: { tom: 'sinal', texto: 'Em análise' },
  scheduled: { tom: 'sucesso', texto: 'Agendada' },
  declined: { tom: 'neutro', texto: 'Não atendida' },
};

export function Solicitar({ data, baseId, aoEnviar }: { data: ClientPortalData; baseId: string | null; aoEnviar: (texto: string) => void }) {
  const router = useRouter();
  const base = baseId ? data.trainings.find((t) => t.id === baseId) : undefined;
  const pessoasBase = base ? data.participants.filter((p) => p.trainingId === base.id).length || base.participantCount : 0;
  const inicial = () => ({ nr: base ? (NORMAS_PEDIDO.includes(base.nr) ? base.nr : 'Outra') : '', title: base ? `Reciclagem · ${base.title}` : '', participants: pessoasBase ? String(pessoasBase) : '', preferredPeriod: '', location: base?.location ?? data.organization.unit, notes: '' });
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  // Trocar a turma de origem (vindo de outra reciclagem) repreenche o formulário.
  const [baseAnterior, setBaseAnterior] = useState(baseId);
  if (baseAnterior !== baseId) { setBaseAnterior(baseId); setForm(inicial()); }

  async function enviar(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await fetch('/api/client/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, participants: Number(form.participants || 0), basedOnTrainingId: base?.id ?? null }) });
      const payload = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(payload.error || 'Não foi possível enviar.');
      aoEnviar('Solicitação enviada. A Space Light retorna em até 1 dia útil.');
      setForm({ nr: '', title: '', participants: '', preferredPeriod: '', location: data.organization.unit, notes: '' });
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Solicitar treinamento" subtitulo="Peça uma nova turma. A equipe da Space Light confirma datas e valores com você." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Cartao className="p-5 sm:p-7">
        {base ? <Faixa tom="sinal" className="mb-5">Dados preenchidos a partir da turma <strong className="font-semibold">{base.code} · {base.nr}</strong>. Ajuste o que precisar.</Faixa> : null}
        <form onSubmit={enviar} className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Norma *"><select required value={form.nr} onChange={(e) => setForm({ ...form, nr: e.target.value })} className={selectClasses}><option value="" disabled>Selecione</option>{NORMAS_PEDIDO.map((n) => <option key={n} value={n}>{n}</option>)}</select></Campo>
          <Campo rotulo="Participantes (estimativa)"><input inputMode="numeric" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="Ex.: 20" className={campoClasses} /></Campo>
          <Campo rotulo="Treinamento ou assunto" className="sm:col-span-2"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Formação de brigada · reciclagem" className={campoClasses} /></Campo>
          <Campo rotulo="Período preferido"><input value={form.preferredPeriod} onChange={(e) => setForm({ ...form, preferredPeriod: e.target.value })} placeholder="Ex.: novembro, manhãs" className={campoClasses} /></Campo>
          <Campo rotulo="Local"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Unidade ou endereço" className={campoClasses} /></Campo>
          <Campo rotulo="Observações" className="sm:col-span-2"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Turnos, equipes, necessidades específicas" className={areaClasses} /></Campo>
          {erro ? <Faixa tom="perigo" className="sm:col-span-2">{erro}</Faixa> : null}
          <div className="sm:col-span-2"><button type="submit" disabled={enviando} className={botaoClasses('primario', 'M')}>{enviando ? 'Enviando…' : 'Enviar solicitação'}{enviando ? <Loader2 className="animate-spin" /> : <Send />}</button></div>
        </form>
      </Cartao>
      <Cartao className="h-fit">
        <CartaoCabecalho titulo="Suas solicitações" />
        <div className="px-5 pb-3 sm:px-6">
          {data.requests.length ? data.requests.map((r) => { const st = statusPedido[r.status] ?? statusPedido.open; return <div key={r.id} className="flex items-center gap-3 border-t border-ds-borda py-3">
            <div className="min-w-0 flex-1"><p className="truncate ds-body-s font-medium">{r.nr}{r.title ? ` · ${r.title}` : ''}</p><p className="ds-caption text-ds-texto-2">{dataCurta(r.createdAt)}{r.participants ? ` · ${r.participants} pessoas` : ''}</p></div>
            <Tag tom={st.tom}>{st.texto}</Tag>
          </div>; }) : <p className="border-t border-ds-borda py-4 ds-body-s text-ds-texto-2">Nenhuma solicitação ainda.</p>}
        </div>
      </Cartao>
    </div>
  </div>;
}

/* ─── Perfil da empresa ─────────────────────────────────────────────────── */

export function Perfil({ data }: { data: ClientPortalData }) {
  const org = data.organization;
  const router = useRouter();
  const [draft, setDraft] = useState({ unit: org.unit, contactName: org.contactName, contactPhone: org.phone });
  const [saving, setSaving] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'perigo'; texto: string } | null>(null);
  const mudou = draft.unit !== org.unit || draft.contactName !== org.contactName || draft.contactPhone !== org.phone;

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setAviso(null);
    try {
      const response = await fetch('/api/client/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar.');
      setAviso({ tom: 'sucesso', texto: 'Dados atualizados.' });
      router.refresh();
    } catch (error) {
      setAviso({ tom: 'perigo', texto: error instanceof Error ? error.message : 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Perfil da empresa" subtitulo="Dados cadastrais vinculados a este acesso." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Cartao className="p-5 sm:p-7">
        <div className="flex items-center gap-4 border-b border-ds-borda pb-5">
          <span className="flex size-12 items-center justify-center rounded-lg bg-ds-amarelo-suave"><Building2 className="size-6" /></span>
          <div><span className="ds-caps text-ds-texto-2">Empresa contratante</span><h2 className="ds-h4">{org.displayName}</h2></div>
        </div>
        <form onSubmit={salvar} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Unidade / cidade" className="sm:col-span-2"><input required value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className={campoClasses} /></Campo>
          <Campo rotulo="Responsável"><input required value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} className={campoClasses} /></Campo>
          <Campo rotulo="Telefone"><input value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} placeholder="(11) 90000-0000" className={campoClasses} /></Campo>
          {aviso ? <Faixa tom={aviso.tom} className="sm:col-span-2">{aviso.texto}</Faixa> : null}
          <div className="sm:col-span-2"><button type="submit" disabled={!mudou || saving} className={botaoClasses('primario', 'M')}>{saving ? 'Salvando…' : 'Salvar alterações'}{saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}</button></div>
        </form>
        <dl className="mt-8 border-t border-ds-borda pt-5">
          <dt className="ds-caps text-ds-texto-2">Alterados pela Space Light</dt>
          {[['Razão social', org.legalName], ['CNPJ', org.document], ['E-mail de contato', org.email]].map(([rotulo, valor]) => <div key={rotulo} className="grid gap-1 border-t border-ds-borda py-3 first-of-type:mt-3 sm:grid-cols-[160px_1fr]"><dt className="ds-body-s text-ds-texto-2">{rotulo}</dt><dd className="ds-body-s font-medium">{valor}</dd></div>)}
        </dl>
      </Cartao>
      <Cartao className="h-fit p-5 sm:p-6">
        <h2 className="ds-h4">Precisa mudar razão social, CNPJ ou e-mail?</h2>
        <p className="mt-2 ds-body-s text-ds-texto-2">Razão social e CNPJ saem impressos na lista de presença, e o login é o nome de usuário criado pela equipe. Por isso a mudança passa pela Space Light.</p>
        <a href="https://wa.me/5511941318646?text=Ol%C3%A1%2C%20preciso%20atualizar%20um%20dado%20cadastral%20da%20minha%20empresa." target="_blank" rel="noreferrer" className={botaoClasses('secundario', 'M', 'mt-5 w-full')}><MessageCircle />Falar com a Space Light</a>
      </Cartao>
    </div>
  </div>;
}

/* ─── Notificações (sino) ───────────────────────────────────────────────── */

type Notificacao = { id: string; quando: string; titulo: string; texto: string; destino: { secao: Secao; turma?: string } };

const CHAVE_VISTO = 'sl-cliente-notificacoes-visto';

function notificacoes(data: ClientPortalData): Notificacao[] {
  const itens: Notificacao[] = [];
  const turmas = new Map(data.trainings.map((t) => [t.id, t]));
  const trintaDias = Date.now() - 30 * 86_400_000;
  const recente = (quando: string) => new Date(quando.includes('T') ? quando : `${quando.replace(' ', 'T')}Z`).getTime() >= trintaDias;
  // Certificados publicados: um aviso por turma, na data do PDF mais novo.
  const porTurma = new Map<string, string>();
  for (const d of data.documents) if (d.isCertificate && d.trainingId && recente(d.createdAt)) porTurma.set(d.trainingId, d.createdAt > (porTurma.get(d.trainingId) ?? '') ? d.createdAt : porTurma.get(d.trainingId)!);
  for (const [tid, quando] of porTurma) { const t = turmas.get(tid); if (t) itens.push({ id: `cert-${tid}`, quando, titulo: 'Certificados disponíveis', texto: `${t.nr} · ${t.title}`, destino: { secao: 'trainings', turma: tid } }); }
  const novos = new Map<string, { quando: string; n: number }>();
  for (const f of [...data.photos, ...data.documents.filter((d) => !d.isCertificate)]) {
    if (!f.trainingId || !recente(f.createdAt)) continue;
    const atual = novos.get(f.trainingId) ?? { quando: '', n: 0 };
    novos.set(f.trainingId, { quando: f.createdAt > atual.quando ? f.createdAt : atual.quando, n: atual.n + 1 });
  }
  for (const [tid, info] of novos) { const t = turmas.get(tid); if (t) itens.push({ id: `arq-${tid}-${info.n}`, quando: info.quando, titulo: `${info.n} ${info.n === 1 ? 'arquivo novo' : 'arquivos novos'}`, texto: `${t.nr} · ${t.title}`, destino: { secao: 'trainings', turma: tid } }); }
  for (const t of data.trainings) {
    if (!t.expiresAt) continue;
    const dias = diasAte(t.expiresAt);
    if (dias <= 90) itens.push({ id: `venc-${t.id}`, quando: new Date().toISOString(), titulo: dias < 0 ? 'Certificados vencidos' : `Reciclagem em ${dias} dias`, texto: `${t.nr} · ${t.title}`, destino: { secao: 'request', turma: t.id } });
  }
  for (const r of data.requests) if (r.status !== 'open' && recente(r.createdAt)) itens.push({ id: `ped-${r.id}-${r.status}`, quando: r.createdAt, titulo: r.status === 'scheduled' ? 'Solicitação agendada' : 'Solicitação respondida', texto: `${r.nr}${r.title ? ` · ${r.title}` : ''}`, destino: { secao: 'request' } });
  return itens.sort((a, b) => b.quando.localeCompare(a.quando));
}

export function Sino({ data, navegar }: { data: ClientPortalData; navegar: (secao: Secao, turma?: string) => void }) {
  const itens = useMemo(() => notificacoes(data), [data]);
  const [aberto, setAberto] = useState(false);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { setVistos(new Set(JSON.parse(window.localStorage.getItem(CHAVE_VISTO) ?? '[]') as string[])); } catch { /* sem armazenamento: tudo conta como novo */ }
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto]);
  const naoLidas = itens.filter((i) => !vistos.has(i.id)).length;
  function abrir() {
    setAberto((v) => !v);
    const todos = new Set([...vistos, ...itens.map((i) => i.id)]);
    setVistos(todos);
    try { window.localStorage.setItem(CHAVE_VISTO, JSON.stringify([...todos].slice(-200))); } catch { /* ignora */ }
  }
  return <div ref={ref} className="relative">
    <BotaoIcone rotulo={naoLidas ? `Notificações (${naoLidas} novas)` : 'Notificações'} onClick={abrir} aria-expanded={aberto}><Bell /></BotaoIcone>
    {naoLidas ? <span aria-hidden className="pointer-events-none absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-ds-perigo px-1 ds-caption font-medium text-ds-texto-inv">{naoLidas}</span> : null}
    {aberto ? <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie shadow-xl">
      <div className="border-b border-ds-borda px-4 py-3 ds-h4 text-base">Notificações</div>
      {itens.length ? <ul className="max-h-96 overflow-y-auto">{itens.map((n) => <li key={n.id}><button type="button" onClick={() => { setAberto(false); navegar(n.destino.secao, n.destino.turma); }} className="flex w-full flex-col items-start gap-0.5 border-b border-ds-borda px-4 py-3 text-left last:border-b-0 hover:bg-ds-muted"><span className="ds-body-s font-medium">{n.titulo}</span><span className="ds-caption text-ds-texto-2">{n.texto}</span></button></li>)}</ul> : <p className="px-4 py-6 ds-body-s text-ds-texto-2">Nada novo por enquanto.</p>}
    </div> : null}
  </div>;
}

