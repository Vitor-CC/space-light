'use client';

import { ArrowRight, CalendarCheck2, CalendarDays, Check, Clock3, GraduationCap, LayoutGrid, Loader2, LogOut, MapPin, Play, QrCode, RefreshCw, ShieldCheck, Trash2, Upload, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ptBR } from 'date-fns/locale';

import { Sala } from '@/components/instructor-portal/instrutor-sala';
import { dateFromIso, formatDate, formatMoment, isoFromDate, janelaDoDia, longDate, meuDia, requestJson, statusLabel, statusTom, type DiaDeAula } from '@/components/instructor-portal/instrutor-util';
import { Botao, botaoClasses, BotaoIcone, Campo, campoClasses, Cartao, CartaoCabecalho, Faixa, Indicador, Logo, Meta, Tag, TopoDePagina, Vazio } from '@/components/ds/base';
import { FotoDePerfil } from '@/components/foto-de-perfil';
import { urlDaFoto } from '@/lib/fotos';
import { Aviso, PortalShell, useAviso } from '@/components/ds/interativo';
import { Calendar } from '@/components/ui/calendar';
import type { CompanyTraining } from '@/lib/company-types';
import { GRUPOS_DE_EQUIPAMENTO, lerEquipamentos, type EquipamentosDoInstrutor } from '@/lib/equipamentos-instrutor';
import { INSTRUCTOR_DOCUMENT_STATUS, REQUIRED_INSTRUCTOR_DOCUMENTS } from '@/lib/instructor-documents';
import type { InstructorDashboardData } from '@/lib/instructor-types';
import { cn } from '@/lib/utils';

type Section = 'overview' | 'calendar' | 'trainings' | 'active' | 'documents' | 'profile';

export function InstructorPortal({ initialData }: { initialData: InstructorDashboardData }) {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState(initialData);
  const [aviso, setAviso] = useAviso(6000);
  const [selectedTrainingId, setSelectedTrainingId] = useState(initialData.trainings.find((item) => item.status === 'in_progress')?.id || initialData.trainings[0]?.id || '');
  const reload = useCallback(async () => setData(await requestJson<InstructorDashboardData>('/api/instructor/dashboard')), []);
  const openTraining = useCallback((training: CompanyTraining) => { setSelectedTrainingId(training.id); setSection('active'); window.scrollTo({ top: 0 }); }, []);

  // Cadastro em análise: a única coisa que ele pode fazer é enviar documento.
  if (data.instructor.status === 'pending') {
    return <main className="min-h-screen bg-ds-muted text-ds-texto">
      <header className="flex items-center justify-between bg-ds-inverso px-5 py-4 sm:px-8"><Logo cor="claro" className="h-9" /><form action="/api/auth/logout" method="post"><button type="submit" className={botaoClasses('inverso', 'P')}><LogOut />Sair</button></form></header>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <TopoDePagina titulo={`Falta pouco, ${data.instructor.name.split(' ')[0]}`} subtitulo="Envie os três documentos abaixo. A Space Light analisa e libera o seu acesso às turmas; o aviso chega pelo WhatsApp cadastrado." />
        <MeusDocumentos notify={setAviso} />
        <MeusEquipamentos salvo={data.instructor.equipment} reload={reload} notify={setAviso} />
      </div>
      <Aviso texto={aviso} onFechar={() => setAviso('')} />
    </main>;
  }

  const itens = [
    { id: 'overview' as const, rotulo: 'Visão geral', icone: <LayoutGrid /> },
    { id: 'calendar' as const, rotulo: 'Calendário', icone: <CalendarDays /> },
    { id: 'trainings' as const, rotulo: 'Turmas', icone: <GraduationCap /> },
    { id: 'active' as const, rotulo: 'Sala da turma', icone: <QrCode /> },
    { id: 'documents' as const, rotulo: 'Meus documentos', icone: <ShieldCheck /> },
  ];

  let conteudo: React.ReactNode;
  if (section === 'overview') conteudo = <VisaoGeral data={data} navigate={setSection} openTraining={openTraining} />;
  else if (section === 'calendar') conteudo = <Calendario data={data} reload={reload} notify={setAviso} openTraining={openTraining} />;
  else if (section === 'trainings') conteudo = <div className="flex flex-col gap-6"><TopoDePagina titulo="Turmas" subtitulo="As turmas atribuídas a você pela Space Light." />{data.trainings.length ? <div className="grid gap-4 xl:grid-cols-2">{data.trainings.map((training) => <CartaoTurma key={training.id} training={training} onStart={openTraining} instructorId={data.instructor.id} />)}</div> : <Vazio icone={<GraduationCap />} titulo="Nenhuma turma atribuída" texto="A gestão da Space Light vincula seus próximos treinamentos aqui." />}</div>;
  else if (section === 'active') conteudo = <div className="flex flex-col gap-5"><TopoDePagina className="hidden lg:flex" titulo="Sala da turma" subtitulo="Inicie o dia, mostre o QR, faça a chamada e finalize a turma." acoes={<BotaoIcone rotulo="Atualizar dados" onClick={() => void reload()}><RefreshCw /></BotaoIcone>} /><Sala data={data} selectedId={selectedTrainingId} selectTraining={setSelectedTrainingId} reload={reload} notify={setAviso} /></div>;
  else if (section === 'documents') conteudo = <div className="flex flex-col gap-6"><TopoDePagina titulo="Meus documentos" subtitulo="CNH, assinatura e registro MTE/RE exigidos pela Space Light para liberar as turmas." /><MeusDocumentos notify={setAviso} /><MeusEquipamentos salvo={data.instructor.equipment} reload={reload} notify={setAviso} /></div>;
  else conteudo = <MeuCadastro data={data} reload={reload} notify={setAviso} />;

  return <PortalShell area="Área do instrutor" itens={itens} ativo={section === 'profile' ? null : section} onNavegar={setSection} usuario={{ nome: data.instructor.name, detalhe: 'Meu cadastro', foto: urlDaFoto('instrutor', data.instructor.id, data.instructor.photo_key) }} onUsuario={() => setSection('profile')}>
    <div key={section}>{conteudo}</div>
    <Aviso texto={aviso} onFechar={() => setAviso('')} />
  </PortalShell>;
}

/* ─── Cartão de turma ───────────────────────────────────────────────────── */

function CartaoTurma({ training, onStart, instructorId }: { training: CompanyTraining; onStart?: (training: CompanyTraining) => void; instructorId: string }) {
  // A data do dia dele nesta turma (o próximo a dar), não a do 1º dia da turma.
  const { dias, atual } = meuDia(training, instructorId);
  return <Cartao className="flex flex-col gap-4 p-5">
    <div className="flex flex-wrap items-center gap-2"><Tag tom={statusTom(training.status)}>{statusLabel(training.status)}</Tag><span className="ds-mono text-ds-texto-2">{training.code}</span>{dias.length > 1 && atual ? <span className="ds-caption text-ds-texto-2">Dia {atual.day_number} de {dias.length}</span> : null}</div>
    <div><h3 className="ds-h4">{training.nr} · {training.internal_label || training.title}</h3><p className="ds-body-s font-medium text-ds-amarelo-texto">{training.client_name}</p></div>
    <Meta itens={[{ icone: <CalendarDays />, texto: formatDate(atual?.session_date ?? training.training_date) }, training.duration ? { icone: <Clock3 />, texto: training.duration } : null, training.location ? { icone: <MapPin />, texto: training.location } : null, { icone: <UserRound />, texto: `${training.participant_count} inscritos` }]} />
    {onStart && training.status !== 'completed' ? <Botao className="w-full sm:w-fit" onClick={() => onStart(training)}><Play />{training.status === 'in_progress' ? 'Abrir sala' : 'Iniciar'}</Botao> : onStart ? <button type="button" onClick={() => onStart(training)} className={botaoClasses('link', 'M', 'w-fit')}>Ver sala e arquivos <ArrowRight /></button> : null}
  </Cartao>;
}

/* ─── Visão geral ───────────────────────────────────────────────────────── */

function VisaoGeral({ data, navigate, openTraining }: { data: InstructorDashboardData; navigate: (section: Section) => void; openTraining: (training: CompanyTraining) => void }) {
  const today = isoFromDate(new Date());
  // Os dias em que ESTE instrutor dá aula: o de hoje é o que ele precisa ver primeiro.
  const meusDias = data.trainings.flatMap((training) => (training.sessions ?? [])
    .filter((dia) => dia.instructor_id === data.instructor.id)
    .map((session) => ({ training, session, total: (training.sessions ?? []).length })));
  const deHoje = meusDias.filter((item) => item.session.session_date === today);
  const proximoDeAula = meusDias
    .filter((item) => item.session.session_date > today && item.session.status !== 'completed')
    .sort((a, b) => a.session.session_date.localeCompare(b.session.session_date))[0];
  // Próximas pelo dia dele em cada turma, não pela 1ª data da turma.
  const upcoming = data.trainings
    .map((item) => ({ item, dia: meuDia(item, data.instructor.id).atual }))
    .filter(({ item, dia }) => item.status !== 'completed' && dia !== null && dia.status !== 'completed' && dia.session_date >= today)
    .sort((a, b) => (a.dia?.session_date ?? '').localeCompare(b.dia?.session_date ?? ''))
    .map(({ item }) => item);
  const next = upcoming[0];

  return <div className="flex flex-col gap-6">
    <TopoDePagina className="hidden lg:flex" titulo={`Olá, ${data.instructor.name.split(" ")[0]}`} subtitulo={longDate(today)} />
    {deHoje.length ? deHoje.map(({ training, session, total }) => { const janela = janelaDoDia(session); return <section key={session.id} className="flex flex-col gap-2.5 rounded-[10px] p-[18px] ds-degrade sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between gap-2 ds-caps"><span>Hoje{janela ? ` · ${janela}` : ''}{total > 1 ? ` · Dia ${session.day_number} de ${total}` : ''}</span><span className="sm:hidden">Turma {training.code}</span></div>
        <h2 className="mt-1.5 ds-h4">{training.nr} · {training.internal_label || training.title}</h2>
        <p className="mt-1 flex items-center gap-1.5 ds-body-s"><MapPin className="size-3.5" />{training.client_name}{training.location ? ` · ${training.location}` : ''}</p>
      </div>
      <Botao tipo="escuro" onClick={() => openTraining(training)}><Play />{session.status === 'in_progress' ? 'Abrir sala' : 'Iniciar o dia'}</Botao>
    </section>; }) : <Cartao className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><span className="ds-caps text-ds-texto-2">Hoje</span><h2 className="ds-h4">Nenhuma turma sua hoje</h2><p className="ds-body-s text-ds-texto-2">{proximoDeAula ? `Próxima: ${longDate(proximoDeAula.session.session_date)} · ${proximoDeAula.training.nr} · ${proximoDeAula.training.internal_label || proximoDeAula.training.title}` : 'Nenhuma turma futura atribuída a você.'}</p></div>
      {proximoDeAula ? <Botao tipo="secundario" onClick={() => navigate('calendar')}><CalendarDays />Ver no calendário</Botao> : null}
    </Cartao>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Indicador rotulo="Próximas turmas" valor={upcoming.length} apoio="a partir de hoje" onClick={() => navigate('trainings')} />
      <Indicador rotulo="Datas disponíveis" valor={data.availability.length} apoio="informadas à gestão" onClick={() => navigate('calendar')} />
      <Indicador rotulo="Inscrições recebidas" valor={data.participants.length} apoio="nas suas turmas" />
    </div>
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3"><h2 className="ds-h4">Próxima turma</h2><button type="button" onClick={() => navigate('trainings')} className={botaoClasses('link', 'M')}>Ver todas <ArrowRight /></button></div>
      {next ? <CartaoTurma training={next} onStart={openTraining} instructorId={data.instructor.id} /> : <Vazio icone={<CalendarCheck2 />} titulo="Nenhuma turma agendada" texto="Quando a gestão atribuir um treinamento, ele aparece aqui." />}
    </section>
  </div>;
}

/* ─── Calendário e disponibilidade ──────────────────────────────────────── */

function Calendario({ data, reload, notify, openTraining }: { data: InstructorDashboardData; reload: () => Promise<void>; notify: (message: string) => void; openTraining: (training: CompanyTraining) => void }) {
  const [selected, setSelected] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  // Cada dia em que ESTE instrutor está escalado (não só a 1ª data da turma).
  const meusDias = useMemo(() => {
    const mapa = new Map<string, DiaDeAula[]>();
    for (const training of data.trainings) {
      const dias = training.sessions ?? [];
      for (const session of dias) {
        if (session.instructor_id !== data.instructor.id) continue;
        const lista = mapa.get(session.session_date) ?? [];
        lista.push({ training, session, total: dias.length });
        mapa.set(session.session_date, lista);
      }
    }
    return mapa;
  }, [data.trainings, data.instructor.id]);
  const trainingDates = useMemo(() => [...meusDias.keys()].map(dateFromIso), [meusDias]);
  const availableDates = data.availability.map((item) => dateFromIso(item.available_date));
  const hoje = isoFromDate(new Date());
  const proximos = [...meusDias.entries()].filter(([iso]) => iso >= hoje).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 6);
  const selectedIso = selected ? isoFromDate(selected) : '';
  const doDia = selectedIso ? meusDias.get(selectedIso) ?? [] : [];
  const disponivelNoDia = selectedIso ? data.availability.find((item) => item.available_date === selectedIso) : undefined;

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return notify('Selecione uma data no calendário.');
    try {
      await requestJson('/api/instructor/availability', { method: 'POST', body: JSON.stringify({ availableDate: isoFromDate(selected), note }) });
      notify('Disponibilidade registrada.'); setNote(''); await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar a data.'); }
  }
  async function remove(id: string) {
    try { await requestJson('/api/instructor/availability', { method: 'DELETE', body: JSON.stringify({ availabilityId: id }) }); notify('Disponibilidade removida.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao remover a data.'); }
  }

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Calendário" subtitulo="Seus dias de aula e as datas em que você pode atender novas turmas." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Cartao className="flex flex-col gap-4 p-5">
        <Calendar mode="single" selected={selected} onSelect={setSelected} locale={ptBR} modifiers={{ training: trainingDates, available: availableDates }} modifiersClassNames={{ training: '[&>button]:bg-ds-inverso [&>button]:text-ds-amarelo [&>button]:font-semibold', available: '[&>button]:ring-2 [&>button]:ring-ds-amarelo [&>button]:ring-inset' }} className="mx-auto w-full [--cell-size:--spacing(11)]" />
        <div className="flex flex-wrap gap-4 border-t border-ds-borda pt-3 ds-caption text-ds-texto-2"><span className="flex items-center gap-2"><i className="size-3 rounded-sm bg-ds-inverso" />Sua turma</span><span className="flex items-center gap-2"><i className="size-3 rounded-sm border-2 border-ds-amarelo" />Disponível</span></div>
        <form onSubmit={save} className="flex flex-col gap-3">
          <Faixa tom="sinal" titulo={selected ? formatDate(isoFromDate(selected)) : 'Selecione uma data'}>A gestão vê esta data ao organizar novas turmas.</Faixa>
          <Campo rotulo="Observação (opcional)"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: só de manhã" className={campoClasses} /></Campo>
          <Botao type="submit" className="w-full"><Check />Marcar disponibilidade</Botao>
        </form>
      </Cartao>
      <div className="flex flex-col gap-5">
        <Cartao>
          <CartaoCabecalho titulo={selected ? longDate(selectedIso) : 'Suas próximas turmas'} acao={selected ? <button type="button" onClick={() => setSelected(undefined)} className={botaoClasses('link', 'P')}>Ver próximas</button> : null} />
          <div className="px-5 pb-4 sm:px-6">
            {!selected ? (proximos.length ? proximos.map(([iso, itensDoDia]) => <button key={iso} type="button" onClick={() => setSelected(dateFromIso(iso))} className="flex w-full items-center justify-between gap-3 border-t border-ds-borda py-3 text-left hover:opacity-80">
              <span className="min-w-0"><span className="block ds-body-s font-medium">{longDate(iso)}</span><span className="block truncate ds-caption text-ds-texto-2">{itensDoDia.map((item) => `${item.training.nr} · ${item.training.internal_label || item.training.title}`).join(' | ')}</span></span>
              {iso === hoje ? <Tag tom="sinal">Hoje</Tag> : <ArrowRight className="size-4 shrink-0 text-ds-texto-2" />}
            </button>) : <p className="border-t border-ds-borda py-4 ds-body-s text-ds-texto-2">Nenhuma turma sua a partir de hoje.</p>)
              : doDia.length ? doDia.map(({ training, session, total }) => { const janela = janelaDoDia(session); return <div key={session.id} className="flex flex-col gap-3 border-t border-ds-borda py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Tag tom={statusTom(session.status)}>{statusLabel(session.status)}</Tag>{total > 1 ? <span className="ds-caption text-ds-texto-2">Dia {session.day_number} de {total}</span> : null}</div><p className="mt-1.5 ds-body-s font-medium">{training.nr} · {training.internal_label || training.title}</p><p className="ds-caption text-ds-texto-2">{training.client_name}{janela ? ` · ${janela}` : ''}{training.location ? ` · ${training.location}` : ''}</p></div>
                <Botao tamanho="P" onClick={() => openTraining(training)}><Play />Abrir sala</Botao>
              </div>; }) : <p className="border-t border-ds-borda py-4 ds-body-s text-ds-texto-2">Nenhuma turma sua nesta data. Se puder dar aula neste dia, marque a disponibilidade.</p>}
            {disponivelNoDia ? <div className="flex items-center gap-3 border-t border-ds-borda py-3"><CalendarCheck2 className="size-4 text-ds-amarelo-texto" /><span className="min-w-0 flex-1 ds-body-s">Você marcou disponibilidade{disponivelNoDia.note ? ` · ${disponivelNoDia.note}` : ''}</span><BotaoIcone rotulo="Remover disponibilidade deste dia" tom="perigo" onClick={() => void remove(disponivelNoDia.id)}><Trash2 /></BotaoIcone></div> : null}
          </div>
        </Cartao>
        <Cartao>
          <CartaoCabecalho titulo="Minha disponibilidade" />
          <div className="px-5 pb-4 sm:px-6">{data.availability.length ? data.availability.map((item) => <div key={item.id} className="flex items-center gap-3 border-t border-ds-borda py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ds-amarelo-suave"><CalendarCheck2 className="size-4" /></span>
            <div className="min-w-0 flex-1"><p className="ds-body-s font-medium">{formatDate(item.available_date)}</p><p className="truncate ds-caption text-ds-texto-2">{item.note || 'Disponível para novas turmas'}</p></div>
            <BotaoIcone rotulo="Remover disponibilidade" tom="perigo" onClick={() => void remove(item.id)}><Trash2 /></BotaoIcone>
          </div>) : <p className="border-t border-ds-borda py-4 ds-body-s text-ds-texto-2">Nenhuma data informada. Escolha no calendário os dias em que pode dar aula.</p>}</div>
        </Cartao>
      </div>
    </div>
  </div>;
}

/* ─── Meus documentos ───────────────────────────────────────────────────── */

type MyDocument = { id: string; category: string; name: string; status: string; size: number; createdAt: string };

function MeusDocumentos({ notify }: { notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<MyDocument[] | null>(null);
  const [sending, setSending] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ documents: MyDocument[] }>('/api/instructor/documents');
      setDocuments(result.documents);
    } catch { setDocuments([]); }
  }, []);
  useEffect(() => {
    let ativo = true;
    requestJson<{ documents: MyDocument[] }>('/api/instructor/documents')
      .then((r) => { if (ativo) setDocuments(r.documents); })
      .catch(() => { if (ativo) setDocuments([]); });
    return () => { ativo = false; };
  }, []);

  async function send(category: string, input: HTMLInputElement) {
    const chosen = input.files?.[0];
    if (!chosen) return;
    setSending(category);
    try {
      const body = new FormData();
      body.append('category', category);
      body.append('file', chosen);
      const response = await fetch('/api/instructor/documents', { method: 'POST', body });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar.');
      notify('Documento enviado. A Space Light vai analisar.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao enviar o documento.');
    } finally {
      setSending('');
      input.value = '';
    }
  }

  if (documents === null) return <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-ds-amarelo-texto" /></div>;
  const porCategoria = new Map(documents.map((item) => [item.category, item]));
  return <div className="flex flex-col gap-3">{REQUIRED_INSTRUCTOR_DOCUMENTS.map((required) => {
    const enviado = porCategoria.get(required.category);
    const situacao = enviado ? INSTRUCTOR_DOCUMENT_STATUS[enviado.status] : null;
    const tom = !situacao ? 'neutro' : situacao.tone === 'ok' ? 'sucesso' : situacao.tone === 'bad' ? 'perigo' : 'atencao';
    return <Cartao key={required.category} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="ds-h4">{required.label}</h3><Tag tom={tom}>{situacao?.label ?? 'Não enviado'}</Tag></div>
        <p className="mt-1 max-w-lg ds-body-s text-ds-texto-2">{required.help}</p>
        {enviado ? <p className="mt-1.5 ds-caption text-ds-texto-2">{enviado.name} · {Math.max(1, Math.round(enviado.size / 1024))} KB · {formatMoment(enviado.createdAt)}</p> : null}
        {enviado?.status === 'rejected' ? <Faixa tom="perigo" className="mt-3">A Space Light recusou este documento. Envie outro arquivo, mais legível ou dentro da validade.</Faixa> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {enviado ? <a href={`/api/instructor-documents/${enviado.id}`} target="_blank" rel="noopener" className={botaoClasses('fantasma', 'M')}>Ver</a> : null}
        <label className={botaoClasses(enviado ? 'secundario' : 'primario', 'M', cn('cursor-pointer', sending === required.category && 'pointer-events-none opacity-60'))}>
          {sending === required.category ? <Loader2 className="animate-spin" /> : <Upload />}
          {sending === required.category ? 'Enviando…' : enviado ? 'Reenviar' : 'Enviar'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={(event) => void send(required.category, event.currentTarget)} className="hidden" />
        </label>
      </div>
    </Cartao>;
  })}</div>;
}

/* ─── Carro, celular e notebook ─────────────────────────────────────────── */

function MeusEquipamentos({ salvo, reload, notify }: { salvo?: string; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [form, setForm] = useState<EquipamentosDoInstrutor>(() => lerEquipamentos(salvo));
  const [saving, setSaving] = useState(false);
  function mudar(grupo: keyof EquipamentosDoInstrutor, chave: string, valor: string) {
    setForm((atual) => ({ ...atual, [grupo]: { ...atual[grupo], [chave]: valor } }));
  }
  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const resultado = await requestJson<{ equipment: EquipamentosDoInstrutor }>('/api/instructor/equipment', { method: 'POST', body: JSON.stringify({ equipment: form }) });
      setForm(resultado.equipment);
      notify('Dados do carro, celular e notebook salvos.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar os dados.'); }
    finally { setSaving(false); }
  }
  return <Cartao className="p-5 sm:p-7">
    <h3 className="ds-h4">Carro, celular e notebook</h3>
    <p className="mt-1 max-w-lg ds-body-s text-ds-texto-2">O que você usa nos treinamentos da Space Light. Preencha o que tiver.</p>
    <form onSubmit={save} className="mt-5 flex flex-col gap-6">
      {GRUPOS_DE_EQUIPAMENTO.map(({ grupo, titulo, campos }) => <fieldset key={grupo} className="flex flex-col gap-3 border-t border-ds-borda pt-4">
        <legend className="ds-caps pr-2 text-ds-texto-2">{titulo}</legend>
        <div className={cn('grid gap-4 sm:grid-cols-2', campos.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {campos.map((campo) => <Campo key={campo.chave} rotulo={campo.rotulo} ajuda={campo.ajuda}>
            <input value={(form[grupo] as Record<string, string>)[campo.chave]} onChange={(e) => mudar(grupo, campo.chave, e.target.value)} placeholder={campo.exemplo ? `Ex.: ${campo.exemplo}` : undefined} inputMode={campo.chave === 'imei' ? 'numeric' : undefined} autoCapitalize={campo.chave === 'placa' ? 'characters' : undefined} className={campoClasses} />
          </Campo>)}
        </div>
      </fieldset>)}
      <div><Botao type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Check />}Salvar</Botao></div>
    </form>
  </Cartao>;
}

/* ─── Meu cadastro ──────────────────────────────────────────────────────── */

function MeuCadastro({ data, reload, notify }: { data: InstructorDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [form, setForm] = useState({
    name: data.instructor.name,
    phone: data.instructor.phone,
    professionalRegistry: data.instructor.professional_registry,
    baseCity: data.instructor.base_city,
    specialties: data.instructor.specialties,
  });
  const [saving, setSaving] = useState(false);
  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await requestJson('/api/instructor/profile', { method: 'POST', body: JSON.stringify(form) });
      notify('Cadastro atualizado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o cadastro.'); }
    finally { setSaving(false); }
  }
  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Meu cadastro" subtitulo="CPF e e-mail de acesso são alterados apenas pela gestão da Space Light." />
    <Cartao className="p-5 sm:p-7">
      <FotoDePerfil tipo="instrutor" id={data.instructor.id} nome={data.instructor.name} chave={data.instructor.photo_key} aoMudar={reload} notify={notify} className="mb-6 border-b border-ds-borda pb-5" />
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
        <Campo rotulo="Nome completo" className="sm:col-span-2"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="CPF" ajuda="Não editável."><input value={data.instructor.document} disabled className={campoClasses} /></Campo>
        <Campo rotulo="E-mail de acesso" ajuda="Não editável."><input value={data.instructor.email} disabled className={campoClasses} /></Campo>
        <Campo rotulo="Telefone / WhatsApp"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="Registro profissional"><input value={form.professionalRegistry} onChange={(e) => setForm({ ...form, professionalRegistry: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="Cidade base"><input value={form.baseCity} onChange={(e) => setForm({ ...form, baseCity: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="Especialidades / NRs"><input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className={campoClasses} /></Campo>
        <div className="sm:col-span-2"><Botao type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Check />}Salvar alterações</Botao></div>
      </form>
    </Cartao>
  </div>;
}
