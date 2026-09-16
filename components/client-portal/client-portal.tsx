'use client';

import {
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import { CascaDoPortal } from '@/components/portal/casca';
import {
  Abas,
  Cabecalho,
  Dados,
  SeloDeEstado,
  Vazio,
  botao,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import type {
  ClientDocument,
  ClientPortalData,
  ClientTraining,
} from '@/lib/client-portal-data';
import { downloadFilesAsZip, type ZipEntry } from '@/lib/download-zip';
import { cn } from '@/lib/utils';

type Area = 'treinamentos' | 'empresa';

const menu = [
  { id: 'treinamentos' as const, rotulo: 'Meus treinamentos' },
  { id: 'empresa' as const, rotulo: 'Minha empresa' },
];

const LISTA_ASSINADA = 'Lista de presença assinada';

function statusDa(training: ClientTraining) {
  return training.status === 'Concluído'
    ? 'completed'
    : training.status === 'Em andamento'
      ? 'in_progress'
      : 'scheduled';
}

function rotuloDoStatus(training: ClientTraining) {
  return training.status === 'Concluído' ? 'Realizado' : training.status;
}

/** Portal da empresa: achar e baixar o que a auditoria pede, rápido. */
export function ClientPortal({
  data,
  user,
  senha,
}: {
  data: ClientPortalData;
  user: { name: string; email: string };
  senha?: string;
}) {
  const [area, setArea] = useState<Area>(senha ? 'empresa' : 'treinamentos');
  const [turmaId, setTurmaId] = useState<string | null>(null);
  const turma = turmaId
    ? data.trainings.find((item) => item.id === turmaId)
    : undefined;

  return (
    <CascaDoPortal
      area={data.organization.displayName}
      usuario={user.email || user.name}
      itens={menu}
      ativo={area}
      aoNavegar={(id) => {
        setArea(id);
        setTurmaId(null);
      }}
    >
      {area === 'empresa' ? <MinhaEmpresa data={data} senha={senha} /> : null}
      {area === 'treinamentos' && turma ? (
        <TelaDaTurma
          key={turma.id}
          data={data}
          training={turma}
          voltar={() => setTurmaId(null)}
        />
      ) : null}
      {area === 'treinamentos' && !turma ? (
        <MeusTreinamentos data={data} abrir={setTurmaId} />
      ) : null}
    </CascaDoPortal>
  );
}

// ---------------------------------------------------------------------------

function MeusTreinamentos({
  data,
  abrir,
}: {
  data: ClientPortalData;
  abrir: (id: string) => void;
}) {
  const agendados = data.trainings.filter(
    (item) => item.status !== 'Concluído',
  );
  const realizados = data.trainings.filter(
    (item) => item.status === 'Concluído',
  );
  const [aba, setAba] = useState<'agendados' | 'realizados'>(
    agendados.length === 0 && realizados.length > 0
      ? 'realizados'
      : 'agendados',
  );
  const lista = aba === 'agendados' ? agendados : realizados;

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Meus treinamentos" />
      <Abas
        rotuloDaLista="Treinamentos por situação"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'agendados', rotulo: 'Agendados', contagem: agendados.length },
          {
            id: 'realizados',
            rotulo: 'Realizados',
            contagem: realizados.length,
          },
        ]}
      >
        {lista.length === 0 ? (
          <Vazio
            titulo={
              aba === 'agendados'
                ? 'Nenhum treinamento agendado'
                : 'Nenhum treinamento realizado ainda'
            }
            texto={
              aba === 'agendados'
                ? 'Para agendar, fale com a Space Light.'
                : 'Quando uma turma terminar, os documentos dela ficam aqui.'
            }
          />
        ) : (
          <ul className="border-t border-doc-ink">
            {lista.map((training) => (
              <li key={training.id} className="border-b border-doc-rule-strong">
                <button
                  type="button"
                  onClick={() => abrir(training.id)}
                  className="doc-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 text-left hover:bg-doc-sheet md:grid-cols-[12rem_minmax(0,1fr)_8rem_auto]"
                >
                  <span className={cn(mono, 'text-sm')}>
                    {training.dateLabel}
                  </span>
                  <span className="col-span-2 min-w-0 md:col-span-1">
                    <span className="block font-semibold">
                      <span className="font-doc-mono text-doc-mark">
                        {training.nr}
                      </span>{' '}
                      {training.title}
                    </span>
                    <span className="block truncate text-sm text-doc-ink-muted">
                      {training.location}
                    </span>
                  </span>
                  <span className="row-start-1 justify-self-end md:row-start-auto md:justify-self-start">
                    <SeloDeEstado
                      status={statusDa(training)}
                      texto={rotuloDoStatus(training)}
                    />
                  </span>
                  <ChevronRight
                    className="hidden size-4 text-doc-ink-muted md:block"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Abas>
    </div>
  );
}

// ---------------------------------------------------------------------------

type AbaDaTurma = 'participantes' | 'lista' | 'fotos' | 'documentos';

function TelaDaTurma({
  data,
  training,
  voltar,
}: {
  data: ClientPortalData;
  training: ClientTraining;
  voltar: () => void;
}) {
  const [aba, setAba] = useState<AbaDaTurma>('participantes');
  const participantes = data.participants.filter(
    (item) => item.trainingId === training.id,
  );
  const docs = data.documents.filter((item) => item.trainingId === training.id);
  const listas = docs.filter((item) => item.category === LISTA_ASSINADA);
  const documentos = docs.filter((item) => item.category !== LISTA_ASSINADA);
  const fotos = data.photos.filter((item) => item.trainingId === training.id);
  const lotes = data.certificates.filter(
    (item) => item.trainingId === training.id,
  );
  const emitidos = lotes.reduce((total, lote) => total + lote.quantity, 0);
  const certificados = lotes.length
    ? `${emitidos} emitido(s) em ${lotes[0].issuedAt} · arquivos em Documentos`
    : training.status === 'Concluído'
      ? 'Nenhum emitido'
      : 'Emitidos ao fim do treinamento';
  const nome = `${training.nr}-${training.title}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

  return (
    <div className="space-y-8">
      <Cabecalho
        voltar={{ rotulo: 'Meus treinamentos', aoVoltar: voltar }}
        titulo={
          <>
            <span className="font-doc-mono text-doc-mark">{training.nr}</span>{' '}
            {training.title}
          </>
        }
        meta={
          <SeloDeEstado
            status={statusDa(training)}
            texto={rotuloDoStatus(training)}
          />
        }
      />
      <Dados
        itens={[
          ['Datas', training.dateLabel],
          ['Carga horária', training.duration],
          ['Local', training.location],
          ['Instrutor', training.instructor || '—'],
          ['Certificados', certificados],
          [
            'Código',
            <span key="codigo" className={mono}>
              {training.code}
            </span>,
          ],
        ]}
      />
      <Abas
        rotuloDaLista="Conteúdo da turma"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          {
            id: 'participantes',
            rotulo: 'Participantes',
            contagem: participantes.length,
          },
          { id: 'lista', rotulo: 'Lista de presença', contagem: listas.length },
          { id: 'fotos', rotulo: 'Fotos', contagem: fotos.length },
          {
            id: 'documentos',
            rotulo: 'Documentos e certificados',
            contagem: documentos.length,
          },
        ]}
      >
        {aba === 'participantes' ? (
          participantes.length === 0 ? (
            <Vazio titulo="Nenhum participante registrado" />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-t border-b border-t-doc-ink border-b-doc-rule-strong font-doc-mono text-xs text-doc-ink-muted">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Participante
                  </th>
                  <th
                    scope="col"
                    className="hidden py-3 pr-4 font-medium sm:table-cell"
                  >
                    Função
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Presença
                  </th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((pessoa) => (
                  <tr
                    key={pessoa.id}
                    className="border-b border-doc-rule-strong"
                  >
                    <th scope="row" className="py-3 pr-4 font-semibold">
                      {pessoa.fullName}
                      <span className="block text-sm font-normal text-doc-ink-muted sm:hidden">
                        {pessoa.jobTitle}
                      </span>
                    </th>
                    <td className="hidden py-3 pr-4 text-doc-ink-muted sm:table-cell">
                      {pessoa.jobTitle || '—'}
                    </td>
                    <td className={cn(mono, 'py-3 text-right text-xs')}>
                      {pessoa.daysPresent}/{pessoa.daysTotal}{' '}
                      {pessoa.daysTotal === 1 ? 'dia' : 'dias'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
        {aba === 'lista' ? (
          <ListaDeArquivos
            documentos={listas}
            vazio="A lista assinada aparece aqui quando o instrutor enviar."
            zip={nome ? `lista-${nome}` : 'lista'}
          />
        ) : null}
        {aba === 'documentos' ? (
          <ListaDeArquivos
            documentos={documentos}
            vazio={
              training.status === 'Concluído'
                ? 'Nenhum documento publicado para esta turma.'
                : 'Certificados e documentos saem quando a turma termina.'
            }
            zip={nome || 'documentos'}
          />
        ) : null}
        {aba === 'fotos' ? (
          fotos.length === 0 ? (
            <Vazio titulo="Nenhuma foto publicada para esta turma" />
          ) : (
            <div className="space-y-4">
              <BaixarTudo
                entries={fotos.map((foto) => ({ id: foto.id, name: foto.alt }))}
                zipName={`fotos-${nome}`}
              />
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {fotos.map((foto) => (
                  <li
                    key={foto.id}
                    className="border border-doc-rule-strong bg-doc-sheet"
                  >
                    <a
                      href={foto.src}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver ${foto.alt}`}
                      className="doc-focus relative block aspect-[4/3] bg-doc-paper"
                    >
                      <Image
                        src={foto.src}
                        alt={foto.alt}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </a>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <span
                        className={cn(
                          mono,
                          'truncate text-xs text-doc-ink-muted',
                        )}
                        title={foto.alt}
                      >
                        {foto.dateLabel}
                      </span>
                      <a href={`${foto.src}?download=1`} className={botaoTexto}>
                        <Download className="size-4" aria-hidden="true" />
                        Baixar
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </Abas>
    </div>
  );
}

function ListaDeArquivos({
  documentos,
  vazio,
  zip,
}: {
  documentos: ClientDocument[];
  vazio: string;
  zip: string;
}) {
  if (documentos.length === 0)
    return <Vazio titulo="Nada por aqui ainda" texto={vazio} />;
  return (
    <div className="space-y-4">
      <BaixarTudo
        entries={documentos.map((doc) => ({ id: doc.id, name: doc.title }))}
        zipName={zip}
      />
      <ul className="border-t border-doc-ink">
        {documentos.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-3 border-b border-doc-rule-strong py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold" title={doc.title}>
                {doc.title}
              </p>
              <p className={cn(mono, 'text-xs text-doc-ink-muted')}>
                {doc.format} · {doc.size} · {doc.updatedAt}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={`/api/files/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className={botao({ variante: 'contorno' })}
              >
                <Eye className="size-4" aria-hidden="true" />
                Abrir
              </a>
              <a href={`/api/files/${doc.id}?download=1`} className={botao()}>
                <Download className="size-4" aria-hidden="true" />
                Baixar
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BaixarTudo({
  entries,
  zipName,
}: {
  entries: ZipEntry[];
  zipName: string;
}) {
  const [status, setStatus] = useState('');
  const [problema, setProblema] = useState('');
  if (entries.length < 2) return null;

  async function run() {
    setStatus('Preparando…');
    setProblema('');
    try {
      const result = await downloadFilesAsZip({
        entries,
        zipName,
        onProgress: (done, total) =>
          setStatus(
            done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`,
          ),
      });
      if (result.failed.length)
        setProblema(
          `${result.zipped} arquivo(s) no zip. Não deu para incluir: ${result.failed.join(', ')}.`,
        );
    } catch (error) {
      setProblema(
        error instanceof Error
          ? error.message
          : 'Não foi possível montar o arquivo zip.',
      );
    } finally {
      setStatus('');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={Boolean(status)}
        className={botao({
          variante: 'contorno',
          className: 'disabled:opacity-60',
        })}
      >
        {status ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileArchive className="size-4" aria-hidden="true" />
        )}
        {status || `Baixar os ${entries.length} em zip`}
      </button>
      {problema ? (
        <p role="alert" className="mt-2 text-sm text-doc-error">
          {problema}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

const mensagensDeSenha: Record<string, { texto: string; erro: boolean }> = {
  alterada: { texto: 'Senha alterada.', erro: false },
  'atual-incorreta': {
    texto: 'A senha atual não confere. Digite de novo.',
    erro: true,
  },
  invalida: {
    texto:
      'A nova senha precisa ter 10 caracteres ou mais e ser igual nos dois campos.',
    erro: true,
  },
};

function MinhaEmpresa({
  data,
  senha,
}: {
  data: ClientPortalData;
  senha?: string;
}) {
  const organization = data.organization;
  const router = useRouter();
  const [draft, setDraft] = useState({
    unit: organization.unit,
    contactName: organization.contactName,
    contactPhone: organization.phone,
  });
  const [saving, setSaving] = useState(false);
  const [aviso, setAviso] = useState<{ erro: boolean; texto: string } | null>(
    null,
  );
  const mensagemDeSenha = senha ? mensagensDeSenha[senha] : undefined;
  const mudou =
    draft.unit !== organization.unit ||
    draft.contactName !== organization.contactName ||
    draft.contactPhone !== organization.phone;

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setAviso(null);
    try {
      const response = await fetch('/api/client/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Não foi possível salvar.');
      setAviso({ erro: false, texto: 'Dados atualizados.' });
      router.refresh();
    } catch (error) {
      setAviso({
        erro: true,
        texto:
          error instanceof Error ? error.message : 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <Cabecalho
        titulo="Minha empresa"
        meta={<span>{organization.legalName}</span>}
      />

      <section className="grid max-w-3xl gap-6">
        <h2 className={tituloBloco}>Dados cadastrais</h2>
        <Dados
          itens={[
            ['Razão social', organization.legalName],
            [
              'CNPJ',
              <span key="cnpj" className={mono}>
                {organization.document}
              </span>,
            ],
            ['E-mail de contato', organization.email],
          ]}
        />
        <p className="text-sm text-doc-ink-muted">
          Para mudar razão social, CNPJ ou e-mail,{' '}
          <a
            href="https://wa.me/5511941318646?text=Ol%C3%A1%2C%20preciso%20atualizar%20um%20dado%20cadastral%20da%20minha%20empresa."
            target="_blank"
            rel="noreferrer"
            className={botaoTexto}
          >
            fale com a Space Light
          </a>
          .
        </p>
        <form onSubmit={salvar} className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={rotulo}>Unidade / cidade</span>
            <input
              required
              value={draft.unit}
              onChange={(event) =>
                setDraft({ ...draft, unit: event.target.value })
              }
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Responsável</span>
            <input
              required
              value={draft.contactName}
              onChange={(event) =>
                setDraft({ ...draft, contactName: event.target.value })
              }
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Telefone</span>
            <input
              type="tel"
              value={draft.contactPhone}
              onChange={(event) =>
                setDraft({ ...draft, contactPhone: event.target.value })
              }
              className={campo}
            />
          </label>
          {aviso ? (
            <p
              role={aviso.erro ? 'alert' : undefined}
              aria-live="polite"
              className={cn(
                'text-sm font-semibold sm:col-span-2',
                aviso.erro && 'text-doc-error',
              )}
            >
              {aviso.texto}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!mudou || saving}
              className={botao({ className: 'disabled:opacity-40' })}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid max-w-3xl gap-6 border-t border-doc-rule-strong pt-8">
        <h2 className={tituloBloco}>Senha de acesso</h2>
        {mensagemDeSenha ? (
          <p
            role={mensagemDeSenha.erro ? 'alert' : 'status'}
            className={cn(
              'text-sm font-semibold',
              mensagemDeSenha.erro && 'text-doc-error',
            )}
          >
            {mensagemDeSenha.texto}
          </p>
        ) : null}
        <form
          action="/api/auth/change-password"
          method="post"
          className="grid gap-5 sm:grid-cols-2"
        >
          <input type="hidden" name="voltarPara" value="/cliente" />
          <label className="sm:col-span-2 sm:max-w-sm">
            <span className={rotulo}>Senha atual</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Nova senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              aria-describedby="senha-regra"
              className={campo}
            />
            <span
              id="senha-regra"
              className="mt-1.5 block text-sm text-doc-ink-muted"
            >
              10 caracteres ou mais.
            </span>
          </label>
          <label>
            <span className={rotulo}>Repita a nova senha</span>
            <input
              name="passwordConfirmation"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className={campo}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={botao({ variante: 'contorno' })}>
              Trocar senha
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
