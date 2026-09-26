'use client';

import { Download, ExternalLink, FileArchive, FileText, FolderOpen, Images, Loader2, RefreshCw, Trash2, TriangleAlert, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';

import { EmptyState, formatDate, formatFileSize, labelClass, selectClass, SubTabs } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import type { CompanyDashboardData, CompanyFile } from '@/lib/company-types';
import { dataDoDia, rotuloDiaDaTurma } from '@/lib/dias-da-turma';
import { downloadFilesAsZip } from '@/lib/download-zip';
import { deleteCompanyFile, generateCertificates, uploadCompanyFiles } from '@/lib/mock-company-database';

type Aba = 'photo' | 'document' | 'upload';
type Kind = 'photo' | 'document';

const kindCopy: Record<Kind, { label: string; plural: string; accept: string; hint: string }> = {
  photo: {
    label: 'Foto',
    plural: 'Fotos',
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
    hint: 'JPG, PNG, WEBP ou HEIC — até 4 MB cada.',
  },
  document: {
    label: 'Documento',
    plural: 'Documentos',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
    hint: 'PDF, Word, Excel, CSV ou TXT — até 4 MB cada.',
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
  return <article className="border border-ds-borda bg-ds-superficie">
    <div className="relative aspect-[4/3] bg-ds-muted">
      {file.status === 'stored'
        ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        : <span className="flex h-full items-center justify-center ds-caps text-ds-texto-2">Sem conteúdo</span>}
    </div>
    <div className="p-4">
      <span className="block ds-caps text-ds-amarelo-texto">{file.client_name} · {file.training_nr}</span>
      <strong className="mt-1 block truncate text-sm" title={file.name}>{file.name}</strong>
      <p className="mt-1 text-[11px] text-ds-texto-2">{formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-ds-amarelo bg-ds-amarelo-suave px-3 py-2 text-[11px] leading-relaxed text-ds-amarelo-texto">Só a ficha ficou: o conteúdo não está no armazenamento. Exclua e envie de novo.</p> : null}
      <div className="mt-3"><FileActions file={file} onDelete={onDelete} /></div>
    </div>
  </article>;
}

function DocumentRow({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  const ehLista = file.kind === 'attendance';
  return <article className="rounded-lg grid gap-4 border border-ds-borda bg-ds-superficie p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
    <span className={`rounded-md flex size-11 items-center justify-center ${ehLista ? 'bg-ds-amarelo text-black' : 'bg-black text-ds-amarelo'}`}>{ehLista ? <Images className="size-5" /> : <FileText className="size-5" />}</span>
    <div className="min-w-0">
      <span className="ds-caps text-ds-amarelo-texto">{file.client_name} · {file.training_nr}{ehLista ? ' · Lista assinada' : ''}</span>
      <h3 className="mt-1 truncate text-sm font-bold" title={file.name}>{file.name}</h3>
      <p className="mt-1 text-[11px] text-ds-texto-2">{file.training_title} · {formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-ds-amarelo bg-ds-amarelo-suave px-3 py-2 text-[11px] leading-relaxed text-ds-amarelo-texto">Só a ficha ficou: o conteúdo não está no armazenamento. Exclua este registro e envie o arquivo de novo.</p> : null}
    </div>
    <FileActions file={file} onDelete={onDelete} />
  </article>;
}

export function CompanyFiles({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [aba, setAba] = useState<Aba>('photo');
  const [uploadKind, setUploadKind] = useState<Kind>('photo');
  const [clientId, setClientId] = useState(data.clients[0]?.id ?? '');
  const [trainingId, setTrainingId] = useState('');
  const [queue, setQueue] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState('');
  const [zipping, setZipping] = useState('');
  const [gerando, setGerando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clientTrainings = useMemo(
    () => data.trainings.filter((training) => training.client_id === clientId),
    [data.trainings, clientId],
  );

  // Sem turma escolhida, a lista mostra tudo do cliente.
  const scoped = useMemo(
    () => data.files.filter((file) => (trainingId ? file.training_id === trainingId : file.client_id === clientId)),
    [data.files, clientId, trainingId],
  );

  const counts = useMemo(() => ({
    photo: scoped.filter((file) => pertence(file, 'photo')).length,
    document: scoped.filter((file) => pertence(file, 'document')).length,
  }), [scoped]);

  const aberta: Kind = aba === 'upload' ? uploadKind : aba;
  const visible = useMemo(() => scoped.filter((file) => pertence(file, aberta)), [scoped, aberta]);
  const downloadable = useMemo(() => visible.filter((file) => file.status === 'stored'), [visible]);

  const selectedTraining = clientTrainings.find((training) => training.id === trainingId);
  const clientName = data.clients.find((client) => client.id === clientId)?.name ?? '';
  const copy = kindCopy[aberta];

  function changeClient(value: string) {
    setClientId(value);
    setTrainingId('');
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setQueue((current) => [...current, ...Array.from(list)]);
  }

  async function send() {
    if (!trainingId || queue.length === 0) return;
    setBusy('Enviando…');
    try {
      const result = await uploadCompanyFiles({
        clientId, trainingId, kind: uploadKind, files: queue,
        onProgress: (done, total, name) => setBusy(done >= total ? 'Finalizando…' : `Enviando ${done + 1} de ${total}: ${name}`),
      });
      setQueue([]);
      notify(result.rejected.length
        ? `${result.saved} enviado(s). Recusado(s): ${result.rejected.join(', ')} — tipo não aceito ou acima de 4 MB.`
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
      const rotulo = selectedTraining ? `${selectedTraining.nr}-${selectedTraining.code}` : clientName;
      const result = await downloadFilesAsZip({
        entries: downloadable.map((file) => ({ id: file.id, name: file.name })),
        zipName: `${copy.plural.toLowerCase()}-${rotulo}`.replace(/\s+/g, '-'),
        onProgress: (done, total) => setZipping(done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`),
      });
      notify(result.failed.length
        ? `${result.zipped} arquivo(s) no zip. Falhou: ${result.failed.join(', ')}.`
        : `${result.zipped} arquivo(s) baixados em zip.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao montar o zip.');
    } finally {
      setZipping('');
    }
  }

  async function remove(file: CompanyFile) {
    if (!window.confirm(`Excluir "${file.name}" definitivamente? O arquivo sai do portal do cliente também.`)) return;
    try {
      await deleteCompanyFile(file.id);
      notify('Arquivo excluído.');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir o arquivo.');
    }
  }

  /** Gera (ou regera) certificados, certificado da empresa e atestado da turma. */
  async function gerarDocumentos() {
    if (!selectedTraining) return;
    setGerando(true);
    try {
      const resultado = await generateCertificates(selectedTraining.id);
      notify(`${resultado.documents.length} documento(s) gerados e arquivados nesta turma.`);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao gerar os documentos.');
    } finally {
      setGerando(false);
    }
  }

  const emitidos = selectedTraining
    ? data.files.filter((file) => file.training_id === selectedTraining.id && file.kind === 'document').length
    : 0;

  return <div className="space-y-6">
    <SubTabs label="Seções de arquivos" active={aba} onChange={setAba} tabs={[
      { id: 'photo', label: 'Fotos', count: counts.photo },
      { id: 'document', label: 'Documentos', count: counts.document },
      { id: 'upload', label: 'Enviar' },
    ]} />

    {/* Cliente e turma valem para as três sub-abas: escolher uma vez basta. */}
    <div className="rounded-lg grid gap-4 border border-ds-borda bg-ds-superficie p-5 sm:grid-cols-2">
      <label htmlFor="arquivos-cliente"><span className={labelClass}>Cliente</span>
        <select id="arquivos-cliente" value={clientId} onChange={(event) => changeClient(event.target.value)} className={selectClass}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      </label>
      <label htmlFor="arquivos-treinamento"><span className={labelClass}>Treinamento</span>
        <select id="arquivos-treinamento" value={trainingId} onChange={(event) => setTrainingId(event.target.value)} className={selectClass}>
          <option value="">Todas as turmas deste cliente</option>
          {clientTrainings.map((training) => <option key={training.id} value={training.id}>{training.nr} · {training.internal_label || training.title} · {formatDate(dataDoDia(training))}{rotuloDiaDaTurma(training)}{training.status === 'completed' ? ' · encerrada' : ''}</option>)}
        </select>
      </label>
    </div>

    {aba === 'upload' ? <section className="rounded-lg max-w-2xl border border-ds-borda bg-ds-superficie p-6 md:p-8">
      <span className="eyebrow text-ds-amarelo-texto">Envio em lote</span>
      <h2 className="mt-2 ds-h4">Enviar arquivos</h2>
      <p className="mt-3 text-xs leading-relaxed text-ds-texto-2">Pode escolher vários de uma vez: eles são enviados um a um, porque cada requisição da Vercel aceita no máximo 4,5 MB. Turma encerrada também recebe arquivo novo, e gerar os documentos de novo não apaga o que foi enviado aqui.</p>

      <div className="mt-6 flex gap-px bg-ds-borda">
        {(['photo', 'document'] as Kind[]).map((option) => <button key={option} type="button" onClick={() => { setUploadKind(option); setQueue([]); }} className={`flex-1 px-4 py-3 ds-caps transition ${uploadKind === option ? 'bg-black text-ds-amarelo' : 'bg-ds-superficie text-ds-texto-2 hover:bg-ds-amarelo-suave'}`}>
          <span className="inline-flex items-center gap-2">{option === 'photo' ? <Images className="size-4" /> : <FileText className="size-4" />}{kindCopy[option].plural}</span>
        </button>)}
      </div>

      <input ref={inputRef} type="file" multiple accept={copy.accept} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`rounded-lg mt-4 flex min-h-48 w-full flex-col items-center justify-center border-2 border-dashed p-6 text-center transition ${dragging ? 'border-ds-amarelo bg-ds-amarelo-suave' : 'border-ds-borda bg-ds-muted hover:border-ds-amarelo'}`}>
        <span className="rounded-md flex size-12 items-center justify-center bg-black text-ds-amarelo"><UploadCloud className="size-5" /></span>
        <strong className="mt-4 ds-body-s font-semibold">Arraste {copy.plural.toLowerCase()} aqui</strong>
        <span className="mt-2 text-xs leading-relaxed text-ds-texto-2">{copy.hint}</span>
      </button>

      {queue.length > 0 ? <div className="mt-4 border border-ds-borda">
        <div className="flex items-center justify-between bg-ds-muted px-4 py-3"><strong className="text-xs">{queue.length} na fila</strong><button type="button" onClick={() => setQueue([])} className="ds-caps text-ds-perigo">Limpar</button></div>
        <div className="max-h-44 divide-y divide-ds-borda overflow-y-auto">{queue.slice(0, 40).map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-ds-texto-2">{formatFileSize(file.size)}</span></div>)}{queue.length > 40 ? <p className="px-4 py-2.5 text-xs text-ds-texto-2">+ {queue.length - 40} arquivos</p> : null}</div>
      </div> : null}

      <Button type="button" disabled={!trainingId || queue.length === 0 || Boolean(busy)} onClick={() => void send()} className="mt-5 h-13 w-full bg-ds-amarelo ds-caps text-black hover:bg-[#eab900] disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{busy || `Enviar ${copy.plural.toLowerCase()}`}</Button>
      {!trainingId ? <p className="mt-3 border-l-2 border-ds-amarelo bg-ds-amarelo-suave px-3 py-2 text-[11px] leading-relaxed text-ds-amarelo-texto">Escolha o treinamento acima: o arquivo é guardado dentro dele e é assim que o cliente enxerga.</p> : null}
    </section> : <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-ds-amarelo-texto">{selectedTraining ? `${selectedTraining.nr} · ${selectedTraining.internal_label || selectedTraining.title}` : clientName || 'Histórico'}</span>
          <h2 className="mt-2 ds-h4">{copy.plural} {selectedTraining ? 'desta turma' : 'do cliente'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void downloadAll()} disabled={downloadable.length === 0 || Boolean(zipping)} className="rounded-md inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-ds-borda bg-ds-superficie px-4 ds-botao transition hover:border-black hover:bg-ds-inverso hover:text-ds-texto-inv disabled:cursor-not-allowed disabled:opacity-40">
            {zipping ? <Loader2 className="size-4 animate-spin" /> : <FileArchive className="size-4" />}
            {zipping || (downloadable.length === 1 ? 'Baixar 1 em zip' : downloadable.length > 1 ? `Baixar os ${downloadable.length} em zip` : 'Baixar em zip')}
          </button>
          {aba === 'document' && selectedTraining ? <button type="button" onClick={() => void gerarDocumentos()} disabled={gerando} className="rounded-md inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-ds-amarelo px-4 ds-botao text-ds-texto transition hover:bg-[#eab900] disabled:opacity-50">
            {gerando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{gerando ? 'Gerando…' : emitidos === 0 ? 'Gerar documentos' : 'Gerar de novo'}
          </button> : null}
        </div>
      </div>

      {aba === 'document' && selectedTraining ? <p className="mb-4 border-l-4 border-ds-amarelo bg-ds-amarelo-suave p-4 text-xs leading-relaxed text-ds-amarelo-texto">
        Um certificado por aluno, mais o certificado da empresa e o atestado. Se alguém entrou ou saiu da lista de presença depois da emissão, use <strong>Gerar de novo</strong>: os certificados de quem saiu são recolhidos e os que ficaram são regravados.
      </p> : null}

      {visible.length === 0
        ? <EmptyState icon={aberta === 'photo' ? Images : FolderOpen} title={`Nenhum${aberta === 'photo' ? 'a foto' : ' documento'} por aqui`} text={selectedTraining ? 'Envie na aba Enviar, ou escolha outra turma.' : 'Escolha uma turma acima ou envie arquivos na aba Enviar.'} />
        : aberta === 'photo'
          ? <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{visible.map((file) => <PhotoCard key={file.id} file={file} onDelete={remove} />)}</div>
          : <div className="space-y-3">{visible.map((file) => <DocumentRow key={file.id} file={file} onDelete={remove} />)}</div>}
    </section>}
  </div>;
}
