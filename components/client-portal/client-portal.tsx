'use client';

import { ArrowRight, Award, CalendarDays, ChevronRight, Clock3, Download, Eye, FileText, GraduationCap, ImageIcon, LayoutGrid, MapPin, Plus, Search, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Certificados, Documentos, Galeria, Perfil, Sino, Solicitar } from '@/components/client-portal/cliente-secoes';
import { BotaoZip, dataCurta, diasAte, identificacaoDaPessoa, rotuloDoStatus, situacaoCertificado, slug, tomDoStatus, vencimento, type Secao } from '@/components/client-portal/cliente-util';
import { BarraProgresso, botaoClasses, campoClasses, Cartao, CartaoCabecalho, Indicador, LinhaArquivo, Meta, Pilula, tabelaClasses as tb, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import { Abas, Aviso, PortalShell, useAviso } from '@/components/ds/interativo';
import type { ClientPortalData, ClientTraining } from '@/lib/client-portal-data';
import { clientePedeLogin } from '@/lib/login-do-participante';
import { cn } from '@/lib/utils';

export function ClientPortal({ data, user }: { data: ClientPortalData; user: { name: string; email: string } }) {
  const [secao, setSecao] = useState<Secao>('dashboard');
  const [turmaAberta, setTurmaAberta] = useState<string | null>(null);
  const [baseDoPedido, setBaseDoPedido] = useState<string | null>(null);
  const [aviso, setAviso] = useAviso();

  const navegar = (destino: Secao, turma?: string) => {
    setSecao(destino);
    setTurmaAberta(destino === 'trainings' ? turma ?? null : null);
    setBaseDoPedido(destino === 'request' ? turma ?? null : null);
    window.scrollTo({ top: 0 });
  };
  const abrirTurma = (id: string) => navegar('trainings', id);

  const itens = [
    { id: 'dashboard' as const, rotulo: 'Visão geral', icone: <LayoutGrid /> },
    { id: 'trainings' as const, rotulo: 'Turmas', icone: <CalendarDays /> },
    { id: 'certificates' as const, rotulo: 'Certificados', icone: <Award /> },
    { id: 'documents' as const, rotulo: 'Documentos', icone: <FileText /> },
    { id: 'request' as const, rotulo: 'Solicitar treinamento', icone: <Plus /> },
  ];

  let conteudo: React.ReactNode;
  if (secao === 'dashboard') conteudo = <VisaoGeral data={data} nome={user.name} navegar={navegar} abrirTurma={abrirTurma} />;
  else if (secao === 'trainings') conteudo = turmaAberta ? <DetalheTurma data={data} turmaId={turmaAberta} voltar={() => navegar('trainings')} /> : <Turmas data={data} abrirTurma={abrirTurma} />;
  else if (secao === 'certificates') conteudo = <Certificados data={data} abrirTurma={abrirTurma} />;
  else if (secao === 'documents') conteudo = <Documentos data={data} />;
  else if (secao === 'request') conteudo = <Solicitar data={data} baseId={baseDoPedido} aoEnviar={setAviso} />;
  else conteudo = <Perfil data={data} />;

  return <PortalShell area="Área do cliente" itens={itens} ativo={secao === 'profile' ? null : secao} onNavegar={(id) => navegar(id)} usuario={{ nome: user.name, detalhe: data.organization.displayName }} onUsuario={() => navegar('profile')}>
    <div key={`${secao}-${turmaAberta ?? ''}`}>{conteudo}</div>
    <Aviso texto={aviso} onFechar={() => setAviso('')} />
  </PortalShell>;
}

/* ─── Visão geral ───────────────────────────────────────────────────────── */

function VisaoGeral({ data, nome, navegar, abrirTurma }: { data: ClientPortalData; nome: string; navegar: (s: Secao, turma?: string) => void; abrirTurma: (id: string) => void }) {
  const ano = new Date().getFullYear();
  const doAno = data.trainings.filter((t) => t.date.startsWith(String(ano)));
  const ultima = data.trainings.find((t) => t.status === 'Concluído');
  const concluidas = new Set(data.trainings.filter((t) => t.status === 'Concluído').map((t) => t.id));
  const treinados = data.participants.filter((p) => concluidas.has(p.trainingId) && p.daysPresent >= p.daysTotal && p.daysTotal > 0);
  const normas = new Set(data.trainings.filter((t) => concluidas.has(t.id)).map((t) => t.nr));
  const certificados = data.participants.filter((p) => p.certificateFileId).length;
  const comValidade = data.trainings.filter((t) => t.expiresAt).sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  // Vencidas há mais de um ano saem da lista: aí já é turma nova, não reciclagem.
  const proximas = comValidade.filter((t) => diasAte(t.expiresAt as string) >= -365);
  const em90 = proximas.filter((t) => diasAte(t.expiresAt as string) <= 90);
  const maisUrgente = em90[0] ?? proximas[0];

  return <div className="flex flex-col gap-7">
    <TopoDePagina titulo={`Olá, ${nome.split(' ')[0]}`} subtitulo="Resumo dos treinamentos da sua empresa com a Space Light." acoes={<><BuscaRapida data={data} abrirTurma={abrirTurma} /><Sino data={data} navegar={navegar} /></>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador rotulo={`Turmas em ${ano}`} valor={doAno.length} apoio={ultima ? `última concluída em ${dataCurta(ultima.lastDate)}` : 'nenhuma concluída ainda'} onClick={() => navegar('trainings')} />
      <Indicador rotulo="Participantes treinados" valor={treinados.length} apoio={normas.size ? `em ${normas.size} ${normas.size === 1 ? 'norma' : 'normas diferentes'}` : 'aguardando a primeira turma'} onClick={() => navegar('trainings')} />
      <Indicador rotulo="Certificados disponíveis" valor={certificados} apoio="prontos para download" onClick={() => navegar('certificates')} />
      <Indicador rotulo="Reciclagens em 90 dias" valor={`${em90.length} ${em90.length === 1 ? 'turma' : 'turmas'}`} apoio={comValidade.length ? 'planeje antes do vencimento' : 'validade ainda não informada'} onClick={() => maisUrgente ? navegar('request', maisUrgente.id) : navegar('request')} />
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Cartao className="overflow-hidden">
        <CartaoCabecalho titulo="Turmas recentes" acao={<button type="button" onClick={() => navegar('trainings')} className={botaoClasses('link', 'M')}>Ver todas <ArrowRight /></button>} />
        {data.trainings.length ? <TabelaTurmas turmas={data.trainings.slice(0, 6)} abrirTurma={abrirTurma} /> : <div className="px-6 pb-6"><Vazio icone={<GraduationCap />} titulo="Nenhuma turma ainda" texto="As turmas aparecem aqui assim que a Space Light agendar." /></div>}
      </Cartao>
      <div className="flex flex-col gap-4">
        <Cartao>
          <CartaoCabecalho icone={<Clock3 />} titulo="Próximas reciclagens" className="pb-2" />
          <div className="px-5 pb-3 sm:px-6">
            {proximas.length ? proximas.slice(0, 4).map((t) => { const v = vencimento(t.expiresAt as string); return <button key={t.id} type="button" onClick={() => navegar('request', t.id)} className="flex w-full items-center gap-3 border-t border-ds-borda py-3 text-left hover:opacity-80">
              <span className="min-w-0 flex-1"><span className="block truncate ds-body-s font-medium">{t.nr} · {t.title}</span><span className="block ds-caption text-ds-texto-2">{t.participantCount} {t.participantCount === 1 ? 'pessoa' : 'pessoas'}</span></span>
              <Tag tom={v.tom}>{v.texto}</Tag>
            </button>; }) : <p className="border-t border-ds-borda py-4 ds-body-s text-ds-texto-2">A validade dos certificados aparece aqui quando a Space Light informar.</p>}
          </div>
        </Cartao>
        <div className="flex flex-col items-start gap-3.5 rounded-lg p-6 ds-degrade">
          <h2 className="ds-h4">Reciclagem chegando?</h2>
          <p className="ds-body-s">Solicite a próxima turma com os dados já preenchidos pelo histórico.</p>
          <button type="button" onClick={() => navegar('request', maisUrgente?.id)} className={botaoClasses('escuro', 'M')}>Solicitar turma <ArrowRight /></button>
        </div>
      </div>
    </div>
  </div>;
}

function BuscaRapida({ data, abrirTurma }: { data: ClientPortalData; abrirTurma: (id: string) => void }) {
  const [q, setQ] = useState('');
  const termo = q.trim().toLowerCase();
  const resultados = useMemo(() => {
    if (termo.length < 2) return [];
    const turmas = data.trainings.filter((t) => `${t.code} ${t.nr} ${t.title}`.toLowerCase().includes(termo)).map((t) => ({ id: `t-${t.id}`, turma: t.id, titulo: `${t.nr} · ${t.title}`, detalhe: `Turma ${t.code} · ${dataCurta(t.date)}` }));
    const pessoas = data.participants.filter((p) => p.fullName.toLowerCase().includes(termo)).map((p) => { const t = data.trainings.find((x) => x.id === p.trainingId); return { id: `p-${p.id}`, turma: p.trainingId, titulo: p.fullName, detalhe: t ? `${t.nr} · turma ${t.code}` : '' }; });
    return [...turmas, ...pessoas].slice(0, 8);
  }, [termo, data]);
  return <div className="relative w-full sm:w-[300px]">
    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" />
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar turma, colaborador ou NR" aria-label="Buscar turma, colaborador ou NR" className={cn(campoClasses, 'min-h-10 py-2 pl-10 ds-body-s')} />
    {termo.length >= 2 ? <div className="absolute right-0 left-0 z-40 mt-2 overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie shadow-xl">
      {resultados.length ? resultados.map((r) => <button key={r.id} type="button" onClick={() => { setQ(''); abrirTurma(r.turma); }} className="flex w-full flex-col items-start border-b border-ds-borda px-4 py-2.5 text-left last:border-b-0 hover:bg-ds-muted"><span className="ds-body-s font-medium">{r.titulo}</span><span className="ds-caption text-ds-texto-2">{r.detalhe}</span></button>) : <p className="px-4 py-3 ds-body-s text-ds-texto-2">Nada encontrado.</p>}
    </div> : null}
  </div>;
}

function TabelaTurmas({ turmas, abrirTurma }: { turmas: ClientTraining[]; abrirTurma: (id: string) => void }) {
  return <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[600px]')}>
    <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Treinamento</th><th className={tb.th}>Data</th><th className={tb.th}>Pessoas</th><th className={tb.th}>Status</th><th className={cn(tb.th, 'w-10')}><span className="sr-only">Abrir</span></th></tr></thead>
    <tbody>{turmas.map((t) => <tr key={t.id} onClick={() => abrirTurma(t.id)} className={cn(tb.linha, tb.linhaClicavel)}>
      <td className={tb.td}><span className={tb.codigo}>{t.code}</span></td>
      <td className={cn(tb.td, 'w-full max-w-0 font-medium')}><button type="button" onClick={(e) => { e.stopPropagation(); abrirTurma(t.id); }} title={`${t.nr} · ${t.title}`} className="block w-full truncate text-left ds-foco">{t.nr} · {t.title}</button></td>
      <td className={cn(tb.td, 'whitespace-nowrap')}>{dataCurta(t.date)}</td>
      <td className={tb.td}>{t.participantCount}</td>
      <td className={tb.td}><Tag tom={tomDoStatus(t.status)}>{rotuloDoStatus(t.status)}</Tag></td>
      <td className={tb.td}><ChevronRight className="size-[18px]" /></td>
    </tr>)}</tbody>
  </table></div>;
}

/* ─── Turmas ────────────────────────────────────────────────────────────── */

function Turmas({ data, abrirTurma }: { data: ClientPortalData; abrirTurma: (id: string) => void }) {
  const [filtro, setFiltro] = useState<'todas' | ClientTraining['status']>('todas');
  const [busca, setBusca] = useState('');
  const contar = (s: ClientTraining['status']) => data.trainings.filter((t) => t.status === s).length;
  const lista = data.trainings.filter((t) => (filtro === 'todas' || t.status === filtro) && `${t.code} ${t.nr} ${t.title}`.toLowerCase().includes(busca.trim().toLowerCase()));
  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Turmas" subtitulo="Todas as turmas da sua empresa com a Space Light: presença, fotos, documentos e certificados." />
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Pilula ativa={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas · {data.trainings.length}</Pilula>
        <Pilula ativa={filtro === 'Agendado'} onClick={() => setFiltro('Agendado')}>Agendadas · {contar('Agendado')}</Pilula>
        <Pilula ativa={filtro === 'Em andamento'} onClick={() => setFiltro('Em andamento')}>Em andamento · {contar('Em andamento')}</Pilula>
        <Pilula ativa={filtro === 'Concluído'} onClick={() => setFiltro('Concluído')}>Concluídas · {contar('Concluído')}</Pilula>
      </div>
      <label className="relative lg:ml-auto lg:w-72"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar turma ou NR" className={cn(campoClasses, 'min-h-10 py-2 pl-10 ds-body-s')} /></label>
    </div>
    {lista.length ? <div className={tb.moldura}><TabelaTurmas turmas={lista} abrirTurma={abrirTurma} /></div> : <Vazio icone={<GraduationCap />} titulo="Nenhuma turma neste filtro" />}
  </div>;
}

/* ─── Detalhe da turma ──────────────────────────────────────────────────── */

type AbaTurma = 'presenca' | 'fotos' | 'documentos' | 'certificados';

function DetalheTurma({ data, turmaId, voltar }: { data: ClientPortalData; turmaId: string; voltar: () => void }) {
  const turma = data.trainings.find((t) => t.id === turmaId);
  const pessoas = useMemo(() => data.participants.filter((p) => p.trainingId === turmaId), [data.participants, turmaId]);
  // Cliente Amazon identifica as pessoas pelo login; os demais, pela função antiga.
  const colunaDaPessoa = clientePedeLogin([data.organization.displayName, data.organization.legalName]) ? 'Login' : 'Função';
  const fotos = data.photos.filter((f) => f.trainingId === turmaId);
  const docs = data.documents.filter((d) => d.trainingId === turmaId && !d.isCertificate);
  const [aba, setAba] = useState<AbaTurma>(turma?.status === 'Concluído' && pessoas.some((p) => p.certificateFileId) ? 'certificados' : 'presenca');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  if (!turma) return <Vazio titulo="Turma não encontrada" acao={<button type="button" onClick={voltar} className={botaoClasses('secundario')}>Voltar às turmas</button>} />;

  const presentes = pessoas.filter((p) => p.daysTotal > 0 && p.daysPresent >= p.daysTotal).length;
  const comCertificado = pessoas.filter((p) => p.certificateFileId);
  const tudo = [...fotos.map((f) => ({ id: f.id, name: f.alt })), ...docs.map((d) => ({ id: d.id, name: d.title })), ...comCertificado.map((p) => ({ id: p.certificateFileId as string, name: `certificado-${slug(p.fullName)}.pdf` }))];
  const escolhidos = comCertificado.filter((p) => selecionados.has(p.id));
  const todos = comCertificado.length > 0 && escolhidos.length === comCertificado.length;
  const ausentes = turma.status === 'Concluído' ? pessoas.length - presentes : 0;
  const pct = pessoas.length ? Math.round((presentes / pessoas.length) * 100) : 0;

  return <div className="flex flex-col gap-5">
    <TopoDePagina
      trilha={<nav aria-label="Trilha" className="flex items-center gap-2 ds-body-s"><button type="button" onClick={voltar} className="text-ds-texto-2 hover:text-ds-texto">Turmas</button><ChevronRight className="size-3.5 text-ds-texto-2" /><span className="ds-mono">{turma.code}</span></nav>}
      titulo={<span className="flex flex-wrap items-center gap-3">{turma.nr} · {turma.title} <Tag tom={tomDoStatus(turma.status)}>{rotuloDoStatus(turma.status)}</Tag></span>}
      subtitulo={<Meta className="mt-2" itens={[{ icone: <CalendarDays />, texto: turma.dateLabel }, turma.location ? { icone: <MapPin />, texto: turma.location } : null, turma.instructor ? { icone: <UserRound />, texto: `Instrutor: ${turma.instructor}` } : null, turma.duration ? { icone: <Clock3 />, texto: turma.duration } : null]} />}
      acoes={<BotaoZip entries={tudo} zipName={slug(`${turma.nr}-${turma.title}`)} />}
    />
    <Abas rotulo="Seções da turma" ativa={aba} onChange={setAba} abas={[
      { id: 'presenca', rotulo: 'Presença', contador: `${presentes}/${pessoas.length}` },
      { id: 'fotos', rotulo: 'Fotos', contador: fotos.length },
      { id: 'documentos', rotulo: 'Documentos', contador: docs.length },
      { id: 'certificados', rotulo: 'Certificados', contador: `${comCertificado.length}/${pessoas.length}` },
    ]} />

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {aba === 'presenca' ? (pessoas.length ? <div className={tb.moldura}><div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[560px]')}>
          <thead className={tb.cabeca}><tr><th className={tb.th}>Participante</th><th className={tb.th}>{colunaDaPessoa}</th><th className={tb.th}>Dias</th><th className={tb.th}>Status</th></tr></thead>
          <tbody>{pessoas.map((p) => { const completo = p.daysTotal > 0 && p.daysPresent >= p.daysTotal; const tom = completo ? 'sucesso' : turma.status === 'Concluído' ? 'atencao' : 'neutro'; const texto = completo ? 'Presente' : turma.status === 'Concluído' ? 'Ausente — reagendar' : 'Em curso'; return <tr key={p.id} className={tb.linha}><td className={cn(tb.td, 'font-medium')}>{p.fullName}</td><td className={cn(tb.td, 'text-ds-texto-2')}>{identificacaoDaPessoa(p)}</td><td className={tb.td}>{p.daysPresent}/{p.daysTotal}</td><td className={tb.td}><Tag tom={tom}>{texto}</Tag></td></tr>; })}</tbody>
        </table></div></div> : <Vazio icone={<UsersRound />} titulo="Nenhum participante registrado" texto="A lista aparece conforme os participantes fazem o check-in pelo QR Code." />) : null}

        {aba === 'fotos' ? (fotos.length ? <Galeria fotos={fotos} /> : <Vazio icone={<ImageIcon />} titulo="Nenhuma foto publicada" texto="As fotos da prática aparecem aqui depois da aula." />) : null}

        {aba === 'documentos' ? (docs.length ? <Cartao className="px-5 pb-2 sm:px-6">{docs.map((d) => <LinhaArquivo key={d.id} className="first:border-t-0" icone={<FileText />} titulo={d.title} detalhe={`${d.category} · ${d.format} · ${d.size} · ${d.updatedAt}`} acoes={<><a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Eye className="size-4" /></a><a href={`/api/files/${d.id}?download=1`} aria-label={`Baixar ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Download className="size-4" /></a></>} />)}</Cartao> : <Vazio icone={<FileText />} titulo="Nenhum documento publicado" />) : null}

        {aba === 'certificados' ? (pessoas.length ? <div className={tb.moldura}>
          {escolhidos.length ? <div className="flex flex-wrap items-center gap-3 bg-ds-amarelo-suave px-5 py-3"><span className="flex-1 ds-body-s font-medium">{escolhidos.length} {escolhidos.length === 1 ? 'selecionado' : 'selecionados'}</span><BotaoZip tipo="escuro" rotulo="Baixar selecionados" entries={escolhidos.map((p) => ({ id: p.certificateFileId as string, name: `${slug(p.fullName)}.pdf` }))} zipName={`certificados-${slug(turma.nr)}-${turma.code}`} /></div> : null}
          <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[600px]')}>
            <thead className={tb.cabeca}><tr>
              <th className={cn(tb.th, 'w-12')}><input type="checkbox" aria-label="Selecionar todos" disabled={!comCertificado.length} checked={todos} onChange={() => setSelecionados(todos ? new Set() : new Set(comCertificado.map((p) => p.id)))} className="size-[18px] accent-ds-inverso" /></th>
              <th className={tb.th}>Participante</th><th className={tb.th}>{colunaDaPessoa}</th><th className={tb.th}>Status</th><th className={cn(tb.th, 'w-12')}><span className="sr-only">Baixar</span></th>
            </tr></thead>
            <tbody>{pessoas.map((p) => { const sit = situacaoCertificado(p, turma); return <tr key={p.id} className={tb.linha}>
              <td className={tb.td}><input type="checkbox" disabled={!p.certificateFileId} aria-label={`Selecionar ${p.fullName}`} checked={selecionados.has(p.id)} onChange={() => setSelecionados((atual) => { const novo = new Set(atual); if (novo.has(p.id)) novo.delete(p.id); else novo.add(p.id); return novo; })} className="size-[18px] accent-ds-inverso disabled:opacity-30" /></td>
              <td className={cn(tb.td, 'font-medium')}>{p.fullName}</td>
              <td className={cn(tb.td, 'text-ds-texto-2')}>{identificacaoDaPessoa(p)}</td>
              <td className={tb.td}><Tag tom={sit.tom}>{sit.texto}</Tag></td>
              <td className={tb.td}>{p.certificateFileId ? <a href={`/api/files/${p.certificateFileId}?download=1`} aria-label={`Baixar certificado de ${p.fullName}`} className="inline-flex rounded p-1 hover:bg-ds-muted"><Download className="size-[18px]" /></a> : null}</td>
            </tr>; })}</tbody>
          </table></div>
        </div> : <Vazio icone={<Award />} titulo="Sem participantes nesta turma" />) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Cartao className="flex flex-col gap-3.5 p-5">
          <h2 className="ds-h4">Presença</h2>
          <div className="flex items-end justify-between gap-3"><span className="ds-h3">{presentes} de {pessoas.length}</span><span className={cn('ds-body-s font-medium', pct >= 90 ? 'text-ds-sucesso' : 'text-ds-texto-2')}>{pct}%</span></div>
          <BarraProgresso valor={presentes} total={pessoas.length} />
          <p className="ds-caption text-ds-texto-2">{turma.status !== 'Concluído' ? 'Turma ainda em curso: a presença fecha no último dia.' : ausentes ? `${ausentes} ${ausentes === 1 ? 'participante ausente' : 'participantes ausentes'}. A Space entra em contato para reagendar.` : 'Todos os participantes concluíram.'}</p>
        </Cartao>
        <Cartao className="px-5 pt-5 pb-2">
          <h2 className="pb-2 ds-h4">Documentos da turma</h2>
          {docs.length ? docs.slice(0, 6).map((d) => <LinhaArquivo key={d.id} icone={<FileText />} titulo={d.title} detalhe={`${d.format} · ${d.size}`} acoes={<a href={`/api/files/${d.id}?download=1`} aria-label={`Baixar ${d.title}`} className="rounded p-1 hover:bg-ds-muted"><Download className="size-4" /></a>} />) : <p className="border-t border-ds-borda py-3 ds-body-s text-ds-texto-2">Nenhum documento ainda.</p>}
          {docs.length > 6 ? <button type="button" onClick={() => setAba('documentos')} className={botaoClasses('link', 'P', 'my-2')}>Ver todos <ArrowRight /></button> : null}
        </Cartao>
      </div>
    </div>
  </div>;
}
