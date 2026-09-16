'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  Carregando,
  ErroAoCarregar,
  SemPermissao,
  Vazio,
  mono,
} from '@/components/portal/kit';
import type { AuditEntry } from '@/lib/company-types';
import { RequestError, readAuditLogs } from '@/lib/mock-company-database';
import { cn } from '@/lib/utils';

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
  'user.password_self_reset':
    'criou uma senha nova pelo link enviado por e-mail',
  'file.uploaded': 'enviou um arquivo de treinamento',
  'certificates.issued': 'emitiu os certificados de um treinamento',
  'training.completed': 'encerrou um treinamento',
  'training.completed_by_company': 'encerrou uma turma pela gestão',
  'training.day_completed': 'encerrou um dia de treinamento',
  'training.renamed': 'mudou a identificação de uma turma',
  'training.session_updated': 'alterou data, horário ou instrutor de um dia',
  'instructor.document_uploaded': 'enviou um documento obrigatório',
  'instructor.document_approved': 'aprovou um documento de instrutor',
  'instructor.document_rejected': 'recusou um documento de instrutor',
  'client.profile_updated': 'atualizou os próprios dados cadastrais',
  'client.deleted': 'excluiu um cliente',
  'instructor.deleted': 'excluiu um instrutor',
  'training.deleted': 'excluiu um treinamento',
  'employee.deleted': 'excluiu um funcionário',
};

function describe(action: string) {
  return actionLabels[action] ?? action.replace(/[._]/g, ' ');
}

function formatDateTime(value: string) {
  if (!value) return '';
  const normalized = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

type Carga =
  | { estado: 'carregando' }
  | { estado: 'ok'; lista: AuditEntry[] }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'restrito' };

function resultadoDoErro(error: unknown): Carga {
  if (error instanceof RequestError && error.status === 403)
    return { estado: 'restrito' };
  return {
    estado: 'erro',
    mensagem:
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar a auditoria.',
  };
}

export function CompanyAudit() {
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' });

  const load = useCallback(async () => {
    setCarga({ estado: 'carregando' });
    try {
      setCarga({ estado: 'ok', lista: await readAuditLogs() });
    } catch (error) {
      setCarga(resultadoDoErro(error));
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    readAuditLogs()
      .then((lista) => {
        if (ativo) setCarga({ estado: 'ok', lista });
      })
      .catch((error: unknown) => {
        if (ativo) setCarga(resultadoDoErro(error));
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (carga.estado === 'carregando') return <Carregando linhas={6} />;
  if (carga.estado === 'restrito')
    return <SemPermissao texto="A auditoria é vista só pelo dono da conta." />;
  if (carga.estado === 'erro')
    return (
      <ErroAoCarregar mensagem={carga.mensagem} aoTentar={() => void load()} />
    );
  if (carga.lista.length === 0)
    return <Vazio titulo="Nenhuma ação registrada ainda" />;

  return (
    <ol className="border-t border-doc-ink">
      {carga.lista.map((entry) => (
        <li
          key={entry.id}
          className="grid gap-1 border-b border-doc-rule-strong py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
        >
          <span className={cn(mono, 'text-xs text-doc-ink-muted sm:pt-0.5')}>
            {formatDateTime(entry.created_at)}
          </span>
          <p className="text-sm">
            <strong>{entry.actor_name ?? 'Sistema'}</strong>{' '}
            {describe(entry.action)}
            {entry.actor_email ? (
              <span className="block text-xs text-doc-ink-muted">
                {entry.actor_email}
              </span>
            ) : null}
          </p>
        </li>
      ))}
    </ol>
  );
}
