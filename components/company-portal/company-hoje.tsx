'use client';

import { ChevronRight, Plus } from 'lucide-react';

import { enderecoCompleto } from '@/components/company-portal/company-clients';
import type { DocumentoDeInstrutor } from '@/components/company-portal/company-instructors';
import { TabelaDeTurmas } from '@/components/company-portal/company-turmas';
import {
  diasSemInstrutor,
  formatDate,
  isoFromDate,
  nomeDaTurma,
  type DadosDaGestao,
} from '@/components/company-portal/company-ui';
import {
  Cabecalho,
  Vazio,
  botao,
  mono,
  tituloBloco,
} from '@/components/portal/kit';
import { registroValido } from '@/lib/certificate-config';
import { instructorDocumentLabel } from '@/lib/instructor-documents';
import { dataDoDia } from '@/lib/dias-da-turma';
import { cn } from '@/lib/utils';

export type Destino =
  | { tipo: 'turma'; id: string }
  | { tipo: 'cliente'; id: string }
  | { tipo: 'instrutor'; id: string };

type Pendencia = {
  chave: string;
  assunto: string;
  texto: string;
  destino: Destino;
};

/** Responde a uma pergunta: o que depende de mim agora? */
export function CompanyHoje({
  data,
  documentos,
  ir,
  criarTurma,
}: {
  data: DadosDaGestao;
  documentos: DocumentoDeInstrutor[] | null;
  ir: (destino: Destino) => void;
  criarTurma: () => void;
}) {
  const agora = new Date();
  const hoje = isoFromDate(agora);
  const emUmaSemana = isoFromDate(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 7),
  );
  const abertas = data.trainings.filter(
    (training) => training.status !== 'completed',
  );
  const instrutorPorId = new Map(
    data.instructors.map((item) => [item.id, item]),
  );

  const pendencias: Pendencia[] = [
    ...abertas
      .filter((training) => dataDoDia(training) < hoje)
      .map((training) => ({
        chave: `atrasada-${training.id}`,
        assunto: 'Turma',
        texto: `${training.nr} ${nomeDaTurma(training)} · ${training.client_name}: dia ${formatDate(dataDoDia(training))} passou sem encerrar`,
        destino: { tipo: 'turma', id: training.id } as const,
      })),
    ...abertas
      .filter((training) => diasSemInstrutor(training) > 0)
      .map((training) => ({
        chave: `escala-${training.id}`,
        assunto: 'Turma',
        texto: `${training.nr} ${nomeDaTurma(training)} · ${training.client_name}: ${diasSemInstrutor(training)} dia(s) sem instrutor`,
        destino: { tipo: 'turma', id: training.id } as const,
      })),
    ...data.clients
      .filter((client) => client.status === 'pending')
      .map((client) => ({
        chave: `cliente-${client.id}`,
        assunto: 'Cliente',
        texto: `${client.name} aguarda aprovação de acesso`,
        destino: { tipo: 'cliente', id: client.id } as const,
      })),
    ...data.clients
      .filter((client) => !client.username)
      .map((client) => ({
        chave: `usuario-${client.id}`,
        assunto: 'Cliente',
        texto: `${client.name} está sem nome de usuário e não consegue entrar`,
        destino: { tipo: 'cliente', id: client.id } as const,
      })),
    ...data.clients
      .filter((client) => !enderecoCompleto(client))
      .map((client) => ({
        chave: `endereco-${client.id}`,
        assunto: 'Cliente',
        texto: `${client.name} está sem endereço da edificação (vai no atestado)`,
        destino: { tipo: 'cliente', id: client.id } as const,
      })),
    ...data.instructors
      .filter((item) => item.status === 'pending')
      .map((item) => ({
        chave: `instrutor-${item.id}`,
        assunto: 'Instrutor',
        texto: `${item.name} aguarda aprovação de acesso`,
        destino: { tipo: 'instrutor', id: item.id } as const,
      })),
    ...(documentos ?? [])
      .filter((doc) => doc.status === 'pending')
      .map((doc) => ({
        chave: `documento-${doc.id}`,
        assunto: 'Documento',
        texto: `${instructorDocumentLabel(doc.category)} de ${instrutorPorId.get(doc.instructorId)?.name ?? 'instrutor'} para conferir`,
        destino: { tipo: 'instrutor', id: doc.instructorId } as const,
      })),
    ...data.instructors
      .filter(
        (item) =>
          item.status !== 'pending' &&
          !registroValido(item.professional_registry),
      )
      .map((item) => ({
        chave: `registro-${item.id}`,
        assunto: 'Instrutor',
        texto: `${item.name} está sem registro MTE/RE e não assina documentos`,
        destino: { tipo: 'instrutor', id: item.id } as const,
      })),
  ];

  const daSemana = abertas
    .filter((training) => {
      const dia = dataDoDia(training);
      return dia >= hoje && dia <= emUmaSemana;
    })
    .sort((a, b) => dataDoDia(a).localeCompare(dataDoDia(b)));
  const proximas = abertas
    .filter((training) => dataDoDia(training) > emUmaSemana)
    .sort((a, b) => dataDoDia(a).localeCompare(dataDoDia(b)))
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <Cabecalho
        titulo="Hoje"
        meta={<span className={mono}>{formatDate(hoje)}</span>}
        acoes={
          <button type="button" onClick={criarTurma} className={botao()}>
            <Plus className="size-4" aria-hidden="true" />
            Nova turma
          </button>
        }
      />

      <section aria-labelledby="pendencias" className="space-y-3">
        <h2 id="pendencias" className={tituloBloco}>
          Pendências{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {pendencias.length}
          </span>
        </h2>
        {pendencias.length === 0 ? (
          <Vazio
            titulo="Nada pendente"
            texto="Nenhuma aprovação, escala ou cadastro esperando por você."
          />
        ) : (
          <ul className="border-t border-doc-ink">
            {pendencias.map((item) => (
              <li key={item.chave} className="border-b border-doc-rule-strong">
                <button
                  type="button"
                  onClick={() => ir(item.destino)}
                  className="doc-focus grid w-full grid-cols-[6rem_minmax(0,1fr)_1rem] items-center gap-4 py-3 text-left hover:bg-doc-sheet"
                >
                  <span className="font-doc-mono text-xs text-doc-mark">
                    {item.assunto}
                  </span>
                  <span className="text-sm">{item.texto}</span>
                  <ChevronRight
                    className="size-4 text-doc-ink-muted"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="semana" className="space-y-3">
        <h2 id="semana" className={tituloBloco}>
          Turmas de hoje e dos próximos 7 dias{' '}
          <span className={cn(mono, 'text-sm text-doc-ink-muted')}>
            {daSemana.length}
          </span>
        </h2>
        <TabelaDeTurmas
          turmas={daSemana}
          abrir={(id) => ir({ tipo: 'turma', id })}
          vazio={<Vazio titulo="Nenhuma turma nesta semana" />}
        />
      </section>

      {daSemana.length === 0 && proximas.length > 0 ? (
        <section aria-labelledby="proximas" className="space-y-3">
          <h2 id="proximas" className={tituloBloco}>
            Próximas turmas
          </h2>
          <TabelaDeTurmas
            turmas={proximas}
            abrir={(id) => ir({ tipo: 'turma', id })}
            vazio={null}
          />
        </section>
      ) : null}
    </div>
  );
}
