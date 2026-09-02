'use client';

import { Activity, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '@/components/company-portal/company-ui';
import type { AuditEntry } from '@/lib/company-types';
import { readAuditLogs } from '@/lib/mock-company-database';

const actionLabels: Record<string, string> = {
  'client.access_invited': 'cadastrou um cliente',
  'client.access_approved': 'aprovou o acesso de um cliente',
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
    return <div className="flex min-h-56 items-center justify-center border border-dashed border-black/20 bg-white"><Loader2 className="size-6 animate-spin text-[#8a6107]" /></div>;
  }

  if (entries.length === 0) {
    return <EmptyState icon={Activity} title="Nenhuma atividade ainda" text="As ações da equipe aparecerão aqui conforme forem feitas." />;
  }

  return <ol className="space-y-3">{entries.map((entry) => (
    <li key={entry.id} className="flex gap-4 border border-black/10 bg-white p-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-black text-[#f2ad19]"><Activity className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed"><strong className="font-extrabold">{entry.actor_name ?? 'Sistema'}</strong> <span className="text-[#555]">{describe(entry.action)}</span></p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#999]">{formatDateTime(entry.created_at)}{entry.actor_email ? ` · ${entry.actor_email}` : ''}</p>
      </div>
    </li>
  ))}</ol>;
}
