'use client';

import { ArrowLeft, ChevronRight, Download, ExternalLink, FileArchive, FileText, FolderOpen, Images, Loader2, Trash2, TriangleAlert, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';

import { EmptyState, formatDate, formatFileSize, selectClass } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import type { CompanyDashboardData, CompanyFile } from '@/lib/company-types';
import { downloadFilesAsZip } from '@/lib/download-zip';
import { deleteCompanyFile, uploadCompanyFiles } from '@/lib/mock-company-database';

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

function FileActions({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  if (file.status !== 'stored') {
    return <div className="flex items-center gap-2">
      <span className="inline-flex h-9 items-center gap-2 border border-[#e0c48a] bg-[#fff8e8] px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#8a6107]" title="Este registro é anterior ao armazenamento de arquivos: só a ficha foi salva, o arquivo em si não existe."><TriangleAlert className="size-3.5" />Arquivo não salvo</span>
      <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="inline-flex size-9 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button>
    </div>;
  }
  return <div className="flex items-center gap-2">
    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] hover:bg-black hover:text-white"><ExternalLink className="size-3.5" />Abrir</a>
    <a href={`/api/files/${file.id}?download=1`} className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] hover:bg-black hover:text-white"><Download className="size-3.5" />Baixar</a>
    <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="inline-flex size-9 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button>
  </div>;
}

function PhotoCard({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  return <article className="border border-black/10 bg-white">
    <div className="relative aspect-[4/3] bg-[#f7f7f4]">
      {file.status === 'stored'
        ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        : <span className="flex h-full items-center justify-center text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#999]">Sem conteúdo</span>}
    </div>
    <div className="p-4">
      <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{file.client_name} · {file.training_nr}</span>
      <strong className="mt-1 block truncate text-sm" title={file.name}>{file.name}</strong>
      <p className="mt-1 text-[10px] text-[#888]">{formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-[#e0c48a] bg-[#fff8e8] px-3 py-2 text-[10px] leading-relaxed text-[#8a6107]">Enviado antes do armazenamento entrar no ar: o arquivo em si não foi guardado. Exclua e envie de novo.</p> : null}
      <div className="mt-3"><FileActions file={file} onDelete={onDelete} /></div>
    </div>
  </article>;
}

function DocumentRow({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  return <article className="grid gap-4 border border-black/10 bg-white p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
    <span className="flex size-11 items-center justify-center bg-black text-[#f2ad19]"><FileText className="size-5" /></span>
    <div className="min-w-0">
      <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{file.client_name} · {file.training_nr}</span>
      <h3 className="mt-1 truncate text-sm font-bold" title={file.name}>{file.name}</h3>
      <p className="mt-1 text-[10px] text-[#888]">{file.training_title} · {formatFileSize(file.size)} · {formatDate(file.created_at)}</p>
      {file.status !== 'stored' ? <p className="mt-2 border-l-2 border-[#e0c48a] bg-[#fff8e8] px-3 py-2 text-[10px] leading-relaxed text-[#8a6107]">Enviado antes do armazenamento entrar no ar: o arquivo em si não foi guardado. Exclua este registro e envie o arquivo de novo.</p> : null}
    </div>
    <FileActions file={file} onDelete={onDelete} />
  </article>;
}

export function CompanyFiles({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [kind, setKind] = useState<Kind>('photo');
  const [clientId, setClientId] = useState(data.clients[0]?.id ?? '');
  const [trainingId, setTrainingId] = useState('');
  const [queue, setQueue] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState('');
  const [zipping, setZipping] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const clientTrainings = useMemo(
    () => data.trainings.filter((training) => training.client_id === clientId),
    [data.trainings, clientId],
  );

  // A lista mostra só a turma escolhida; sem turma, mostra as do cliente.
  const scoped = useMemo(
    () => data.files.filter((file) => (trainingId ? file.training_id === trainingId : file.client_id === clientId)),
    [data.files, clientId, trainingId],
  );

  const visible = useMemo(() => scoped.filter((file) => file.kind === kind), [scoped, kind]);
  const downloadable = useMemo(() => visible.filter((file) => file.status === 'stored'), [visible]);

  const counts = useMemo(() => ({
    photo: scoped.filter((file) => file.kind === 'photo').length,
    document: scoped.filter((file) => file.kind === 'document').length,
  }), [scoped]);

  const selectedTraining = clientTrainings.find((training) => training.id === trainingId);
  const clientName = data.clients.find((client) => client.id === clientId)?.name ?? '';

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
        clientId, trainingId, kind, files: queue,
        onProgress: (done, total, name) => setBusy(done >= total ? 'Finalizando…' : `Enviando ${done + 1} de ${total}: ${name}`),
      });
      setQueue([]);
      notify(result.rejected.length
        ? `${result.saved} enviado(s). Recusado(s): ${result.rejected.join(', ')} — tipo não aceito ou acima de 4 MB.`
        : `${result.saved} arquivo(s) enviado(s).`);
      await reload();
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

  const copy = kindCopy[kind];

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-px bg-black/10">
      {(['photo', 'document'] as Kind[]).map((option) => <button key={option} type="button" onClick={() => { setKind(option); setQueue([]); }} className={`flex-1 px-5 py-4 text-[10px] font-extrabold uppercase tracking-[.12em] transition ${kind === option ? 'bg-black text-[#f2ad19]' : 'bg-white text-[#666] hover:bg-[#fff8e8]'}`}>
        <span className="inline-flex items-center gap-2">{option === 'photo' ? <Images className="size-4" /> : <FileText className="size-4" />}{kindCopy[option].plural} · {counts[option]}</span>
      </button>)}
    </div>

    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="h-fit border border-black/10 bg-white p-6">
        <span className="eyebrow text-[#8a6107]">Enviar {copy.plural.toLowerCase()}</span>
        <h2 className="mt-2 text-xl font-extrabold uppercase tracking-[0.04em]">Destino do arquivo</h2>
        <div className="mt-5 grid gap-4">
          <label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Cliente</span><select value={clientId} onChange={(event) => changeClient(event.target.value)} className={selectClass}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Treinamento</span><select value={trainingId} onChange={(event) => setTrainingId(event.target.value)} className={selectClass}><option value="">Selecione</option>{clientTrainings.map((training) => <option key={training.id} value={training.id}>{training.nr} · {training.title}</option>)}</select></label>
        </div>

        <input ref={inputRef} type="file" multiple accept={copy.accept} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
        <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`mt-5 flex min-h-44 w-full flex-col items-center justify-center border-2 border-dashed p-6 text-center transition ${dragging ? 'border-[#f2ad19] bg-[#fff8e8]' : 'border-black/18 bg-[#f7f7f4] hover:border-[#f2ad19]'}`}>
          <span className="flex size-12 items-center justify-center bg-black text-[#f2ad19]"><UploadCloud className="size-5" /></span>
          <strong className="mt-4 text-sm uppercase tracking-[0.08em]">Arraste {copy.plural.toLowerCase()} aqui</strong>
          <span className="mt-2 text-xs leading-relaxed text-[#777]">{copy.hint}</span>
        </button>

        {queue.length > 0 ? <div className="mt-4 border border-black/10">
          <div className="flex items-center justify-between bg-[#f7f7f4] px-4 py-3"><strong className="text-xs">{queue.length} na fila</strong><button type="button" onClick={() => setQueue([])} className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8f1717]">Limpar</button></div>
          <div className="max-h-44 divide-y divide-black/8 overflow-y-auto">{queue.slice(0, 40).map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-[#888]">{formatFileSize(file.size)}</span></div>)}{queue.length > 40 ? <p className="px-4 py-2.5 text-xs text-[#777]">+ {queue.length - 40} arquivos</p> : null}</div>
        </div> : null}

        <Button type="button" disabled={!trainingId || queue.length === 0 || Boolean(busy)} onClick={() => void send()} className="mt-5 h-12 w-full rounded-none bg-[#f2ad19] text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{busy || `Enviar ${copy.plural.toLowerCase()}`}</Button>
        {!trainingId ? <p className="mt-3 border-l-2 border-[#e0c48a] bg-[#fff8e8] px-3 py-2 text-[10px] leading-relaxed text-[#8a6107]">Escolha o treinamento para enviar e para ver os arquivos dele.</p> : null}
        <p className="mt-3 text-[10px] leading-relaxed text-[#888]">Pode escolher vários de uma vez: eles são enviados um a um. O arquivo fica guardado e aparece para o cliente dentro do treinamento escolhido.</p>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow text-[#8a6107]">{selectedTraining ? `${selectedTraining.nr} · ${selectedTraining.title}` : clientName || 'Histórico'}</span>
            <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">{copy.plural} {selectedTraining ? 'desta turma' : 'por turma'}</h2>
          </div>
          {selectedTraining ? <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void downloadAll()} disabled={downloadable.length === 0 || Boolean(zipping)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-black/16 bg-white px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
              {zipping ? <Loader2 className="size-4 animate-spin" /> : <FileArchive className="size-4" />}
              {zipping || (downloadable.length === 1 ? 'Baixar 1 em zip' : downloadable.length > 1 ? `Baixar os ${downloadable.length} em zip` : 'Baixar em zip')}
            </button>
            <button type="button" onClick={() => setTrainingId('')} className="inline-flex h-11 shrink-0 items-center gap-2 border border-black/16 bg-white px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white"><ArrowLeft className="size-4" />Todas as turmas</button>
          </div> : null}
        </div>

        {!selectedTraining
          ? (clientTrainings.length === 0
            ? <EmptyState icon={FolderOpen} title="Nenhuma turma para este cliente" text="Crie um treinamento na aba Treinamentos para poder anexar arquivos." />
            : <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{clientTrainings.map((training) => {
                const doTreino = data.files.filter((file) => file.training_id === training.id && file.kind === kind);
                const capa = kind === 'photo' ? doTreino.find((file) => file.status === 'stored') : undefined;
                return <button key={training.id} type="button" onClick={() => setTrainingId(training.id)} className="group flex flex-col overflow-hidden border border-black/10 bg-white text-left transition hover:border-[#f2ad19]">
                  <span className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#f7f7f4]">
                    {capa ? <Image src={`/api/files/${capa.id}`} alt="" fill unoptimized sizes="(min-width:1280px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /> : <FolderOpen className="size-10 text-black/15" />}
                    <span className="absolute right-3 top-3 bg-black px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#f2ad19]">{doTreino.length === 0 ? `Sem ${copy.plural.toLowerCase()}` : `${doTreino.length} ${doTreino.length === 1 ? copy.label.toLowerCase() : copy.plural.toLowerCase()}`}</span>
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training.nr} · {formatDate(training.training_date)}</span>
                    <strong className="mt-1 line-clamp-2 text-sm font-extrabold uppercase tracking-[0.08em] leading-tight">{training.title}</strong>
                    <span className="mt-auto pt-4 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em] text-[#666] transition group-hover:text-black">Abrir turma <ChevronRight className="size-3.5" /></span>
                  </span>
                </button>;
              })}</div>)
          : visible.length === 0
            ? <EmptyState icon={kind === 'photo' ? Images : FileText} title={`Nenhum${kind === 'photo' ? 'a foto' : ' documento'} nesta turma`} text={`Envie ${kind === 'photo' ? 'as primeiras fotos' : 'os primeiros documentos'} pelo painel ao lado.`} />
            : kind === 'photo'
              ? <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{visible.map((file) => <PhotoCard key={file.id} file={file} onDelete={remove} />)}</div>
              : <div className="space-y-3">{visible.map((file) => <DocumentRow key={file.id} file={file} onDelete={remove} />)}</div>}
      </section>
    </div>
  </div>;
}
