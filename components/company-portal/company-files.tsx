'use client';

import { Download, ExternalLink, FileText, Images, Loader2, Trash2, TriangleAlert, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';

import { EmptyState, formatDate, formatFileSize, selectClass } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import type { CompanyDashboardData, CompanyFile } from '@/lib/company-types';
import { deleteCompanyFile, uploadCompanyFiles } from '@/lib/mock-company-database';

type Kind = 'photo' | 'document';

const kindCopy: Record<Kind, { label: string; plural: string; accept: string; hint: string }> = {
  photo: {
    label: 'Foto',
    plural: 'Fotos',
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
    hint: 'JPG, PNG, WEBP ou HEIC — até 12 MB cada.',
  },
  document: {
    label: 'Documento',
    plural: 'Documentos',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
    hint: 'PDF, Word, Excel, CSV ou TXT — até 12 MB cada.',
  },
};

function FileActions({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  if (file.status !== 'stored') {
    return <div className="flex items-center gap-2">
      <span className="inline-flex h-9 items-center gap-2 border border-[#e0c48a] bg-[#fff8e8] px-3 text-[8px] font-extrabold uppercase text-[#8a6107]" title="Este registro é anterior ao armazenamento de arquivos: só a ficha foi salva, o arquivo em si não existe."><TriangleAlert className="size-3.5" />Arquivo não salvo</span>
      <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="inline-flex size-9 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button>
    </div>;
  }
  return <div className="flex items-center gap-2">
    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase hover:bg-black hover:text-white"><ExternalLink className="size-3.5" />Abrir</a>
    <a href={`/api/files/${file.id}?download=1`} className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase hover:bg-black hover:text-white"><Download className="size-3.5" />Baixar</a>
    <button type="button" onClick={() => onDelete(file)} aria-label={`Excluir ${file.name}`} className="inline-flex size-9 items-center justify-center border border-black/10 text-[#999] hover:border-[#b62525] hover:text-[#b62525]"><Trash2 className="size-3.5" /></button>
  </div>;
}

function PhotoCard({ file, onDelete }: { file: CompanyFile; onDelete: (file: CompanyFile) => void }) {
  return <article className="border border-black/10 bg-white">
    <div className="relative aspect-[4/3] bg-[#f7f7f4]">
      {file.status === 'stored'
        ? <Image src={`/api/files/${file.id}`} alt={file.name} fill unoptimized sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        : <span className="flex h-full items-center justify-center text-[9px] font-extrabold uppercase text-[#999]">Sem conteúdo</span>}
    </div>
    <div className="p-4">
      <span className="block text-[9px] font-extrabold uppercase tracking-[.1em] text-[#8a6107]">{file.client_name} · {file.training_nr}</span>
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
      <span className="text-[9px] font-extrabold uppercase tracking-[.11em] text-[#8a6107]">{file.client_name} · {file.training_nr}</span>
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
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const clientTrainings = useMemo(
    () => data.trainings.filter((training) => training.client_id === clientId),
    [data.trainings, clientId],
  );

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return data.files.filter((file) =>
      file.kind === kind &&
      (!term || `${file.name} ${file.client_name} ${file.training_nr} ${file.training_title}`.toLowerCase().includes(term)));
  }, [data.files, kind, filter]);

  const counts = useMemo(() => ({
    photo: data.files.filter((file) => file.kind === 'photo').length,
    document: data.files.filter((file) => file.kind === 'document').length,
  }), [data.files]);

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
    setBusy(true);
    try {
      const result = await uploadCompanyFiles({ clientId, trainingId, kind, files: queue });
      setQueue([]);
      if (result.rejected.length) {
        notify(`${result.saved} enviado(s). Recusado(s): ${result.rejected.join(', ')} — tipo ou tamanho não aceito.`);
      } else {
        notify(`${result.saved} arquivo(s) enviado(s).`);
      }
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao enviar os arquivos.');
    } finally {
      setBusy(false);
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
        <h2 className="mt-2 text-xl font-extrabold uppercase tracking-[-.04em]">Destino do arquivo</h2>
        <div className="mt-5 grid gap-4">
          <label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[.11em]">Cliente</span><select value={clientId} onChange={(event) => changeClient(event.target.value)} className={selectClass}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[.11em]">Treinamento</span><select value={trainingId} onChange={(event) => setTrainingId(event.target.value)} className={selectClass}><option value="">Selecione</option>{clientTrainings.map((training) => <option key={training.id} value={training.id}>{training.nr} · {training.title}</option>)}</select></label>
        </div>

        <input ref={inputRef} type="file" multiple accept={copy.accept} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
        <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`mt-5 flex min-h-44 w-full flex-col items-center justify-center border-2 border-dashed p-6 text-center transition ${dragging ? 'border-[#f2ad19] bg-[#fff8e8]' : 'border-black/18 bg-[#f7f7f4] hover:border-[#f2ad19]'}`}>
          <span className="flex size-12 items-center justify-center bg-black text-[#f2ad19]"><UploadCloud className="size-5" /></span>
          <strong className="mt-4 text-sm uppercase">Arraste {copy.plural.toLowerCase()} aqui</strong>
          <span className="mt-2 text-xs leading-relaxed text-[#777]">{copy.hint}</span>
        </button>

        {queue.length > 0 ? <div className="mt-4 border border-black/10">
          <div className="flex items-center justify-between bg-[#f7f7f4] px-4 py-3"><strong className="text-xs">{queue.length} na fila</strong><button type="button" onClick={() => setQueue([])} className="text-[9px] font-extrabold uppercase text-[#8f1717]">Limpar</button></div>
          <div className="max-h-44 divide-y divide-black/8 overflow-y-auto">{queue.slice(0, 40).map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-[#888]">{formatFileSize(file.size)}</span></div>)}{queue.length > 40 ? <p className="px-4 py-2.5 text-xs text-[#777]">+ {queue.length - 40} arquivos</p> : null}</div>
        </div> : null}

        <Button type="button" disabled={!trainingId || queue.length === 0 || busy} onClick={() => void send()} className="mt-5 h-12 w-full rounded-none bg-[#f2ad19] text-[10px] font-extrabold uppercase tracking-[.12em] text-black hover:bg-[#ff9900] disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{busy ? 'Enviando…' : `Enviar ${copy.plural.toLowerCase()}`}</Button>
        <p className="mt-3 text-[10px] leading-relaxed text-[#888]">O arquivo fica guardado e aparece para o cliente na área dele, dentro do treinamento escolhido.</p>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="eyebrow text-[#8a6107]">Histórico</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-.04em]">{copy.plural} no portal</h2></div>
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nome, cliente ou NR" aria-label={`Buscar ${copy.plural.toLowerCase()}`} className="h-11 w-full border border-black/16 bg-white px-3 text-sm outline-none focus:border-[#f2ad19] sm:max-w-xs" />
        </div>

        {visible.length === 0
          ? <EmptyState icon={kind === 'photo' ? Images : FileText} title={`Nenhum${kind === 'photo' ? 'a foto' : ' documento'} por aqui`} text={filter ? 'Nada bate com essa busca.' : `Escolha um cliente e um treinamento ao lado para enviar ${kind === 'photo' ? 'as primeiras fotos' : 'os primeiros documentos'}.`} />
          : kind === 'photo'
            ? <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{visible.map((file) => <PhotoCard key={file.id} file={file} onDelete={remove} />)}</div>
            : <div className="space-y-3">{visible.map((file) => <DocumentRow key={file.id} file={file} onDelete={remove} />)}</div>}
      </section>
    </div>
  </div>;
}
