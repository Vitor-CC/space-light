'use client';

import { ChevronRight } from 'lucide-react';

import {
  formatDate,
  isoFromDate,
  meuDia,
} from '@/components/instructor-portal/datas';
import {
  Cabecalho,
  SeloDeEstado,
  Vazio,
  mono,
  tituloBloco,
} from '@/components/portal/kit';
import type { CompanyTraining } from '@/lib/company-types';
import type { InstructorDashboardData } from '@/lib/instructor-types';
import { cn } from '@/lib/utils';

type Linha = {
  training: CompanyTraining;
  data: string;
  rotuloDia: string;
  status: string;
  atrasada: boolean;
};

/** Próximas turmas do instrutor, pela data do dia DELE em cada uma. */
export function MinhaAgenda({
  data,
  abrir,
}: {
  data: InstructorDashboardData;
  abrir: (training: CompanyTraining) => void;
}) {
  const hoje = isoFromDate(new Date());
  const linhas: Linha[] = data.trainings.map((training) => {
    const { dias, atual } = meuDia(training, data.instructor.id);
    const status =
      training.status === 'completed'
        ? 'completed'
        : (atual?.status ?? training.status);
    const dataDoDia = atual?.session_date ?? training.training_date;
    return {
      training,
      data: dataDoDia,
      rotuloDia:
        dias.length > 1 && atual
          ? `dia ${atual.day_number} de ${dias.length}`
          : '',
      status,
      atrasada: status !== 'completed' && dataDoDia < hoje,
    };
  });

  const abertas = linhas
    .filter((linha) => linha.status !== 'completed')
    .sort((a, b) => a.data.localeCompare(b.data));
  const grupos = [
    { titulo: 'Hoje', linhas: abertas.filter((linha) => linha.data === hoje) },
    {
      titulo: 'Próximas',
      linhas: abertas.filter((linha) => linha.data !== hoje),
    },
    {
      titulo: 'Encerradas',
      linhas: linhas
        .filter((linha) => linha.status === 'completed')
        .sort((a, b) => b.data.localeCompare(a.data)),
    },
  ].filter((grupo) => grupo.linhas.length > 0);

  return (
    <div className="space-y-8">
      <Cabecalho
        titulo="Minha agenda"
        meta={
          <span className="first-letter:uppercase">{formatDate(hoje)}</span>
        }
      />
      {grupos.length === 0 ? (
        <Vazio
          titulo="Nenhuma turma atribuída a você"
          texto="Quando a Space Light escalar você, a turma aparece aqui."
        />
      ) : null}
      {grupos.map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`}>
          <h2 id={`grupo-${grupo.titulo}`} className={cn(tituloBloco, 'mb-2')}>
            {grupo.titulo}{' '}
            <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
              {grupo.linhas.length}
            </span>
          </h2>
          <ul className="border-t border-doc-ink">
            {grupo.linhas.map((linha) => (
              <li
                key={linha.training.id}
                className="border-b border-doc-rule-strong"
              >
                <button
                  type="button"
                  onClick={() => abrir(linha.training)}
                  className="doc-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 text-left hover:bg-doc-sheet sm:grid-cols-[9rem_minmax(0,1fr)_auto_auto]"
                >
                  <span
                    className={cn(
                      mono,
                      'text-sm',
                      linha.atrasada && 'text-doc-error',
                    )}
                  >
                    {formatDate(linha.data)}
                    {linha.rotuloDia ? (
                      <span className="block text-xs text-doc-ink-muted">
                        {linha.rotuloDia}
                      </span>
                    ) : null}
                    {linha.atrasada ? (
                      <span className="block text-xs">atrasada</span>
                    ) : null}
                  </span>
                  <span className="col-span-2 min-w-0 sm:col-span-1">
                    <span className="block font-semibold">
                      <span className="font-doc-mono text-doc-mark">
                        {linha.training.nr}
                      </span>{' '}
                      {linha.training.internal_label || linha.training.title}
                    </span>
                    <span className="block truncate text-sm text-doc-ink-muted">
                      {linha.training.client_name} · {linha.training.location}
                    </span>
                  </span>
                  <span className="row-start-1 justify-self-end sm:row-start-auto">
                    <SeloDeEstado
                      status={linha.status}
                      texto={
                        linha.status === 'scheduled' ? 'Atribuída' : undefined
                      }
                    />
                  </span>
                  <ChevronRight
                    className="hidden size-4 text-doc-ink-muted sm:block"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
