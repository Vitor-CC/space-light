'use client';

import { useCallback, useState } from 'react';

import { MinhaAgenda } from '@/components/instructor-portal/agenda';
import { lerPainel } from '@/components/instructor-portal/api';
import {
  Documentos,
  MeuCadastro,
} from '@/components/instructor-portal/cadastro';
import { TelaDaTurma } from '@/components/instructor-portal/turma';
import { CascaDoPortal } from '@/components/portal/casca';
import { useAviso } from '@/components/portal/kit';
import type { InstructorDashboardData } from '@/lib/instructor-types';

type Area = 'agenda' | 'cadastro';

const menu = [
  { id: 'agenda' as const, rotulo: 'Minha agenda' },
  { id: 'cadastro' as const, rotulo: 'Meu cadastro' },
];

/** Portal do instrutor: celular primeiro, duas áreas. */
export function InstructorPortal({
  initialData,
}: {
  initialData: InstructorDashboardData;
}) {
  const [area, setArea] = useState<Area>('agenda');
  const [data, setData] = useState(initialData);
  const [turmaId, setTurmaId] = useState<string | null>(null);
  const [aviso, setAviso] = useAviso(5000);
  const reload = useCallback(async () => setData(await lerPainel()), []);

  // Cadastro em análise: a única coisa que ele pode fazer é enviar documento.
  if (data.instructor.status === 'pending') {
    return (
      <CascaDoPortal
        area="Instrutor"
        usuario={data.instructor.name}
        itens={[]}
        ativo="agenda"
        aoNavegar={() => undefined}
        aviso={aviso}
      >
        <div className="max-w-3xl space-y-6">
          <header className="border-b border-doc-ink pb-5">
            <h1 className="font-heading text-3xl leading-none font-extrabold uppercase md:text-4xl">
              Envie seus documentos
            </h1>
            <p className="mt-3 max-w-measure text-doc-ink-muted">
              O acesso às turmas é liberado quando a Space Light aprovar os
              três.
            </p>
          </header>
          <Documentos notify={setAviso} />
        </div>
      </CascaDoPortal>
    );
  }

  const turma = turmaId
    ? data.trainings.find((item) => item.id === turmaId)
    : undefined;

  return (
    <CascaDoPortal
      area="Instrutor"
      usuario={data.instructor.name}
      itens={menu}
      ativo={area}
      aoNavegar={(id) => {
        setArea(id);
        setTurmaId(null);
      }}
      aoAtualizar={() => void reload()}
      aviso={aviso}
    >
      {area === 'cadastro' ? (
        <MeuCadastro data={data} reload={reload} notify={setAviso} />
      ) : null}
      {area === 'agenda' && turma ? (
        <TelaDaTurma
          key={turma.id}
          data={data}
          training={turma}
          voltar={() => setTurmaId(null)}
          reload={reload}
          notify={setAviso}
        />
      ) : null}
      {area === 'agenda' && !turma ? (
        <MinhaAgenda
          data={data}
          abrir={(training) => setTurmaId(training.id)}
        />
      ) : null}
    </CascaDoPortal>
  );
}
