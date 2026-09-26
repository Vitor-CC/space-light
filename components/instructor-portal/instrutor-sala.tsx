'use client';

import { ArrowRight, Camera, Check, CheckCircle2, Circle, Copy, Download, FileText, Loader2, MapPin, Play, Plus, QrCode, Trash2, Upload, UsersRound, X } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';

import { formatDate, formatMoment, janelaDoDia, meuDia, requestJson, rotuloDoDia } from '@/components/instructor-portal/instrutor-util';
import { BarraProgresso, Botao, botaoClasses, BotaoIcone, Campo, campoClasses, Cartao, Faixa, selectClasses, Tag, Vazio } from '@/components/ds/base';
import { Segmentado } from '@/components/ds/interativo';
import type { CompanyParticipant } from '@/lib/company-types';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
import type { InstructorDashboardData } from '@/lib/instructor-types';
import { cn } from '@/lib/utils';

type TrainingFile = { id: string; name: string; kind: string; size: number; contentType: string; createdAt: string; stored: boolean };
type Aba = 'chamada' | 'qr' | 'fotos' | 'checklist';
const ACEITA_IMAGEM = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const manualVazio = { fullName: '', documentId: '', rg: '', birthDate: '', jobTitle: '', email: '', phone: '' };

export function Sala({ data, selectedId, selectTraining, reload, notify }: { data: InstructorDashboardData; selectedId: string; selectTraining: (id: string) => void; reload: () => Promise<void>; notify: (message: string) => void }) {
  const training = data.trainings.find((item) => item.id === selectedId) || data.trainings.find((item) => item.status === 'in_progress') || data.trainings[0];
  const [aba, setAba] = useState<Aba>('chamada');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [participants, setParticipants] = useState<CompanyParticipant[]>(training ? data.participants.filter((item) => item.training_id === training.id) : []);
  const [files, setFiles] = useState<TrainingFile[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState(manualVazio);
  const [savingManual, setSavingManual] = useState(false);
  const [marcando, setMarcando] = useState('');
  // Ausência não é gravada (o banco só guarda presença): o vermelho marca quem
  // o instrutor tocou como ausente nesta tela, não todo mundo sem check-in.
  const [ausentes, setAusentes] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<'' | 'photo' | 'attendance'>('');
  const entradaFotos = useRef<HTMLInputElement>(null);
  const trainingId = training?.id;
  const emAndamento = training?.status === 'in_progress';

  // QR Code do formulário: só existe com a turma em andamento.
  useEffect(() => {
    if (!training || !emAndamento) return;
    const publicUrl = `${window.location.origin}/participar/${training.qr_token}`;
    let ativo = true;
    void QRCode.toDataURL(publicUrl, { width: 420, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then((img) => { if (ativo) { setUrl(publicUrl); setImage(img); } });
    return () => { ativo = false; };
  }, [training, emAndamento]);

  const atualizarLista = useCallback(async () => {
    if (!trainingId) return;
    try {
      const result = await requestJson<{ participants: CompanyParticipant[] }>(`/api/instructor/trainings/${encodeURIComponent(trainingId)}/participants`);
      setParticipants(result.participants);
    } catch { /* mantém a última lista enquanto tenta de novo */ }
  }, [trainingId]);

  // Lista ao vivo: quem lê o QR aparece sozinho, a cada 4 segundos.
  useEffect(() => {
    if (!trainingId) return;
    let ativo = true;
    const tick = async () => { if (ativo) await atualizarLista(); };
    void tick();
    if (!emAndamento) return () => { ativo = false; };
    const timer = window.setInterval(() => void tick(), 4000);
    return () => { ativo = false; window.clearInterval(timer); };
  }, [trainingId, emAndamento, atualizarLista]);

  const carregarArquivos = useCallback(async () => {
    if (!trainingId) return;
    try {
      const result = await requestJson<{ files: TrainingFile[] }>(`/api/instructor/trainings/${trainingId}/files`);
      setFiles(result.files);
    } catch { setFiles([]); }
  }, [trainingId]);
  useEffect(() => {
    if (!trainingId) return;
    let ativo = true;
    requestJson<{ files: TrainingFile[] }>(`/api/instructor/trainings/${trainingId}/files`)
      .then((r) => { if (ativo) setFiles(r.files); })
      .catch(() => { if (ativo) setFiles([]); });
    return () => { ativo = false; };
  }, [trainingId]);

  if (!training) return <Vazio icone={<QrCode />} titulo="Nenhum treinamento atribuído" texto="A sala é liberada quando a gestão atribuir uma turma ao seu cadastro." />;

  const { dias, atual: diaAtual, ultimoPendente } = meuDia(training, data.instructor.id);
  const janela = janelaDoDia(diaAtual);
  const listasEnviadas = (files ?? []).filter((f) => f.kind === 'attendance').length;
  const fotosDaAula = (files ?? []).filter((f) => f.kind === 'photo');
  // No último dia a foto da lista assinada é obrigatória (o servidor também exige).
  const travadoSemLista = ultimoPendente && listasEnviadas === 0;
  // Só quem tem presença em todos os dias recebe certificado ao encerrar.
  const completos = participants.filter((p) => p.days_total > 0 && p.days_present >= p.days_total).length;
  const meuDiaFechado = diaAtual?.status === 'completed' && training.status !== 'completed';
  const meuDiaAberto = diaAtual?.status === 'in_progress';
  const presenteHoje = (p: CompanyParticipant) => Boolean(diaAtual) && (p.present_sessions ?? '').split(',').includes(diaAtual!.id);
  const presentes = participants.filter(presenteHoje).length;
  const hojeIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const ehHoje = diaAtual?.session_date === hojeIso;

  async function start() {
    if (!training) return;
    setStarting(true);
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/start`, { method: 'POST' });
      notify('Dia iniciado. O formulário do QR Code está liberado.');
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao iniciar a turma.'); }
    finally { setStarting(false); }
  }
  async function copyUrl() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }

  async function marcar(p: CompanyParticipant, present: boolean) {
    if (!training || !diaAtual) return;
    setMarcando(p.id);
    setAusentes((atual) => { const novo = new Set(atual); if (present) novo.delete(p.id); else novo.add(p.id); return novo; });
    // Otimista: o botão responde na hora e a próxima leitura confirma.
    const antes = participants;
    setParticipants((lista) => lista.map((x) => {
      if (x.id !== p.id) return x;
      const ids = new Set((x.present_sessions ?? '').split(',').filter(Boolean));
      const tinha = ids.has(diaAtual.id);
      if (present) ids.add(diaAtual.id); else ids.delete(diaAtual.id);
      return { ...x, present_sessions: [...ids].join(','), days_present: x.days_present + (present && !tinha ? 1 : !present && tinha ? -1 : 0) };
    }));
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/attendance`, { method: 'POST', body: JSON.stringify({ participantId: p.id, present }) });
    } catch (error) {
      setParticipants(antes);
      notify(error instanceof Error ? error.message : 'Erro ao registrar a chamada.');
    } finally { setMarcando(''); }
  }

  async function complete() {
    if (!training) return;
    setEnding(true);
    try {
      const resultado = await requestJson<{ certificates?: number; trainingCompleted?: boolean; remainingDays?: number; certificatePublished?: boolean; certificateProblem?: string | null }>(`/api/instructor/trainings/${encodeURIComponent(training.id)}/complete`, { method: 'POST' });
      notify(!resultado.trainingCompleted
        ? `Seu dia foi encerrado. ${resultado.remainingDays === 1 ? 'Ainda falta 1 dia' : `Ainda faltam ${resultado.remainingDays} dias`} para a turma acabar. Os documentos saem só no fim.`
        : !resultado.certificates
          ? 'Treinamento encerrado. A lista de presença foi congelada.'
          : resultado.certificatePublished
            ? `Treinamento encerrado. ${resultado.certificates} certificado(s) emitidos; certificado da empresa e atestado ficaram nos documentos da turma.`
            : `Treinamento encerrado, mas o PDF dos certificados não foi gerado: ${resultado.certificateProblem ?? 'motivo desconhecido'}. Avise a Space Light.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao encerrar o treinamento.'); }
    finally { setEnding(false); setConfirmando(false); }
  }

  async function addManual(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!training) return;
    const problemaDocumento = problemaCpf(manual.documentId) ?? problemaRg(manual.rg);
    if (problemaDocumento) { notify(problemaDocumento); return; }
    setSavingManual(true);
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/participants`, { method: 'POST', body: JSON.stringify(manual) });
      setManual(manualVazio);
      setShowManual(false);
      notify('Participante adicionado à lista.');
      await atualizarLista();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao adicionar participante.'); }
    finally { setSavingManual(false); }
  }

  async function removeParticipant(p: CompanyParticipant) {
    if (!training) return;
    if (!window.confirm(`Remover ${p.full_name} da lista?`)) return;
    try {
      await requestJson(`/api/instructor/trainings/${encodeURIComponent(training.id)}/participants`, { method: 'DELETE', body: JSON.stringify({ participantId: p.id }) });
      notify('Participante removido.');
      await atualizarLista();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao remover participante.'); }
  }

  function exportCsv() {
    if (!training) return;
    const header = ['Nome', 'Identificador', 'Presença (dias)', 'Função', 'E-mail', 'Telefone', 'Entrada'];
    const body = participants.map((p) => [p.full_name, p.document_id, `${p.days_present}/${p.days_total}`, p.job_title, p.email, p.phone, new Date(p.created_at).toLocaleString('pt-BR')]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'));
    const csv = '﻿' + [header.join(';'), ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-presenca-${training.nr.replace(/\s+/g, '')}-${training.code}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function enviarArquivos(kind: 'photo' | 'attendance', input: HTMLInputElement) {
    if (!training) return;
    const chosen = Array.from(input.files ?? []);
    if (chosen.length === 0) return;
    setEnviando(kind);
    let ok = 0;
    const falhas: string[] = [];
    for (const file of chosen) {
      try {
        const body = new FormData();
        body.append('file', file);
        body.append('kind', kind);
        const response = await fetch(`/api/instructor/trainings/${training.id}/files`, { method: 'POST', body });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'falhou');
        ok += 1;
      } catch (error) {
        falhas.push(`${file.name} (${error instanceof Error ? error.message : 'erro'})`);
      }
    }
    notify(falhas.length ? `${ok} enviado(s). Falhou: ${falhas.join('; ')}` : kind === 'photo' ? `${ok} foto(s) da aula enviada(s).` : 'Lista assinada enviada.');
    await carregarArquivos();
    setEnviando('');
    input.value = '';
  }

  const acaoEncerrar = ultimoPendente ? 'Finalizar turma' : `Encerrar o dia ${diaAtual?.day_number ?? 1}`;

  return <div className="flex flex-col gap-4 pb-28">
    {data.trainings.length > 1 ? <label className="flex flex-col gap-2"><span className="sr-only">Turma</span><select value={training.id} onChange={(event) => selectTraining(event.target.value)} className={cn(selectClasses, 'max-w-2xl')}>{data.trainings.map((item) => { const rotulo = rotuloDoDia(item, data.instructor.id); return <option key={item.id} value={item.id}>{item.client_name} · {item.nr} · {item.internal_label ? `${item.internal_label} · ` : ''}{formatDate(meuDia(item, data.instructor.id).atual?.session_date ?? item.training_date)}{rotulo ? ` · ${rotulo}` : ''}</option>; })}</select></label> : null}

    {/* Card da turma de hoje (Figma "Turma de hoje"). */}
    <section className="flex flex-col gap-2.5 rounded-[10px] p-[18px] ds-degrade">
      <div className="flex flex-wrap items-start justify-between gap-2 ds-caps text-ds-texto">
        <span>{ehHoje ? 'Hoje' : diaAtual ? formatDate(diaAtual.session_date) : formatDate(training.training_date)}{janela ? ` · ${janela}` : ''}{dias.length > 1 && diaAtual ? ` · Dia ${diaAtual.day_number} de ${dias.length}` : ''}</span>
        <span>Turma {training.code}</span>
      </div>
      <h2 className="ds-h4 text-ds-texto">{training.nr} · {training.internal_label || training.title}</h2>
      <p className="flex items-center gap-1.5 ds-body-s text-ds-texto"><MapPin className="size-3.5 shrink-0" />{training.client_name}{training.location ? ` · ${training.location}` : ''}</p>
      {dias.length > 1 ? <div className="flex flex-wrap gap-1.5 pt-1">{dias.map((dia) => <span key={dia.id} title={`Dia ${dia.day_number}: ${dia.instructor_name ?? 'sem instrutor'}`} className={cn('inline-flex size-7 items-center justify-center rounded-md ds-caption font-semibold', dia.status === 'completed' ? 'bg-ds-sucesso text-ds-texto-inv' : dia.id === diaAtual?.id ? 'bg-ds-inverso text-ds-amarelo' : 'bg-black/12 text-ds-texto')}>{dia.day_number}</span>)}</div> : null}
      <div className="flex flex-col gap-1.5 pt-1.5">
        <div className="flex justify-between ds-body-s font-medium text-ds-texto"><span>Chamada</span><span>{presentes} de {participants.length}</span></div>
        <BarraProgresso escura valor={presentes} total={participants.length} />
      </div>
    </section>

    {training.status === 'completed' ? <Faixa tom="sucesso" titulo="Turma concluída">A lista está congelada e os documentos já foram emitidos. Você ainda pode exportar a lista e enviar fotos.</Faixa>
      : meuDiaFechado ? <Faixa tom="sucesso" titulo={`Dia ${diaAtual?.day_number} encerrado`}>A turma continua nos dias seguintes, com quem estiver escalado. Os certificados saem quando o último dia for encerrado.</Faixa>
      : !emAndamento || !meuDiaAberto ? <Cartao className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><strong className="block ds-body-s font-semibold">{emAndamento ? 'Seu dia ainda não começou' : 'Pronto para começar'}</strong><p className="ds-caption text-ds-texto-2">Ao iniciar, o QR Code de presença é liberado e a chamada fica disponível.</p></div>
        <Botao onClick={() => void start()} disabled={starting}>{starting ? <Loader2 className="animate-spin" /> : <Play />}{emAndamento ? 'Iniciar meu dia' : 'Iniciar treinamento'}</Botao>
      </Cartao> : null}

    <Segmentado rotulo="Seções da sala" tom="escuro" ativa={aba} onChange={setAba} className="border border-ds-borda" opcoes={[
      { id: 'chamada', rotulo: 'Chamada' },
      { id: 'qr', rotulo: 'QR Code', curto: 'QR' },
      { id: 'fotos', rotulo: `Fotos · ${fotosDaAula.length}` },
      { id: 'checklist', rotulo: 'Checklist' },
    ]} />

    {aba === 'chamada' ? <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto hidden ds-caption text-ds-texto-2 sm:inline">{emAndamento ? 'Atualiza sozinha a cada 4 segundos.' : `${participants.length} na lista.`}</span>
        <Botao tipo="fantasma" tamanho="P" onClick={exportCsv} disabled={participants.length === 0}><Download />CSV</Botao>
        {training.status !== 'completed' ? <Botao tipo="fantasma" tamanho="P" onClick={() => setShowManual((v) => !v)}>{showManual ? <X /> : <Plus />}{showManual ? 'Fechar' : 'Adicionar'}</Botao> : null}
      </div>
      {showManual ? <Cartao className="p-4 sm:p-5"><form onSubmit={addManual} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo *" className="sm:col-span-2"><input required value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="CPF *"><input required value={manual.documentId} onChange={(e) => setManual({ ...manual, documentId: limparDigitacaoCpf(e.target.value) })} inputMode="numeric" placeholder="Só números" className={campoClasses} /></Campo>
        <Campo rotulo="RG *" ajuda="Sem lembrar, use o CPF."><input required value={manual.rg} onChange={(e) => setManual({ ...manual, rg: limparDigitacaoRg(e.target.value) })} className={campoClasses} /></Campo>
        <Campo rotulo="Data de nascimento"><input type="date" value={manual.birthDate} onChange={(e) => setManual({ ...manual, birthDate: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="Função"><input value={manual.jobTitle} onChange={(e) => setManual({ ...manual, jobTitle: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="E-mail"><input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} className={campoClasses} /></Campo>
        <Campo rotulo="Telefone"><input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} className={campoClasses} /></Campo>
        <div className="sm:col-span-2"><Botao type="submit" disabled={savingManual}>{savingManual ? <Loader2 className="animate-spin" /> : <Check />}Adicionar à lista</Botao></div>
      </form></Cartao> : null}
      {participants.length ? <ul className="overflow-hidden rounded-[10px] bg-ds-superficie">{participants.map((p) => {
        const presente = presenteHoje(p);
        const bloqueado = !meuDiaAberto || marcando === p.id;
        return <li key={p.id} className="flex items-center gap-2.5 border-b border-ds-borda py-3 pr-3 pl-4 last:border-b-0">
          <div className="min-w-0 flex-1">
            <p className="truncate ds-body-s font-medium">{p.full_name}</p>
            <p className="truncate ds-caption text-ds-texto-2">{p.job_title || 'Sem função'}{p.days_total > 1 ? ` · ${p.days_present}/${p.days_total} dias` : ''}</p>
          </div>
          {training.status !== 'completed' ? <BotaoIcone rotulo={`Remover ${p.full_name}`} tom="perigo" className="hidden size-9 sm:inline-flex" onClick={() => void removeParticipant(p)}><Trash2 /></BotaoIcone> : null}
          <button type="button" disabled={bloqueado} onClick={() => void marcar(p, false)} aria-pressed={!presente && ausentes.has(p.id)} aria-label={`${p.full_name}: ausente`} className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ds-foco disabled:cursor-not-allowed', !presente && ausentes.has(p.id) ? 'border-ds-perigo bg-ds-perigo text-ds-texto-inv' : 'border-ds-borda text-ds-texto hover:border-ds-borda-forte', bloqueado && 'opacity-60')}><X className="size-[18px]" /></button>
          <button type="button" disabled={bloqueado} onClick={() => void marcar(p, true)} aria-pressed={presente} aria-label={`${p.full_name}: presente`} className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ds-foco disabled:cursor-not-allowed', presente ? 'border-ds-sucesso bg-ds-sucesso text-ds-texto-inv' : 'border-ds-borda text-ds-texto hover:border-ds-borda-forte', bloqueado && 'opacity-60')}>{marcando === p.id ? <Loader2 className="size-[18px] animate-spin" /> : <Check className="size-[18px]" />}</button>
        </li>;
      })}</ul> : <Vazio icone={<UsersRound />} titulo="Aguardando participantes" texto="Os participantes entram pelo QR Code. Você também pode adicionar à mão." />}
      {!meuDiaAberto && participants.length && training.status !== 'completed' ? <p className="ds-caption text-ds-texto-2">A chamada fica disponível com o seu dia iniciado.</p> : null}
    </div> : null}

    {aba === 'qr' ? <Cartao className="grid gap-5 p-5 md:grid-cols-[280px_1fr]">
      <div className="flex aspect-square items-center justify-center rounded-lg bg-ds-muted p-3">
        {emAndamento && image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={280} height={280} unoptimized className="h-auto w-full" /> : emAndamento ? <Loader2 className="size-7 animate-spin text-ds-amarelo-texto" /> : <p className="px-4 text-center ds-caption text-ds-texto-2">O QR Code aparece quando a turma é iniciada.</p>}
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="ds-h4">Formulário de presença</h3>
        <p className="ds-body-s text-ds-texto-2">Mostre o QR para a turma. Quem já fez check-in em outro dia só informa o CPF.</p>
        {url ? <p className="break-all rounded-md bg-ds-amarelo-suave p-3 ds-mono text-xs">{url}</p> : null}
        <div className="mt-auto flex flex-wrap gap-2">
          <Botao tipo="secundario" onClick={() => void copyUrl()} disabled={!url}>{copied ? <Check /> : <Copy />}{copied ? 'Link copiado' : 'Copiar link'}</Botao>
          <a href={`/lista-presenca/${training.id}`} target="_blank" rel="noopener" className={botaoClasses('fantasma', 'M')}><FileText />Lista de presença (PDF)</a>
        </div>
      </div>
    </Cartao> : null}

    {aba === 'fotos' ? <div className="flex flex-col gap-4">
      <Cartao className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><h3 className="ds-h4">Fotos da aula</h3><p className="ds-caption text-ds-texto-2">Registros da prática. Vão para a galeria da turma, que o cliente vê.</p></div>
          <label className={botaoClasses('primario', 'M', cn('cursor-pointer', enviando && 'pointer-events-none opacity-60'))}>{enviando === 'photo' ? <Loader2 className="animate-spin" /> : <Camera />}{enviando === 'photo' ? 'Enviando…' : 'Enviar fotos'}<input ref={entradaFotos} type="file" multiple accept={ACEITA_IMAGEM} onChange={(e) => void enviarArquivos('photo', e.currentTarget)} className="hidden" /></label>
        </div>
        <ListaDeArquivos arquivos={files === null ? null : fotosDaAula} vazio="Nenhuma foto da aula ainda. JPG, PNG, WEBP ou HEIC, até 4 MB cada." />
      </Cartao>
      <Cartao className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><h3 className="ds-h4">Lista assinada</h3><p className="ds-caption text-ds-texto-2">Fotografe a lista de presença assinada em papel. Ela é arquivada nos documentos da turma e é obrigatória para encerrar o último dia.</p></div>
          <label className={botaoClasses(listasEnviadas ? 'secundario' : 'primario', 'M', cn('cursor-pointer', enviando && 'pointer-events-none opacity-60'))}>{enviando === 'attendance' ? <Loader2 className="animate-spin" /> : <Upload />}{enviando === 'attendance' ? 'Enviando…' : 'Enviar lista'}<input type="file" multiple accept={ACEITA_IMAGEM} onChange={(e) => void enviarArquivos('attendance', e.currentTarget)} className="hidden" /></label>
        </div>
        <ListaDeArquivos arquivos={files === null ? null : (files ?? []).filter((f) => f.kind === 'attendance')} vazio="Nenhuma lista enviada ainda." />
      </Cartao>
    </div> : null}

    {aba === 'checklist' ? <Cartao className="px-5 py-2">
      <ItemChecklist ok={Boolean(meuDiaAberto || meuDiaFechado || training.status === 'completed')} titulo="Dia iniciado" detalhe={diaAtual ? `Dia ${diaAtual.day_number}${dias.length > 1 ? ` de ${dias.length}` : ''}${janela ? ` · ${janela}` : ''}` : 'Sem dia atribuído'} />
      <ItemChecklist ok={participants.length > 0 && presentes === participants.length} parcial={presentes > 0} titulo="Chamada do dia" detalhe={`${presentes} de ${participants.length} presentes`} />
      <ItemChecklist ok={listasEnviadas > 0} obrigatorio={ultimoPendente} titulo="Lista assinada enviada" detalhe={listasEnviadas ? `${listasEnviadas} ${listasEnviadas === 1 ? 'arquivo' : 'arquivos'}` : ultimoPendente ? 'Obrigatória para finalizar a turma' : 'Cobrada no último dia'} acao={<button type="button" onClick={() => setAba('fotos')} className={botaoClasses('link', 'P')}>Enviar</button>} />
      <ItemChecklist ok={fotosDaAula.length > 0} titulo="Fotos da aula" detalhe={fotosDaAula.length ? `${fotosDaAula.length} ${fotosDaAula.length === 1 ? 'foto' : 'fotos'}` : 'Opcional, mas o cliente vê'} acao={<button type="button" onClick={() => setAba('fotos')} className={botaoClasses('link', 'P')}>Enviar</button>} />
      <ItemChecklist ok={completos === participants.length && participants.length > 0} parcial={completos > 0} titulo="Presença completa" detalhe={`${completos} de ${participants.length} com presença em todos os dias (recebem certificado)`} />
    </Cartao> : null}

    {/* Barra inferior (Figma): Fotos + Finalizar turma. */}
    {training.status !== 'completed' && !meuDiaFechado ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ds-borda bg-ds-superficie px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:left-[264px] lg:px-10">
      {confirmando ? <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <div><strong className="block ds-body-s font-semibold text-ds-perigo">{ultimoPendente ? 'Finalizar esta turma?' : `Encerrar o dia ${diaAtual?.day_number ?? 1}?`}</strong><p className="ds-caption text-ds-texto-2">{ultimoPendente ? `A lista é congelada e os certificados saem para ${completos} de ${participants.length} participante(s): só quem tem presença em todos os dias. Não dá para reabrir.` : 'O seu dia é fechado e a turma segue nos outros dias. Os certificados saem só no último.'}</p></div>
        <div className="flex gap-2.5"><Botao tipo="secundario" onClick={() => setConfirmando(false)}>Voltar</Botao><Botao tipo="perigo" className="flex-1" onClick={() => void complete()} disabled={ending}>{ending ? <Loader2 className="animate-spin" /> : <Check />}{ending ? 'Encerrando…' : 'Sim, encerrar'}</Botao></div>
      </div> : <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {travadoSemLista && meuDiaAberto ? <p className="ds-caption text-ds-perigo">Último dia: envie a foto da lista assinada para liberar a finalização.</p> : null}
        <div className="flex gap-2.5">
          <Botao tipo="secundario" onClick={() => { setAba('fotos'); entradaFotos.current?.click(); }}>Fotos <Camera /></Botao>
          <Botao className="flex-1" onClick={() => setConfirmando(true)} disabled={!meuDiaAberto || ending || travadoSemLista}>{acaoEncerrar} <ArrowRight /></Botao>
        </div>
      </div>}
    </div> : null}
  </div>;
}

function ListaDeArquivos({ arquivos, vazio }: { arquivos: TrainingFile[] | null; vazio: string }) {
  if (arquivos === null) return <div className="flex h-20 items-center justify-center"><Loader2 className="size-5 animate-spin text-ds-amarelo-texto" /></div>;
  if (arquivos.length === 0) return <p className="rounded-lg border border-dashed border-ds-borda p-4 text-center ds-caption text-ds-texto-2">{vazio}</p>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{arquivos.map((file) => <figure key={file.id} className="overflow-hidden rounded-lg border border-ds-borda">
    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="relative block aspect-[4/3] bg-ds-muted">
      {file.stored ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 25vw, 50vw" className="object-cover" /> : <span className="flex h-full items-center justify-center ds-caption text-ds-texto-2">Sem conteúdo</span>}
    </a>
    <figcaption className="flex items-center gap-2 p-2"><span className="min-w-0 flex-1"><span className="block truncate ds-caption font-medium" title={file.name}>{file.name}</span><span className="block ds-caption text-ds-texto-2">{formatMoment(file.createdAt)}</span></span>{file.stored ? <a href={`/api/files/${file.id}?download=1`} aria-label={`Baixar ${file.name}`} className="rounded p-1 hover:bg-ds-muted"><Download className="size-4" /></a> : null}</figcaption>
  </figure>)}</div>;
}

function ItemChecklist({ ok, parcial, obrigatorio, titulo, detalhe, acao }: { ok: boolean; parcial?: boolean; obrigatorio?: boolean; titulo: string; detalhe: string; acao?: ReactNode }) {
  return <div className="flex items-center gap-3 border-b border-ds-borda py-3 last:border-b-0">
    <span className={cn('flex size-[26px] shrink-0 items-center justify-center rounded-full', ok ? 'bg-ds-sucesso-suave text-ds-sucesso' : obrigatorio ? 'bg-ds-perigo-suave text-ds-perigo' : parcial ? 'bg-ds-atencao-suave text-ds-atencao' : 'bg-ds-muted text-ds-texto-2')}>{ok ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}</span>
    <div className="min-w-0 flex-1"><p className="ds-body-s font-medium">{titulo}{obrigatorio && !ok ? <Tag tom="perigo" className="ml-2 align-middle">Obrigatório</Tag> : null}</p><p className="ds-caption text-ds-texto-2">{detalhe}</p></div>
    {!ok && acao ? acao : null}
  </div>;
}
