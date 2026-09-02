'use client';

import { Database, FileText, FileUp, Images, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmptyState, formatFileSize, selectClass } from '@/components/company-portal/company-ui';
import { Button } from '@/components/ui/button';
import type { CompanyDashboardData, CompanyFile } from '@/lib/company-types';
import { publishMockFiles } from '@/lib/mock-company-database';

function FileRow({ file }: { file: CompanyFile }) {
  const Icon = file.kind === 'photo' ? Images : FileText;
  return <article className="grid gap-4 border border-black/10 bg-white p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex size-11 items-center justify-center bg-black text-[#f2ad19]"><Icon className="size-5" /></span><div className="min-w-0"><span className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a6107]">{file.client_name} · {file.training_nr}</span><h3 className="mt-1 truncate text-sm font-bold">{file.name}</h3><p className="mt-1 text-[10px] text-[#888]">{file.training_title} · {formatFileSize(file.size)}</p></div><span className="inline-flex h-9 items-center justify-center gap-2 border border-black/10 px-3 text-[8px] font-extrabold uppercase text-[#777]"><Database className="size-3.5" />Registrado</span></article>;
}

export function CompanyFiles({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState(data.clients[0]?.id || '');
  const clientTrainings = data.trainings.filter((item) => item.client_id === clientId);
  const [trainingId, setTrainingId] = useState(clientTrainings[0]?.id || '');
  const [queue, setQueue] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  function changeClient(next: string) { setClientId(next); setTrainingId(data.trainings.find((item) => item.client_id === next)?.id || ''); }
  function addFiles(files: FileList | File[]) { setQueue((current) => [...current, ...Array.from(files)].slice(0, 300)); }
  async function publish() {
    try { await publishMockFiles(clientId, trainingId, queue); notify(`${queue.length} arquivo(s) registrado(s) com sucesso.`); setQueue([]); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Falha ao registrar arquivos.'); }
  }
  return <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
    <section className="h-fit border border-black/10 bg-white p-6 md:p-7"><span className="eyebrow text-[#8a6107]">Destino dos arquivos</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-0.04em]">Envio em lote</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Cliente</span><select value={clientId} onChange={(e) => changeClient(e.target.value)} className={selectClass}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Treinamento</span><select value={trainingId} onChange={(e) => setTrainingId(e.target.value)} className={selectClass}><option value="">Selecione</option>{clientTrainings.map((training) => <option key={training.id} value={training.id}>{training.nr} · {training.title}</option>)}</select></label></div><input ref={inputRef} type="file" multiple className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" /><button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }} className={`mt-5 flex min-h-56 w-full flex-col items-center justify-center border-2 border-dashed p-7 text-center transition ${dragging ? 'border-[#f2ad19] bg-[#fff8e8]' : 'border-black/18 bg-[#f7f7f4] hover:border-[#f2ad19]'}`}><span className="flex size-14 items-center justify-center bg-black text-[#f2ad19]"><UploadCloud className="size-6" /></span><strong className="mt-5 text-sm uppercase">Arraste fotos e documentos</strong><span className="mt-2 max-w-sm text-xs leading-relaxed text-[#777]">Ou clique para escolher até 300 arquivos. Nesta fase serão registrados nome, tipo e tamanho.</span></button>{queue.length > 0 ? <div className="mt-5 border border-black/10"><div className="flex items-center justify-between bg-[#f7f7f4] px-4 py-3"><strong className="text-xs">{queue.length} arquivo(s) na fila</strong><button type="button" onClick={() => setQueue([])} className="text-[9px] font-extrabold uppercase text-[#8f1717]">Limpar</button></div><div className="max-h-48 divide-y divide-black/8 overflow-y-auto">{queue.slice(0, 30).map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-[#888]">{formatFileSize(file.size)}</span></div>)}{queue.length > 30 ? <p className="px-4 py-3 text-xs text-[#777]">+ {queue.length - 30} arquivos na fila</p> : null}</div></div> : null}<Button type="button" disabled={!trainingId || queue.length === 0} onClick={publish} className="mt-5 h-12 w-full rounded-none bg-[#f2ad19] text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><FileUp className="size-4" />Registrar no banco simulado</Button><p className="mt-4 text-[10px] leading-relaxed text-[#888]">Na Locaweb, esta mesma ação enviará os arquivos ao armazenamento privado e gravará os vínculos no PostgreSQL.</p></section>
    <section><div className="mb-4"><span className="eyebrow text-[#8a6107]">Histórico</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-0.04em]">Arquivos vinculados</h2></div><div className="space-y-3">{data.files.map((file) => <FileRow key={file.id} file={file} />)}{data.files.length === 0 ? <EmptyState icon={FileUp} title="Nenhum arquivo registrado" text="Escolha um cliente e treinamento para iniciar o primeiro lote." /> : null}</div></section>
  </div>;
}
