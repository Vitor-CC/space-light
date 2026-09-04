'use client';

import { Award, Download, ExternalLink, FileCheck2, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, formatDate } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyFile, CompanyTraining } from '@/lib/company-types';
import { generateCertificates } from '@/lib/mock-company-database';

/** Documentos gerados pelo encerramento da turma, na ordem de exibição. */
const DOCUMENT_KINDS = [
  { prefix: 'certificados-', label: 'Certificados dos alunos' },
  { prefix: 'certificado-empresa-', label: 'Certificado da empresa' },
  { prefix: 'atestado-', label: 'Atestado' },
];

function trainingDocuments(files: CompanyFile[], trainingId: string) {
  return DOCUMENT_KINDS.map((kind) => ({
    ...kind,
    file: files.find(
      (file) =>
        file.training_id === trainingId &&
        file.kind === 'document' &&
        file.status === 'stored' &&
        file.name.toLowerCase().startsWith(kind.prefix),
    ),
  }));
}

export function CompanyCertificates({
  data,
  reload,
  notify,
}: {
  data: CompanyDashboardData;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [working, setWorking] = useState('');

  const concluidos = data.trainings.filter((training) => training.status === 'completed');
  const prontos = concluidos.filter((training) =>
    trainingDocuments(data.files, training.id).every((item) => item.file),
  ).length;

  async function gerar(training: CompanyTraining) {
    setWorking(training.id);
    try {
      const resultado = await generateCertificates(training.id);
      notify(`${resultado.documents.length} documento(s) gerados e arquivados na turma.`);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao gerar os documentos.');
    } finally {
      setWorking('');
    }
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border border-black/10 bg-white p-6"><FileCheck2 className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{prontos}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Turmas com documentos prontos</span></div>
      <div className="border border-black/10 bg-white p-6"><Award className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{concluidos.length}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Turmas concluídas</span></div>
      <div className="border border-black/10 bg-white p-6"><Download className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{concluidos.reduce((soma, item) => soma + item.participant_count, 0)}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Certificados emitidos</span></div>
    </div>

    <div className="border-l-4 border-[#f2ad19] bg-white p-5">
      <strong className="text-sm uppercase tracking-[0.08em]">Como funciona</strong>
      <p className="mt-2 text-sm leading-relaxed text-[#666]">
        Encerrar a turma gera três documentos e os arquiva nos <strong>documentos daquele
        treinamento</strong>: os certificados dos alunos (um por página), o certificado da
        empresa e o atestado. Todos já vêm com o conteúdo programático da norma. Se a lista de
        participantes mudar, use <strong>Gerar de novo</strong> para substituir os arquivos.
      </p>
    </div>

    <div className="space-y-3">{concluidos.map((training) => {
      const documentos = trainingDocuments(data.files, training.id);
      const emFalta = documentos.filter((item) => !item.file).length;
      const ocupado = working === training.id;
      return <article key={training.id} className="border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <span className={`flex size-12 shrink-0 items-center justify-center ${emFalta === 0 ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#8a6107]'}`}>
              {emFalta === 0 ? <FileCheck2 className="size-5" /> : <Award className="size-5" />}
            </span>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training.client_name} · {training.nr}</span>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-[0.08em]">{training.title}</h2>
              <p className="mt-1 text-[10px] text-[#888]">{training.participant_count} participante(s) · {formatDate(training.training_date)}</p>
            </div>
          </div>
          <button type="button" onClick={() => void gerar(training)} disabled={ocupado || training.participant_count === 0} className="inline-flex h-11 shrink-0 items-center gap-2 border border-black/15 px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {ocupado ? 'Gerando…' : emFalta === DOCUMENT_KINDS.length ? 'Gerar documentos' : 'Gerar de novo'}
          </button>
        </div>

        <ul className="mt-4 space-y-2 border-t border-black/8 pt-4">{documentos.map((item) => (
          <li key={item.prefix} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold">{item.label}</span>
            {item.file ? <span className="flex gap-2">
              <a href={`/api/files/${item.file.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] hover:bg-black hover:text-white"><ExternalLink className="size-3.5" />Abrir</a>
              <a href={`/api/files/${item.file.id}?download=1`} className="inline-flex h-9 items-center gap-2 bg-[#f2ad19] px-3 text-[8px] font-extrabold uppercase tracking-[0.14em] text-black hover:bg-[#ff9900]"><Download className="size-3.5" />Baixar</a>
            </span> : <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">Ainda não gerado</span>}
          </li>
        ))}</ul>
      </article>;
    })}
    {concluidos.length === 0 ? <EmptyState icon={Award} title="Nenhuma turma concluída" text="Os documentos são emitidos quando o instrutor encerra o treinamento." /> : null}
    </div>
  </div>;
}
