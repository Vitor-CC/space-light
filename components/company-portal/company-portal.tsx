'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  CadastrarCliente,
  FichaDoCliente,
  ListaDeClientes,
} from '@/components/company-portal/company-clients';
import { CompanyAudit } from '@/components/company-portal/company-audit';
import {
  CompanyHoje,
  type Destino,
} from '@/components/company-portal/company-hoje';
import {
  CadastrarInstrutor,
  FichaDoInstrutor,
  ListaDeInstrutores,
  type DocumentoDeInstrutor,
} from '@/components/company-portal/company-instructors';
import { CompanyTeam } from '@/components/company-portal/company-team';
import { TelaDaTurmaGestao } from '@/components/company-portal/company-turma';
import {
  CriarTurma,
  ListaDeTurmas,
} from '@/components/company-portal/company-turmas';
import { CascaDoPortal } from '@/components/portal/casca';
import { Abas, Cabecalho, useAviso } from '@/components/portal/kit';
import type { CompanyDashboardData } from '@/lib/company-types';
import {
  readInstructorDocuments,
  readMockCompanyDatabase,
} from '@/lib/mock-company-database';

type Area = 'hoje' | 'turmas' | 'cadastros' | 'configuracao';

/** Onde a pessoa está dentro de cada área. */
type Tela =
  | { area: 'hoje' }
  | { area: 'turmas'; turmaId?: string; criar?: boolean }
  | {
      area: 'cadastros';
      aba: 'clientes' | 'instrutores';
      id?: string;
      criar?: boolean;
    }
  | { area: 'configuracao'; aba: 'equipe' | 'auditoria' };

/**
 * Portal da gestão: quatro áreas (Hoje, Turmas, Cadastros, Configuração) no
 * lugar das oito de antes. Tudo o que pertence a uma turma mora dentro dela.
 */
export function CompanyPortal({
  initialData,
}: {
  initialData: CompanyDashboardData;
}) {
  const [data, setData] = useState<CompanyDashboardData>(initialData);
  const [tela, setTela] = useState<Tela>({ area: 'hoje' });
  const [documentos, setDocumentos] = useState<DocumentoDeInstrutor[] | null>(
    null,
  );
  const [aviso, setAviso] = useAviso();

  const reload = useCallback(
    async () => setData(await readMockCompanyDatabase()),
    [],
  );
  const recarregarDocumentos = useCallback(async () => {
    try {
      setDocumentos(await readInstructorDocuments());
    } catch {
      setDocumentos([]);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    readInstructorDocuments()
      .then((lista) => {
        if (ativo) setDocumentos(lista);
      })
      .catch(() => {
        if (ativo) setDocumentos([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const isOwner = data.currentUser.isOwner;
  const menu = [
    { id: 'hoje' as const, rotulo: 'Hoje' },
    { id: 'turmas' as const, rotulo: 'Turmas' },
    { id: 'cadastros' as const, rotulo: 'Cadastros' },
    ...(isOwner
      ? [{ id: 'configuracao' as const, rotulo: 'Configuração' }]
      : []),
  ];

  function navegar(area: Area) {
    if (area === 'cadastros') setTela({ area, aba: 'clientes' });
    else if (area === 'configuracao') setTela({ area, aba: 'equipe' });
    else setTela({ area });
    window.scrollTo({ top: 0 });
  }

  function ir(destino: Destino) {
    if (destino.tipo === 'turma')
      setTela({ area: 'turmas', turmaId: destino.id });
    else
      setTela({
        area: 'cadastros',
        aba: destino.tipo === 'cliente' ? 'clientes' : 'instrutores',
        id: destino.id,
      });
    window.scrollTo({ top: 0 });
  }

  const abrirTurma = (id: string) => ir({ tipo: 'turma', id });

  return (
    <CascaDoPortal
      area="Gestão"
      usuario={data.currentUser.email}
      itens={menu}
      ativo={tela.area}
      aoNavegar={navegar}
      aoAtualizar={() => {
        void reload();
        void recarregarDocumentos();
      }}
      aviso={aviso}
    >
      {tela.area === 'hoje' ? (
        <CompanyHoje
          data={data}
          documentos={documentos}
          ir={ir}
          criarTurma={() => setTela({ area: 'turmas', criar: true })}
        />
      ) : null}

      {tela.area === 'turmas' ? (
        <Turmas
          data={data}
          tela={tela}
          setTela={setTela}
          reload={reload}
          notify={setAviso}
        />
      ) : null}

      {tela.area === 'cadastros' ? (
        <Cadastros
          data={data}
          tela={tela}
          setTela={setTela}
          documentos={documentos}
          abrirTurma={abrirTurma}
          reload={reload}
          recarregarDocumentos={recarregarDocumentos}
          notify={setAviso}
        />
      ) : null}

      {tela.area === 'configuracao' && isOwner ? (
        <div className="space-y-6">
          <Cabecalho titulo="Configuração" />
          <Abas
            rotuloDaLista="Configuração"
            ativa={tela.aba}
            aoMudar={(aba) => setTela({ area: 'configuracao', aba })}
            abas={[
              { id: 'equipe', rotulo: 'Equipe' },
              { id: 'auditoria', rotulo: 'Auditoria' },
            ]}
          >
            {tela.aba === 'equipe' ? (
              <CompanyTeam notify={setAviso} />
            ) : (
              <CompanyAudit />
            )}
          </Abas>
        </div>
      ) : null}
    </CascaDoPortal>
  );
}

function Turmas({
  data,
  tela,
  setTela,
  reload,
  notify,
}: {
  data: CompanyDashboardData;
  tela: Extract<Tela, { area: 'turmas' }>;
  setTela: (tela: Tela) => void;
  reload: () => Promise<void>;
  notify: (texto: string) => void;
}) {
  const voltar = () => setTela({ area: 'turmas' });
  if (tela.criar)
    return (
      <CriarTurma
        data={data}
        reload={reload}
        notify={notify}
        voltar={voltar}
        aoCriar={(id) => setTela({ area: 'turmas', turmaId: id })}
      />
    );
  const turma = tela.turmaId
    ? data.trainings.find((item) => item.id === tela.turmaId)
    : undefined;
  if (turma)
    return (
      <TelaDaTurmaGestao
        key={turma.id}
        data={data}
        training={turma}
        voltar={voltar}
        reload={reload}
        notify={notify}
        aoExcluir={voltar}
      />
    );
  return (
    <ListaDeTurmas
      data={data}
      abrir={(id) => setTela({ area: 'turmas', turmaId: id })}
      criar={() => setTela({ area: 'turmas', criar: true })}
    />
  );
}

function Cadastros({
  data,
  tela,
  setTela,
  documentos,
  abrirTurma,
  reload,
  recarregarDocumentos,
  notify,
}: {
  data: CompanyDashboardData;
  tela: Extract<Tela, { area: 'cadastros' }>;
  setTela: (tela: Tela) => void;
  documentos: DocumentoDeInstrutor[] | null;
  abrirTurma: (id: string) => void;
  reload: () => Promise<void>;
  recarregarDocumentos: () => Promise<void>;
  notify: (texto: string) => void;
}) {
  const voltar = () => setTela({ area: 'cadastros', aba: tela.aba });

  if (tela.aba === 'clientes' && tela.criar)
    return <CadastrarCliente reload={reload} notify={notify} voltar={voltar} />;
  if (tela.aba === 'instrutores' && tela.criar)
    return (
      <CadastrarInstrutor reload={reload} notify={notify} voltar={voltar} />
    );

  const cliente =
    tela.aba === 'clientes' && tela.id
      ? data.clients.find((item) => item.id === tela.id)
      : undefined;
  if (cliente)
    return (
      <FichaDoCliente
        key={cliente.id}
        data={data}
        client={cliente}
        voltar={voltar}
        abrirTurma={abrirTurma}
        reload={reload}
        notify={notify}
      />
    );
  const instrutor =
    tela.aba === 'instrutores' && tela.id
      ? data.instructors.find((item) => item.id === tela.id)
      : undefined;
  if (instrutor)
    return (
      <FichaDoInstrutor
        key={instrutor.id}
        data={data}
        instructor={instrutor}
        documentos={documentos}
        voltar={voltar}
        abrirTurma={abrirTurma}
        reload={reload}
        recarregarDocumentos={recarregarDocumentos}
        notify={notify}
      />
    );

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Cadastros" />
      <Abas
        rotuloDaLista="Cadastros"
        ativa={tela.aba}
        aoMudar={(aba) => setTela({ area: 'cadastros', aba })}
        abas={[
          { id: 'clientes', rotulo: 'Clientes', contagem: data.clients.length },
          {
            id: 'instrutores',
            rotulo: 'Instrutores',
            contagem: data.instructors.length,
          },
        ]}
      >
        {tela.aba === 'clientes' ? (
          <ListaDeClientes
            data={data}
            abrir={(id) => setTela({ area: 'cadastros', aba: 'clientes', id })}
            cadastrar={() =>
              setTela({ area: 'cadastros', aba: 'clientes', criar: true })
            }
          />
        ) : (
          <ListaDeInstrutores
            data={data}
            documentos={documentos}
            abrir={(id) =>
              setTela({ area: 'cadastros', aba: 'instrutores', id })
            }
            cadastrar={() =>
              setTela({ area: 'cadastros', aba: 'instrutores', criar: true })
            }
          />
        )}
      </Abas>
    </div>
  );
}
