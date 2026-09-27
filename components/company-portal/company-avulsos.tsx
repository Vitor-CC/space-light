'use client';

import { Download, Eye, FileText, Loader2, Send, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { formatDate } from '@/components/company-portal/company-ui';
import { Botao, Campo, campoClasses, LinhaArquivo, Tag, Vazio } from '@/components/ds/base';
import type { CompanyClientDocument, CompanyDocumentRequest } from '@/lib/company-types';
import { removeClientDocument, sendClientDocument, setDocumentRequestStatus } from '@/lib/mock-company-database';
import { LIMITE_UPLOAD_LABEL } from '@/lib/upload-limites';
import { cn } from '@/lib/utils';

type Notify = (message: string) => void;
type Reload = () => Promise<void>;

export const SITUACAO_PEDIDO_DOC = {
  open: { texto: 'Aguardando', tom: 'sinal' },
  sent: { texto: 'Enviado', tom: 'sucesso' },
  declined: { texto: 'Não atendido', tom: 'neutro' },
} as const;

const tamanho = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Envio de documento avulso (laudo etc.) ao cliente. Com `pedido`, o título
 * já vem do pedido e o envio fecha o pedido como "Enviado".
 */
export function EnviarDocumento({ clientId, pedido, notify, reload, compacto = false }: { clientId: string; pedido?: CompanyDocumentRequest | null; notify: Notify; reload: Reload; compacto?: boolean }) {
  const [titulo, setTitulo] = useState(pedido?.title ?? '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoArquivo = useRef<HTMLInputElement>(null);

  async function enviar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!arquivo) { notify('Escolha o arquivo.'); return; }
    setEnviando(true);
    try {
      await sendClientDocument({ clientId, title: titulo, file: arquivo, requestId: pedido?.id ?? null });
      notify(pedido ? 'Documento enviado. O pedido foi marcado como atendido e o cliente já vê o arquivo.' : 'Documento enviado. O cliente já vê o arquivo no portal.');
      setArquivo(null);
      if (!pedido) setTitulo('');
      if (campoArquivo.current) campoArquivo.current.value = '';
      await reload();
    } catch (error) { notify(error instanceof Error ? error.message : 'Erro ao enviar o documento.'); }
    finally { setEnviando(false); }
  }

  return <form onSubmit={enviar} className={cn('flex flex-col gap-3', !compacto && 'sm:flex-row sm:items-end')}>
    {!pedido ? <Campo rotulo="Título que o cliente vai ver" className="flex-1"><input required maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: Laudo de insalubridade (NR 15) — 2026" className={campoClasses} /></Campo> : null}
    <label className={cn('flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-dashed border-ds-borda-forte bg-ds-superficie px-3.5 ds-body-s hover:bg-ds-muted', !compacto && 'sm:w-64')}>
      <Upload className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{arquivo ? arquivo.name : `Escolher arquivo (até ${LIMITE_UPLOAD_LABEL})`}</span>
      <input ref={campoArquivo} type="file" className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" />
    </label>
    <Botao type="submit" disabled={enviando || !arquivo || (!pedido && !titulo.trim())}>{enviando ? <Loader2 className="animate-spin" /> : <Send />}{pedido ? 'Enviar ao cliente' : 'Enviar'}</Botao>
  </form>;
}

/** Documentos avulsos já enviados a um cliente, com abrir, baixar e excluir. */
export function ListaDeAvulsos({ docs, notify, reload }: { docs: CompanyClientDocument[]; notify: Notify; reload: Reload }) {
  const [removendo, setRemovendo] = useState('');
  async function remover(doc: CompanyClientDocument) {
    if (!window.confirm(`Excluir "${doc.title}"? O cliente deixa de ver o arquivo${doc.request_id ? ' e o pedido dele volta a ficar em aberto' : ''}.`)) return;
    setRemovendo(doc.id);
    try { await removeClientDocument(doc.id); notify('Documento excluído.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao excluir o documento.'); }
    finally { setRemovendo(''); }
  }
  if (!docs.length) return <Vazio icone={<FileText />} titulo="Nenhum documento avulso enviado" texto="Laudos e outros documentos fora de turma aparecem aqui e no portal do cliente." />;
  return <div className="rounded-lg bg-ds-superficie px-5 pb-2">
    {docs.map((d) => <LinhaArquivo key={d.id} className="first:border-t-0" icone={<FileText />} titulo={d.title} detalhe={`${d.name} · ${tamanho(d.size)} · ${formatDate(d.created_at)}${d.request_id ? ' · respondeu a um pedido' : ''}`}
      acoes={<>
        <a href={`/api/client-documents/${d.id}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Eye className="size-4" /></a>
        <a href={`/api/client-documents/${d.id}?download=1`} aria-label={`Baixar ${d.title}`} className="rounded p-1.5 hover:bg-ds-muted"><Download className="size-4" /></a>
        <button type="button" onClick={() => void remover(d)} disabled={removendo === d.id} aria-label={`Excluir ${d.title}`} className="rounded p-1.5 text-ds-perigo hover:bg-ds-perigo-suave disabled:opacity-40">{removendo === d.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>
      </>} />)}
  </div>;
}

/** Pedido de documento em aberto: o que o cliente pediu e o envio da resposta. */
export function PedidoDeDocumento({ pedido, notify, reload, mostrarCliente = false }: { pedido: CompanyDocumentRequest; notify: Notify; reload: Reload; mostrarCliente?: boolean }) {
  const st = SITUACAO_PEDIDO_DOC[pedido.status as keyof typeof SITUACAO_PEDIDO_DOC] ?? SITUACAO_PEDIDO_DOC.open;
  const [salvando, setSalvando] = useState(false);
  async function mudar(status: 'open' | 'declined') {
    setSalvando(true);
    try { await setDocumentRequestStatus(pedido.id, status); notify(status === 'declined' ? 'Pedido marcado como não atendido.' : 'Pedido reaberto.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao atualizar o pedido.'); }
    finally { setSalvando(false); }
  }
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2"><Tag tom={st.tom}>{st.texto}</Tag><Tag tom="neutro">Documento</Tag><span className="ds-caption text-ds-texto-2">{formatDate(pedido.created_at)}{pedido.requested_by_name ? ` · por ${pedido.requested_by_name}` : ''}</span></div>
    <div><h3 className="ds-h4">{pedido.title}</h3>{mostrarCliente ? <p className="ds-body-s font-medium text-ds-amarelo-texto">{pedido.client_name}</p> : null}</div>
    {pedido.notes ? <p className="whitespace-pre-line ds-body-s text-ds-texto-2">{pedido.notes}</p> : null}
    {pedido.status === 'open'
      ? <div className="flex flex-col gap-2 border-t border-ds-borda pt-3">
          <EnviarDocumento clientId={pedido.client_id} pedido={pedido} notify={notify} reload={reload} compacto />
          <button type="button" disabled={salvando} onClick={() => void mudar('declined')} className="w-fit ds-caption text-ds-texto-2 underline underline-offset-4 hover:text-ds-texto">Marcar como não atendido</button>
        </div>
      : pedido.status === 'declined'
        ? <button type="button" disabled={salvando} onClick={() => void mudar('open')} className="w-fit border-t border-ds-borda pt-3 ds-caption text-ds-texto-2 underline underline-offset-4 hover:text-ds-texto">Reabrir pedido</button>
        : null}
  </div>;
}
