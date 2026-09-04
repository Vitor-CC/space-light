'use client';

import { Award, Download, ExternalLink, FileCheck2, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, formatDate } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyFile, CompanyTraining } from '@/lib/company-types';
import { generateCertificates } from '@/lib/mock-company-database';

/** O PDF publicado é o documento da turma cujo nome começa com "certificados-". */
function certificateFile(files: CompanyFile[], trainingId: string) {
  return files.find(
    (file) =>
      file.training_id === trainingId &&
      file.kind === 'document' &&
      file.status === 'stored' &&
      file.name.toLowerCase().startsWith('certificados-'),
  );
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
  const publicados = concluidos.filter((training) => certificateFile(data.files, training.id)).length;

  async function gerar(training: CompanyTraining) {
    setWorking(training.id);
    try {
      await generateCertificates(training.id);
      notify('Certificados gerados e arquivados nos documentos da turma.');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao gerar os certificados.');
    } finally {
      setWorking('');
    }
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border border-black/10 bg-white p-6"><FileCheck2 className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{publicados}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase text-[#777]">Turmas com PDF pronto</span></div>
      <div className="border border-black/10 bg-white p-6"><Award className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{concluidos.length}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase text-[#777]">Turmas concluídas</span></div>
      <div className="border border-black/10 bg-white p-6"><Download className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{concluidos.reduce((soma, item) => soma + item.participant_count, 0)}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase text-[#777]">Certificados emitidos</span></div>
    </div>

    <div className="border-l-4 border-[#f2ad19] bg-white p-5">
      <strong className="text-sm uppercase">Como funciona</strong>
      <p className="mt-2 text-sm leading-relaxed text-[#666]">
        Quando o instrutor encerra a turma, o PDF com um certificado por participante é gerado e
        arquivado nos <strong>documentos daquele treinamento</strong> — de onde a equipe e o
        cliente baixam. Se a lista mudar depois, use <strong>Gerar de novo</strong> para
        substituir o arquivo.
      </p>
    </div>

    <div className="space-y-3">{concluidos.map((training) => {
      const arquivo = certificateFile(data.files, training.id);
      const ocupado = working === training.id;
      return <article key={training.id} className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        <span className={`flex size-12 items-center justify-center ${arquivo ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#8a6107]'}`}>
          {arquivo ? <FileCheck2 className="size-5" /> : <Award className="size-5" />}
        </span>
        <div className="min-w-0">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a6107]">{training.client_name} · {training.nr}</span>
          <h2 className="mt-1 text-sm font-bold uppercase">{training.title}</h2>
          <p className="mt-1 text-[10px] text-[#888]">{training.participant_count} participante(s) · {formatDate(training.training_date)}</p>
          {!arquivo ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#8a6107]">PDF ainda não gerado</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {arquivo ? <>
            <a href={`/api/files/${arquivo.id}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 border border-black/15 px-4 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white"><ExternalLink className="size-4" />Abrir</a>
            <a href={`/api/files/${arquivo.id}?download=1`} className="inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-4 text-[9px] font-extrabold uppercase text-black hover:bg-[#ff9900]"><Download className="size-4" />Baixar PDF</a>
          </> : null}
          <button type="button" onClick={() => void gerar(training)} disabled={ocupado || training.participant_count === 0} className="inline-flex h-11 items-center gap-2 border border-black/15 px-4 text-[9px] font-extrabold uppercase hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {ocupado ? 'Gerando…' : arquivo ? 'Gerar de novo' : 'Gerar PDF'}
          </button>
        </div>
      </article>;
    })}
    {concluidos.length === 0 ? <EmptyState icon={Award} title="Nenhuma turma concluída" text="Os certificados são emitidos quando o instrutor encerra o treinamento." /> : null}
    </div>
  </div>;
}
