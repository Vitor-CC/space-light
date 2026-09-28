'use client';

import { ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, ExternalLink, FileArchive, FileText, FolderOpen, Images, Loader2, RefreshCw, Search, Trash2, TriangleAlert, UploadCloud, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';

import { pendenciasDaEquipe, SinoEquipe } from '@/components/company-portal/company-topo';
import type { NavegarEquipe } from '@/components/company-portal/company-topo';
import { EmptyState, formatDate, formatDayMonth, formatFileSize, isoFromDate } from '@/components/company-portal/company-ui';
import { BarraSuperior, Botao, campoClasses, Chip, tabelaClasses as tb } from '@/components/ds/base';
import { Abas } from '@/components/ds/interativo';
import { Button } from '@/components/ui/button';
import { checklistDaTurma } from '@/lib/checklist';
import type { CompanyDashboardData, CompanyFile, CompanyTraining } from '@/lib/company-types';
import { downloadFilesAsZip } from '@/lib/download-zip';
import { deleteCompanyFile, generateCertificates, uploadCompanyFiles } from '@/lib/mock-company-database';
import { LIMITE_UPLOAD_LABEL } from '@/lib/upload-limites';
import { cn } from '@/lib/utils';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;
type Aba = 'photo' | 'document' | 'upload';
type Kind = 'photo' | 'document';

const kindCopy: Record<Kind, { label: string; plural: string; accept: string; hint: string }> = {
  photo: {
    label: 'Foto',
    plural: 'Fotos',
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
    hint: `JPG, PNG, WEBP ou HEIC — até ${LIMITE_UPLOAD_LABEL} cada.`,
  },
  document: {
    label: 'Documento',
    plural: 'Documentos',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
    hint: `PDF, Word, Excel, CSV ou TXT — até ${LIMITE_UPLOAD_LABEL} cada.`,
  },
};

/**
 * A lista de presença assinada é comprovante, então mora em Documentos —
 * misturá-la com as fotos da aula era o que atrapalhava achar as coisas.
 */
function pertence(file: CompanyFile, aba: Kind) {
  return aba === 'document' ? file.kind === 'document' || file.kind === 'attendance' : file.kind === 'photo';
}

function FileActions({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  if (file.status !== 'stored') {
    return <div className="flex items-center gap-2">
      <span className="rounded-md inline-flex h-10 items-center gap-2 border border-ds-amarelo bg-ds-amarelo-suave px-3 ds-botao text-ds-amarelo-texto" title="Só a ficha deste arquivo existe: o conteúdo não está no armazenamento."><TriangleAlert className="size-3.5" />Arquivo não salvo</span>
      <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="rounded-md inline-flex size-10 items-center justify-center border border-ds-borda text-ds-texto-2 hover:border-ds-perigo hover:text-ds-perigo"><Trash2 className="size-3.5" /></button>
    </div>;
  }
  return <div className="flex items-center gap-2">
    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="rounded-md inline-flex h-10 items-center gap-2 border border-ds-borda px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv"><ExternalLink className="size-3.5" />Abrir</a>
    <a href={`/api/files/${file.id}?download=1`} className="rounded-md inline-flex h-10 items-center gap-2 border border-ds-borda px-3 ds-botao hover:bg-ds-inverso hover:text-ds-texto-inv"><Download className="size-3.5" />Baixar</a>
    <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="rounded-md inline-flex size-10 items-center justify-center border border-ds-borda text-ds-texto-2 hover:border-ds-perigo hover:text-ds-perigo"><Trash2 className="size-3.5" /></button>
  </div>;
}

function PhotoCard({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  return <article className="overflow-hidden rounded-lg border border-ds-borda bg-ds-superficie">
    <div className="relative aspect-[4/3] bg-ds-muted">
      {file.status === 'stored'
        ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        : <span className="flex h-full items-center justify-center ds-caps text-ds-texto-2">Sem conteúdo</span>}
    </div>
    <div className="p-4">
      <strong className="block truncate ds-body-s font-medium" title={file.name}>{file.name}</strong>
      <p className="mt-1 ds-caption text-ds-texto-2">{formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-ds-amarelo bg-ds-amarelo-suave px-3 py-2 ds-caption text-ds-amarelo-texto">Só a ficha ficou: o conteúdo não está no armazenamento. Exclua e envie de novo.</p> : null}
      <div className="mt-3"><FileActions file={file} onDelete={onDelete} /></div>
    </div>
  </article>;
}

function DocumentRow({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  const ehLista = file.kind === 'attendance';
  return <article className="grid gap-4 rounded-lg border border-ds-borda bg-ds-superficie p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
    <span className={cn('flex size-11 items-center justify-center rounded-md', ehLista ? 'bg-ds-amarelo text-ds-texto' : 'bg-ds-inverso text-ds-amarelo')}>{ehLista ? <Images className="size-5" /> : <FileText className="size-5" />}</span>
    <div className="min-w-0">
      {ehLista ? <span className="ds-caps text-ds-amarelo-texto">Lista assinada</span> : null}
      <h3 className="truncate ds-body-s font-semibold" title={file.name}>{file.name}</h3>
      <p className="mt-1 ds-caption text-ds-texto-2">{formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-ds-amarelo bg-ds-amarelo-suave px-3 py-2 ds-caption text-ds-amarelo-texto">Só a ficha ficou: o conteúdo não está no armazenamento. Exclua este registro e envie o arquivo de novo.</p> : null}
    </div>
    <FileActions file={file} onDelete={onDelete} />
  </article>;
}

/** Arquivos de uma turma: fotos, documentos (com a lista assinada) e envio em lote. */
function ArquivosDaTurma({ training, data, reload, notify, voltar }: { training: CompanyTraining; data: CompanyDashboardData; reload: Reload; notify: Notify; voltar: () => void }) {
  const [aba, setAba] = useState<Aba>('photo');
  const [uploadKind, setUploadKind] = useState<Kind>('photo');
  const [queue, setQueue] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState('');
  const [zipping, setZipping] = useState('');
  const [gerando, setGerando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const daTurma = useMemo(() => data.files.filter((file) => file.training_id === training.id), [data.files, training.id]);
  const aberta: Kind = aba === 'upload' ? uploadKind : aba;
  const visible = daTurma.filter((file) => pertence(file, aberta));
  const downloadable = visible.filter((file) => file.status === 'stored');
  const copy = kindCopy[aberta];
  const emitidos = daTurma.filter((file) => file.kind === 'document').length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    setQueue((current) => [...current, ...Array.from(list)]);
  }

  async function send() {
    if (queue.length === 0) return;
    setBusy('Enviando…');
    try {
      const result = await uploadCompanyFiles({
        clientId: training.client_id, trainingId: training.id, kind: uploadKind, files: queue,
        onProgress: (done, total, name) => setBusy(done >= total ? 'Finalizando…' : `Enviando ${done + 1} de ${total}: ${name}`),
      });
      setQueue([]);
      notify(result.rejected.length
        ? `${result.saved} enviado(s). Recusado(s): ${result.rejected.join(', ')} — tipo não aceito ou acima de ${LIMITE_UPLOAD_LABEL}.`
        : `${result.saved} arquivo(s) enviado(s).`);
      await reload();
      setAba(uploadKind);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao enviar os arquivos.');
    } finally {
      setBusy('');
    }
  }

  async function downloadAll() {
    if (downloadable.length === 0) return;
    setZipping('Preparando…');
    try {
      const result = await downloadFilesAsZip({
        entries: downloadable.map((file) => ({ id: file.id, name: file.name })),
        zipName: `${copy.plural.toLowerCase()}-${training.nr}-${training.code}`.replace(/\s+/g, '-'),
        onProgress: (done, total) => setZipping(done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`),
      });
      notify(result.failed.length ? `${result.zipped} arquivo(s) no zip. Falhou: ${result.failed.join(', ')}.` : `${result.zipped} arquivo(s) baixados em zip.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao montar o zip.');
    } finally {
      setZipping('');
    }
  }

  async function remove(file: CompanyFile) {
    if (!window.confirm(`Excluir "${file.name}" definitivamente? O arquivo sai do portal do cliente também.`)) return;
    try { await deleteCompanyFile(file.id); notify('Arquivo excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o arquivo.'); }
  }

  /** Gera (ou regera) certificados, certificado da empresa e atestado da turma. */
  async function gerarDocumentos() {
    setGerando(true);
    try {
      const resultado = await generateCertificates(training.id);
      notify(`${resultado.documents.length} documento(s) gerados e arquivados nesta turma.`);
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao gerar os documentos.'); }
    finally { setGerando(false); }
  }

  return <div className="flex flex-col gap-5">
    <button type="button" onClick={voltar} className="inline-flex w-fit items-center gap-1.5 ds-body-s font-medium text-ds-texto-2 hover:text-ds-texto ds-foco"><ArrowLeft className="size-4" />Documentação</button>
    <BarraSuperior titulo={`${training.nr} · ${training.internal_label || training.title}`} subtitulo={`Turma ${training.code} · ${training.client_name} · ${formatDate(training.sessions[training.sessions.length - 1]?.session_date ?? training.training_date)}`} />
    <Abas rotulo="Arquivos da turma" ativa={aba} onChange={setAba} abas={[
      { id: 'photo', rotulo: 'Fotos', contador: daTurma.filter((f) => pertence(f, 'photo')).length },
      { id: 'document', rotulo: 'Documentos', contador: daTurma.filter((f) => pertence(f, 'document')).length },
      { id: 'upload', rotulo: 'Enviar' },
    ]} />

    {aba === 'upload' ? <section className="max-w-2xl rounded-lg bg-ds-superficie p-6 md:p-8">
      <h2 className="ds-h4">Enviar arquivos</h2>
      <p className="mt-2 ds-body-s text-ds-texto-2">Pode escolher vários de uma vez: eles são enviados um a um, para você acompanhar o progresso e uma falha não derrubar o lote. Turma encerrada também recebe arquivo novo, e gerar os documentos de novo não apaga o que foi enviado aqui.</p>
      <div className="mt-5 flex gap-1 rounded-lg bg-ds-muted p-1">
        {(['photo', 'document'] as Kind[]).map((option) => <button key={option} type="button" onClick={() => { setUploadKind(option); setQueue([]); }} className={cn('flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 ds-body-s font-medium transition', uploadKind === option ? 'bg-ds-superficie text-ds-texto shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-ds-texto-2 hover:text-ds-texto')}>
          {option === 'photo' ? <Images className="size-4" /> : <FileText className="size-4" />}{kindCopy[option].plural}
        </button>)}
      </div>
      <input ref={inputRef} type="file" multiple accept={copy.accept} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={cn('mt-4 flex min-h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition', dragging ? 'border-ds-amarelo bg-ds-amarelo-suave' : 'border-ds-borda bg-ds-muted hover:border-ds-amarelo')}>
        <span className="flex size-12 items-center justify-center rounded-md bg-ds-inverso text-ds-amarelo"><UploadCloud className="size-5" /></span>
        <strong className="mt-4 ds-body-s font-semibold">Arraste {copy.plural.toLowerCase()} aqui</strong>
        <span className="mt-2 ds-caption text-ds-texto-2">{copy.hint}</span>
      </button>
      {queue.length > 0 ? <div className="mt-4 rounded-lg border border-ds-borda">
        <div className="flex items-center justify-between bg-ds-muted px-4 py-3"><strong className="ds-caption">{queue.length} na fila</strong><button type="button" onClick={() => setQueue([])} className="ds-caps text-ds-perigo">Limpar</button></div>
        <div className="max-h-44 divide-y divide-ds-borda overflow-y-auto">{queue.slice(0, 40).map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 ds-caption"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-ds-texto-2">{formatFileSize(file.size)}</span></div>)}{queue.length > 40 ? <p className="px-4 py-2.5 ds-caption text-ds-texto-2">+ {queue.length - 40} arquivos</p> : null}</div>
      </div> : null}
      <Button type="button" disabled={queue.length === 0 || Boolean(busy)} onClick={() => void send()} className="mt-5 h-12 w-full bg-ds-amarelo ds-botao text-ds-texto hover:bg-[#eab900] disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{busy || `Enviar ${copy.plural.toLowerCase()}`}</Button>
    </section> : <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Botao tipo="secundario" onClick={() => void downloadAll()} disabled={downloadable.length === 0 || Boolean(zipping)}>{zipping ? <Loader2 className="animate-spin" /> : <FileArchive />}{zipping || (downloadable.length > 1 ? `Baixar os ${downloadable.length} em zip` : 'Baixar em zip')}</Botao>
        {aba === 'document' ? <Botao onClick={() => void gerarDocumentos()} disabled={gerando}>{gerando ? <Loader2 className="animate-spin" /> : <RefreshCw />}{gerando ? 'Gerando…' : emitidos === 0 ? 'Gerar documentos' : 'Gerar de novo'}</Botao> : null}
      </div>
      {aba === 'document' ? <p className="rounded-md border-l-4 border-ds-amarelo bg-ds-amarelo-suave p-4 ds-caption text-ds-amarelo-texto">Um certificado por aluno, mais o certificado da empresa e o atestado. Se alguém entrou ou saiu da lista de presença depois da emissão, use <strong>Gerar de novo</strong>: os certificados de quem saiu são recolhidos e os que ficaram são regravados.</p> : null}
      {visible.length === 0
        ? <EmptyState icon={aberta === 'photo' ? Images : FolderOpen} title={`Nenhum${aberta === 'photo' ? 'a foto' : ' documento'} nesta turma`} text="Envie na aba Enviar." />
        : aberta === 'photo'
          ? <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{visible.map((file) => <PhotoCard key={file.id} file={file} onDelete={remove} />)}</div>
          : <div className="flex flex-col gap-3">{visible.map((file) => <DocumentRow key={file.id} file={file} onDelete={remove} />)}</div>}
    </section>}
  </div>;
}

type Status = 'ok' | 'pendente' | 'falta' | 'nada';
const POR_PAGINA = 20;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Célula de status da tabela (Figma 87:2236): ícone e texto na cor da situação. */
function Celula({ status, texto }: { status: Status; texto: string }) {
  const Icone = status === 'ok' ? CheckCircle2 : status === 'falta' ? XCircle : Clock3;
  if (status === 'nada') return <span className="ds-body-s text-ds-texto-2">{texto}</span>;
  return <span className={cn('inline-flex items-center gap-1.5 ds-body-s whitespace-nowrap', status === 'ok' ? 'text-ds-texto' : status === 'falta' ? 'text-ds-perigo' : 'text-ds-texto-2')}>
    <Icone className={cn('size-4 shrink-0', status === 'ok' ? 'text-ds-sucesso' : status === 'falta' ? 'text-ds-perigo' : 'text-ds-atencao')} />{texto}
  </span>;
}

/**
 * Documentação (Figma 87:2234): o que falta em cada turma já realizada — lista
 * assinada, fotos, checklist e documentos. A linha abre os arquivos da turma.
 */
export function CompanyFiles({ data, reload, notify, navegar }: { data: CompanyDashboardData; reload: Reload; notify: Notify; navegar: NavegarEquipe }) {
  const [agora] = useState(() => Date.now());
  const hoje = isoFromDate(new Date(agora));
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'pendencia' | 'completas'>('pendencia');
  const [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState('todos');
  const [periodo, setPeriodo] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const pendencias = useMemo(() => pendenciasDaEquipe(data, hoje, agora), [data, hoje, agora]);

  // Só entra turma que já começou: antes disso não há o que cobrar.
  const linhas = useMemo(() => data.trainings
    .filter((t) => (t.sessions[0]?.session_date ?? t.training_date) <= hoje)
    .map((t) => {
      const arquivos = data.files.filter((f) => f.training_id === t.id);
      const listas = arquivos.filter((f) => f.kind === 'attendance').length;
      const fotos = arquivos.filter((f) => f.kind === 'photo').length;
      const documentos = arquivos.filter((f) => f.kind === 'document').length;
      const checklist = checklistDaTurma(t, data.checklistTemplates, data.checklistMarks);
      const ultimo = t.sessions[t.sessions.length - 1];
      const pendente = !listas || !fotos || (checklist.total > 0 && checklist.feitos < checklist.total);
      return { t, listas, fotos, documentos, checklist, data: ultimo?.session_date ?? t.training_date, instrutor: ultimo?.instructor_name ?? '', pendente };
    })
    .sort((a, b) => b.data.localeCompare(a.data)), [data.trainings, data.files, data.checklistTemplates, data.checklistMarks, hoje]);

  const ano = hoje.slice(0, 4);
  const doAno = linhas.filter((l) => l.data.startsWith(ano));
  const semLista = linhas.filter((l) => !l.listas).length;
  const semFotos = linhas.filter((l) => !l.fotos).length;
  const itensAbertos = linhas.reduce((soma, l) => soma + (l.checklist.total - l.checklist.feitos), 0);
  const periodos = [...new Set(linhas.map((l) => l.data.slice(0, 7)))].sort().reverse();
  const clientes = [...new Map(linhas.map((l) => [l.t.client_id, l.t.client_name])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  const termo = busca.trim().toLowerCase();
  const base = linhas.filter((l) => (cliente === 'todos' || l.t.client_id === cliente) && (periodo === 'todos' || l.data.startsWith(periodo)) && (!termo || `${l.t.code} ${l.t.client_name} ${l.t.nr} ${l.t.title}`.toLowerCase().includes(termo)));
  const filtradas = base.filter((l) => filtro === 'todas' || (filtro === 'pendencia' ? l.pendente : !l.pendente));
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const visiveis = filtradas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const rotuloPeriodo = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1]}/${p.slice(0, 4)}`;

  const treinamento = aberta ? data.trainings.find((t) => t.id === aberta) : undefined;
  if (treinamento) return <ArquivosDaTurma training={treinamento} data={data} reload={reload} notify={notify} voltar={() => setAberta(null)} />;

  function exportar() {
    const cabecalho = ['Turma', 'Cliente', 'Treinamento', 'Data', 'Instrutor', 'Lista assinada', 'Fotos', 'Checklist', 'Documentos'];
    const corpo = filtradas.map((l) => [l.t.code, l.t.client_name, `${l.t.nr} · ${l.t.title}`, l.data.split('-').reverse().join('/'), l.instrutor, l.listas ? 'Enviada' : 'Não enviada', String(l.fotos), l.checklist.total ? `${l.checklist.feitos}/${l.checklist.total}` : '', String(l.documentos)]);
    const csv = [cabecalho, ...corpo].map((linha) => linha.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentacao-${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const indicador = (rotulo: string, valor: number, apoio: string, perigo: boolean) => <div className={cn('rounded-lg border-t-[3px] bg-ds-superficie p-5', perigo && valor > 0 ? 'border-ds-perigo' : 'border-ds-amarelo-texto')}>
    <span className="ds-caps text-ds-texto-2">{rotulo}</span>
    <p className="mt-3 font-ds-display text-[34px] leading-[40px] font-bold tracking-[-0.02em] sm:text-[40px] sm:leading-[46px]">{valor}</p>
    <p className="mt-3 ds-body-s text-ds-texto-2">{apoio}</p>
  </div>;
  const seletor = (rotulo: string, valor: string, mudar: (v: string) => void, opcoes: Array<[string, string]>) => <label className="relative inline-flex h-10 items-center gap-2 rounded-md border border-ds-borda bg-ds-superficie px-3 ds-body-s font-medium">
    <span className="pointer-events-none">{rotulo}: {opcoes.find(([v]) => v === valor)?.[1] ?? valor}</span><ChevronDown className="pointer-events-none size-3.5" />
    <select aria-label={rotulo} value={valor} onChange={(e) => { mudar(e.target.value); setPagina(1); }} className="absolute inset-0 cursor-pointer opacity-0">{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
  </label>;

  return <div className="flex flex-col gap-5">
    <BarraSuperior titulo="Documentação" subtitulo="Registros de cada turma: lista assinada, fotos, checklist e documentos." notificacoes={<SinoEquipe pendencias={pendencias} navegar={navegar} />} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indicador('Turmas com pendência', linhas.filter((l) => l.pendente).length, `de ${doAno.length} ${doAno.length === 1 ? 'turma' : 'turmas'} em ${ano}`, false)}
      {indicador('Listas assinadas faltando', semLista, 'turmas já realizadas', true)}
      {indicador('Turmas sem fotos', semFotos, 'parte prática sem registro', true)}
      {indicador('Checklist incompleto', itensAbertos, itensAbertos === 1 ? 'item não marcado' : 'itens não marcados', false)}
    </div>
    <div className="flex flex-wrap gap-2">
      {([['todas', 'Todas', base.length], ['pendencia', 'Com pendência', base.filter((l) => l.pendente).length], ['completas', 'Completas', base.filter((l) => !l.pendente).length]] as const).map(([id, rotulo, n]) => <Chip key={id} selecionado={filtro === id} onClick={() => { setFiltro(id); setPagina(1); }}>{rotulo} · {n}</Chip>)}
    </div>
    <section className="flex flex-col overflow-hidden rounded-lg bg-ds-superficie">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-ds-borda px-5 py-4">
        <label className="relative w-full sm:w-[320px]"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ds-texto-2" /><input aria-label="Buscar turma ou cliente" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar turma ou cliente" className={cn(campoClasses, 'min-h-10 py-2.5 pl-10 ds-body-s')} /></label>
        {seletor('Cliente', cliente, setCliente, [['todos', 'todos'], ...clientes])}
        {seletor('Período', periodo, setPeriodo, [['todos', 'todos'], ...periodos.map((p): [string, string] => [p, rotuloPeriodo(p)])])}
        <span className="hidden flex-1 sm:block" />
        <button type="button" onClick={exportar} disabled={!filtradas.length} className="inline-flex h-10 items-center gap-2 rounded-md border border-ds-borda px-3 ds-body-s font-medium hover:border-ds-borda-forte disabled:opacity-50 ds-foco"><Download className="size-4" />Exportar</button>
      </div>
      {visiveis.length ? <div className={tb.rolagem}><table className={cn(tb.tabela, 'min-w-[980px]')}>
        <thead className={tb.cabeca}><tr><th className={tb.th}>Turma</th><th className={tb.th}>Cliente · treinamento</th><th className={tb.th}>Data</th><th className={tb.th}>Instrutor</th><th className={tb.th}>Lista</th><th className={tb.th}>Fotos</th><th className={tb.th}>Checklist</th><th className={tb.th}>Documentos</th><th className={tb.th}><span className="sr-only">Abrir</span></th></tr></thead>
        <tbody>{visiveis.map((l) => <tr key={l.t.id} onClick={() => setAberta(l.t.id)} className={cn(tb.linha, tb.linhaClicavel)}>
          <td className={tb.td}><span className={tb.codigo}>{l.t.code}</span></td>
          <td className={tb.td}><span className="block ds-body-s font-medium">{l.t.client_name}</span><span className="block max-w-[260px] truncate ds-body-s text-ds-texto-2">{l.t.nr} · {l.t.title}</span></td>
          <td className={cn(tb.td, 'whitespace-nowrap')}>{formatDayMonth(l.data)}</td>
          <td className={cn(tb.td, 'max-w-[140px] truncate')}>{l.instrutor || '—'}</td>
          <td className={tb.td}><Celula status={l.listas ? 'ok' : 'falta'} texto={l.listas ? 'Enviada' : 'Não enviada'} /></td>
          <td className={tb.td}><Celula status={l.fotos ? 'ok' : 'falta'} texto={l.fotos ? `${l.fotos} ${l.fotos === 1 ? 'foto' : 'fotos'}` : 'Nenhuma'} /></td>
          <td className={tb.td}>{l.checklist.total ? <Celula status={l.checklist.feitos === l.checklist.total ? 'ok' : 'pendente'} texto={`${l.checklist.feitos}/${l.checklist.total}`} /> : <Celula status="nada" texto="—" />}</td>
          <td className={tb.td}><Celula status={l.documentos ? 'ok' : 'pendente'} texto={l.documentos ? `${l.documentos} ${l.documentos === 1 ? 'arquivo' : 'arquivos'}` : 'Nenhum'} /></td>
          <td className={cn(tb.td, 'text-right')}><ChevronRight className="inline size-4 text-ds-texto-2" /></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState icon={FolderOpen} title={linhas.length ? 'Nenhuma turma neste filtro' : 'Nenhuma turma realizada ainda'} text={linhas.length ? 'Ajuste a busca ou os filtros.' : 'As turmas aparecem aqui a partir do primeiro dia.'} />}
      {filtradas.length ? <div className="flex items-center justify-between border-t border-ds-borda px-5 py-3">
        <span className="ds-body-s text-ds-texto-2">Mostrando {visiveis.length} de {filtradas.length} {filtradas.length === 1 ? 'turma' : 'turmas'}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Página anterior" disabled={atual === 1} onClick={() => setPagina(atual - 1)} className="flex size-8 items-center justify-center rounded-md border border-ds-borda disabled:opacity-40 ds-foco"><ChevronLeft className="size-4" /></button>
          {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => <button key={n} type="button" aria-current={n === atual ? 'page' : undefined} onClick={() => setPagina(n)} className={cn('flex size-8 items-center justify-center rounded-md ds-body-s font-medium ds-foco', n === atual ? 'bg-ds-inverso text-ds-texto-inv' : 'border border-ds-borda')}>{n}</button>)}
          <button type="button" aria-label="Próxima página" disabled={atual === paginas} onClick={() => setPagina(atual + 1)} className="flex size-8 items-center justify-center rounded-md border border-ds-borda disabled:opacity-40 ds-foco"><ChevronRight className="size-4" /></button>
        </div>
      </div> : null}
    </section>
  </div>;
}
