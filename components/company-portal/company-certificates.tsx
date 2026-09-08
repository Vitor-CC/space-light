'use client';

import { Award, Download, ExternalLink, FileCheck2, Loader2, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, formatDate } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyFile, CompanyTraining } from '@/lib/company-types';
import { downloadFilesAsZip } from '@/lib/download-zip';
import { generateCertificates } from '@/lib/mock-company-database';

const PREFIXO_ALUNO = 'certificado-aluno-';

/** Documentos únicos da turma, na ordem de exibição. */
const DOCUMENTOS_DA_TURMA = [
  { prefixo: 'certificado-empresa-', rotulo: 'Certificado da empresa' },
  { prefixo: 'atestado-', rotulo: 'Atestado' },
];

function documentosDaTurma(files: CompanyFile[], trainingId: string) {
  const daTurma = files.filter(
    (file) => file.training_id === trainingId && file.kind === 'document' && file.status === 'stored',
  );
  return {
    // Um certificado por aluno, em ordem alfabética pelo nome do arquivo, que
    // já começa pelo nome da pessoa.
    alunos: daTurma
      .filter((file) => file.name.toLowerCase().startsWith(PREFIXO_ALUNO))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    unicos: DOCUMENTOS_DA_TURMA.map((tipo) => ({
      ...tipo,
      file: daTurma.find((file) => file.name.toLowerCase().startsWith(tipo.prefixo)),
    })),
  };
}

/** "certificado-aluno-joao-da-silva-nr-23.pdf" -> "Joao Da Silva" */
function nomeDoAluno(nomeDoArquivo: string) {
  return nomeDoArquivo
    .toLowerCase()
    .replace(PREFIXO_ALUNO, '')
    .replace(/\.pdf$/, '')
    .replace(/-nr-\d+$/, '')
    .split('-')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
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
  const [zipando, setZipando] = useState('');

  const concluidos = data.trainings.filter((training) => training.status === 'completed');
  const prontos = concluidos.filter((training) => {
    const docs = documentosDaTurma(data.files, training.id);
    return docs.alunos.length > 0 && docs.unicos.every((item) => item.file);
  }).length;
  const certificadosEmitidos = concluidos.reduce(
    (soma, training) => soma + documentosDaTurma(data.files, training.id).alunos.length,
    0,
  );

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

  async function baixarTodos(training: CompanyTraining, alunos: CompanyFile[]) {
    setZipando(training.id);
    try {
      await downloadFilesAsZip({
        entries: alunos.map((file) => ({ id: file.id, name: file.name })),
        zipName: `certificados-${training.nr.replace(/\s+/g, '-').toLowerCase()}-${training.client_name}.zip`,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao montar o arquivo .zip.');
    } finally {
      setZipando('');
    }
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border border-black/10 bg-white p-6"><FileCheck2 className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{prontos}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Turmas com documentos prontos</span></div>
      <div className="border border-black/10 bg-white p-6"><Award className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{concluidos.length}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Turmas concluídas</span></div>
      <div className="border border-black/10 bg-white p-6"><Download className="size-6 text-[#8a6107]" /><strong className="mt-6 block text-3xl">{certificadosEmitidos}</strong><span className="mt-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#777]">Certificados emitidos</span></div>
    </div>

    <div className="border-l-4 border-[#f2ad19] bg-white p-5">
      <strong className="text-sm uppercase tracking-[0.04em]">Como funciona</strong>
      <p className="mt-2 text-sm leading-relaxed text-[#666]">
        Encerrar a turma gera <strong>um certificado por aluno</strong>, com o nome da
        pessoa no nome do arquivo, mais o certificado da empresa e o atestado. Tudo fica
        arquivado nos documentos daquele treinamento. Se a lista de participantes mudar,
        use <strong>Gerar de novo</strong>: os certificados de quem saiu da lista são
        recolhidos junto.
      </p>
    </div>

    <div className="space-y-3">{concluidos.map((training) => {
      const { alunos, unicos } = documentosDaTurma(data.files, training.id);
      const emFalta = unicos.filter((item) => !item.file).length + (alunos.length === 0 ? 1 : 0);
      const ocupado = working === training.id;
      return <article key={training.id} className="border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <span className={`flex size-12 shrink-0 items-center justify-center ${emFalta === 0 ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#8a6107]'}`}>
              {emFalta === 0 ? <FileCheck2 className="size-5" /> : <Award className="size-5" />}
            </span>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training.client_name} · {training.nr}</span>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-[0.02em]">{training.title}</h2>
              <p className="mt-1 text-[10px] text-[#888]">{training.participant_count} participante(s) · {formatDate(training.training_date)}</p>
            </div>
          </div>
          <button type="button" onClick={() => void gerar(training)} disabled={ocupado || training.participant_count === 0} className="inline-flex h-11 shrink-0 items-center gap-2 border border-black/15 px-4 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {ocupado ? 'Gerando…' : alunos.length === 0 ? 'Gerar documentos' : 'Gerar de novo'}
          </button>
        </div>

        <div className="mt-4 border-t border-black/8 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold">
              <Users className="size-3.5 text-[#8a6107]" />
              Certificados dos alunos
              <span className="font-normal text-[#888]">({alunos.length})</span>
            </span>
            {alunos.length > 0 ? (
              <button type="button" onClick={() => void baixarTodos(training, alunos)} disabled={zipando === training.id} className="inline-flex h-9 items-center gap-2 bg-[#f2ad19] px-3 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900] disabled:opacity-50">
                {zipando === training.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {zipando === training.id ? 'Montando .zip…' : 'Baixar todos (.zip)'}
              </button>
            ) : null}
          </div>

          {alunos.length === 0 ? (
            <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#999]">Ainda não gerados</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/6 border border-black/8">
              {alunos.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate text-xs font-semibold">{nomeDoAluno(file.name)}</span>
                  <span className="flex shrink-0 gap-2">
                    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 border border-black/15 px-2.5 text-[8px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><ExternalLink className="size-3" />Abrir</a>
                    <a href={`/api/files/${file.id}?download=1`} className="inline-flex h-8 items-center gap-1.5 border border-black/15 px-2.5 text-[8px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><Download className="size-3" />Baixar</a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="mt-4 space-y-2 border-t border-black/8 pt-4">{unicos.map((item) => (
          <li key={item.prefixo} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold">{item.rotulo}</span>
            {item.file ? <span className="flex gap-2">
              <a href={`/api/files/${item.file.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-2 border border-black/15 px-3 text-[8px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><ExternalLink className="size-3.5" />Abrir</a>
              <a href={`/api/files/${item.file.id}?download=1`} className="inline-flex h-9 items-center gap-2 bg-[#f2ad19] px-3 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Download className="size-3.5" />Baixar</a>
            </span> : <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">Ainda não gerado</span>}
          </li>
        ))}</ul>
      </article>;
    })}
    {concluidos.length === 0 ? <EmptyState icon={Award} title="Nenhuma turma concluída" text="Os documentos são emitidos quando o instrutor encerra o treinamento." /> : null}
    </div>
  </div>;
}
