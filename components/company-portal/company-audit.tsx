'use client';

import { Activity, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '@/components/company-portal/company-ui';
import type { AuditEntry } from '@/lib/company-types';
import { readAuditLogs } from '@/lib/mock-company-database';

const actionLabels: Record<string, string> = {
  'client.access_invited': 'cadastrou um cliente',
  'client.access_approved': 'aprovou o acesso de um cliente',
  'client.username_set': 'definiu o nome de usuário de um cliente',
  'client.updated_by_company': 'editou os dados de um cliente',
  'instructor.updated_by_company': 'editou os dados de um instrutor',
  'training.updated': 'editou os dados de um treinamento',
  'training.day_added': 'acrescentou um dia a um treinamento',
  'training.day_removed': 'removeu um dia de um treinamento',
  'participant.added_by_company': 'incluiu um participante na lista',
  'participant.updated_by_company': 'editou um participante',
  'participant.removed_by_company': 'removeu um participante da lista',
  'attendance.set_by_company': 'marcou ou desmarcou uma presença',
  'instructor.self_registered': 'recebeu um cadastro de instrutor',
  'instructor.created': 'cadastrou um instrutor',
  'instructor.access_approved': 'aprovou o acesso de um instrutor',
  'training.created': 'criou um treinamento',
  'training.started': 'iniciou um treinamento',
  'file.registered': 'registrou arquivos',
  'files.registered': 'registrou arquivos',
  'participant.registered': 'registrou um participante',
  'employee.created': 'criou um funcionário',
  'employee.activated': 'reativou um funcionário',
  'employee.deactivated': 'desativou um funcionário',
  'user.password_reset': 'redefiniu a senha de um acesso',
  'user.password_self_reset': 'criou uma senha nova pelo link enviado por e-mail',
  'file.uploaded': 'enviou um arquivo de treinamento',
  'certificates.issued': 'emitiu os certificados de um treinamento',
  'training.completed': 'encerrou um treinamento',
  'instructor.document_uploaded': 'enviou um documento obrigatório',
  'instructor.document_approved': 'aprovou um documento de instrutor',
  'instructor.document_rejected': 'recusou um documento de instrutor',
  'client.profile_updated': 'atualizou os próprios dados cadastrais',
  'client.deleted': 'excluiu um cliente',
  'instructor.deleted': 'excluiu um instrutor',
  'training.deleted': 'excluiu um treinamento',
  'employee.deleted': 'excluiu um funcionário',
  'training_request.deleted': 'excluiu um pedido de turma',
  'site_lead.deleted': 'excluiu um pedido de proposta do site',
  'document_request.deleted': 'excluiu um pedido de documento',
};

function describe(action: string) {
  return actionLabels[action] ?? action.replace(/[._]/g, ' ');
}

function formatDateTime(value: string) {
  if (!value) return '';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(date);
}

export function CompanyAudit({ notify }: { notify: (message: string) => void }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await readAuditLogs());
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao carregar a atividade.');
      setEntries([]);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  if (entries === null) {
    return <div className="rounded-lg flex min-h-56 items-center justify-center border border-dashed border-ds-borda bg-ds-superficie"><Loader2 className="size-6 animate-spin text-ds-amarelo-texto" /></div>;
  }

  if (entries.length === 0) {
    return <EmptyState icon={Activity} title="Nenhuma atividade ainda" text="As ações da equipe aparecerão aqui conforme forem feitas." />;
  }

  return <ol className="space-y-3">{entries.map((entry) => (
    <li key={entry.id} className="rounded-lg flex gap-4 border border-ds-borda bg-ds-superficie p-4">
      <span className="rounded-md mt-0.5 flex size-9 shrink-0 items-center justify-center bg-black text-ds-amarelo"><Activity className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed"><strong className="font-extrabold">{entry.actor_name ?? 'Sistema'}</strong> <span className="text-ds-texto-2">{describe(entry.action)}</span></p>
        <p className="mt-1 ds-caps text-ds-texto-2">{formatDateTime(entry.created_at)}{entry.actor_email ? ` · ${entry.actor_email}` : ''}</p>
      </div>
    </li>
  ))}</ol>;
}
