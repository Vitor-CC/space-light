'use client';

import { ptBR } from 'date-fns/locale';
import { Check, Loader2, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import {
  enviarDocumento,
  lerDocumentos,
  marcarDisponibilidade,
  removerDisponibilidade,
  salvarCadastro,
  type MeuDocumento,
} from '@/components/instructor-portal/api';
import {
  dateFromIso,
  formatDate,
  formatMoment,
  isoFromDate,
} from '@/components/instructor-portal/datas';
import {
  Abas,
  Carregando,
  Vazio,
  botao,
  botaoIcone,
  botaoTexto,
  campo,
  mono,
  rotulo,
  tituloBloco,
} from '@/components/portal/kit';
import { Calendar } from '@/components/ui/calendar';
import {
  INSTRUCTOR_DOCUMENT_STATUS,
  REQUIRED_INSTRUCTOR_DOCUMENTS,
} from '@/lib/instructor-documents';
import type { InstructorDashboardData } from '@/lib/instructor-types';
import { cn } from '@/lib/utils';

type Notify = (message: string) => void;
type AbaDoCadastro = 'dados' | 'documentos' | 'disponibilidade';

export function MeuCadastro({
  data,
  reload,
  notify,
}: {
  data: InstructorDashboardData;
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [aba, setAba] = useState<AbaDoCadastro>('dados');
  return (
    <div className="space-y-6">
      <header className="border-b border-doc-ink pb-5">
        <h1 className="font-heading text-3xl leading-none font-extrabold uppercase md:text-4xl">
          Meu cadastro
        </h1>
      </header>
      <Abas
        rotuloDaLista="Seções do cadastro"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'dados', rotulo: 'Dados' },
          { id: 'documentos', rotulo: 'Documentos' },
          {
            id: 'disponibilidade',
            rotulo: 'Disponibilidade',
            contagem: data.availability.length,
          },
        ]}
      >
        {aba === 'dados' ? (
          <Dados data={data} reload={reload} notify={notify} />
        ) : null}
        {aba === 'documentos' ? <Documentos notify={notify} /> : null}
        {aba === 'disponibilidade' ? (
          <Disponibilidade data={data} reload={reload} notify={notify} />
        ) : null}
      </Abas>
    </div>
  );
}

function Dados({
  data,
  reload,
  notify,
}: {
  data: InstructorDashboardData;
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [form, setForm] = useState({
    name: data.instructor.name,
    phone: data.instructor.phone,
    professionalRegistry: data.instructor.professional_registry,
    baseCity: data.instructor.base_city,
    specialties: data.instructor.specialties,
  });
  const [saving, setSaving] = useState(false);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await salvarCadastro(form);
      notify('Cadastro atualizado com sucesso.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao salvar o cadastro.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid max-w-3xl gap-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={rotulo}>Nome completo</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>CPF</span>
        <input
          value={data.instructor.document}
          disabled
          className={cn(campo, mono)}
        />
        <span className="mt-1.5 block text-sm text-doc-ink-muted">
          Só a Space Light altera.
        </span>
      </label>
      <label>
        <span className={rotulo}>E-mail de acesso</span>
        <input value={data.instructor.email} disabled className={campo} />
        <span className="mt-1.5 block text-sm text-doc-ink-muted">
          Só a Space Light altera.
        </span>
      </label>
      <label>
        <span className={rotulo}>Telefone / WhatsApp</span>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>Registro profissional</span>
        <input
          value={form.professionalRegistry}
          onChange={(e) =>
            setForm({ ...form, professionalRegistry: e.target.value })
          }
          className={campo}
        />
      </label>
      <label>
        <span className={rotulo}>Cidade base</span>
        <input
          value={form.baseCity}
          onChange={(e) => setForm({ ...form, baseCity: e.target.value })}
          className={campo}
        />
      </label>
      <label className="sm:col-span-2">
        <span className={rotulo}>Especialidades / NRs</span>
        <input
          value={form.specialties}
          onChange={(e) => setForm({ ...form, specialties: e.target.value })}
          className={campo}
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className={botao({ className: 'disabled:opacity-60' })}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          Salvar alterações
        </button>
      </div>
    </form>
  );
}

/** Os 3 documentos obrigatórios. Também é a única tela do cadastro em análise. */
export function Documentos({ notify }: { notify: Notify }) {
  const [documents, setDocuments] = useState<MeuDocumento[] | null>(null);
  const [sending, setSending] = useState('');

  const load = useCallback(async () => {
    try {
      setDocuments(await lerDocumentos());
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    lerDocumentos()
      .then((lista) => {
        if (ativo) setDocuments(lista);
      })
      .catch(() => {
        if (ativo) setDocuments([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function send(
    category: string,
    event: SyntheticEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setSending(category);
    try {
      await enviarDocumento(category, chosen);
      notify('Documento enviado. A Space Light vai analisar.');
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao enviar o documento.',
      );
    } finally {
      setSending('');
      input.value = '';
    }
  }

  if (documents === null) return <Carregando linhas={3} />;
  const porCategoria = new Map(documents.map((item) => [item.category, item]));

  return (
    <ul className="max-w-3xl border-t border-doc-ink">
      {REQUIRED_INSTRUCTOR_DOCUMENTS.map((required) => {
        const enviado = porCategoria.get(required.category);
        const situacao = enviado
          ? INSTRUCTOR_DOCUMENT_STATUS[enviado.status]
          : null;
        return (
          <li
            key={required.category}
            className="flex flex-col gap-3 border-b border-doc-rule-strong py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {required.label}{' '}
                <span
                  className={cn(
                    mono,
                    'ml-1 text-xs',
                    situacao?.tone === 'bad'
                      ? 'text-doc-error'
                      : situacao?.tone === 'ok'
                        ? 'text-doc-ink'
                        : 'text-doc-mark',
                  )}
                >
                  {situacao?.label ?? 'Não enviado'}
                </span>
              </p>
              <p className="mt-1 max-w-measure text-sm text-doc-ink-muted">
                {required.help}
              </p>
              {enviado ? (
                <p className={cn(mono, 'mt-1 text-xs text-doc-ink-muted')}>
                  {enviado.name} ·{' '}
                  {Math.max(1, Math.round(enviado.size / 1024))} KB ·{' '}
                  {formatMoment(enviado.createdAt)}
                </p>
              ) : null}
              {enviado?.status === 'rejected' ? (
                <p className="mt-2 text-sm text-doc-error">
                  Recusado. Envie outro arquivo, legível e dentro da validade.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {enviado ? (
                <a
                  href={`/api/instructor-documents/${enviado.id}`}
                  target="_blank"
                  rel="noopener"
                  className={botao({ variante: 'contorno' })}
                >
                  Ver
                </a>
              ) : null}
              <label
                className={botao({
                  variante: enviado ? 'contorno' : 'primario',
                  className: cn(
                    'cursor-pointer',
                    sending === required.category &&
                      'pointer-events-none opacity-60',
                  ),
                })}
              >
                {sending === required.category ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                {sending === required.category
                  ? 'Enviando…'
                  : enviado
                    ? 'Reenviar'
                    : 'Enviar'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  onChange={(event) => void send(required.category, event)}
                  className="sr-only"
                />
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Disponibilidade({
  data,
  reload,
  notify,
}: {
  data: InstructorDashboardData;
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [selected, setSelected] = useState<Date | undefined>();
  const [note, setNote] = useState('');

  const meusDias = useMemo(
    () =>
      data.trainings.flatMap((training) =>
        (training.sessions ?? [])
          .filter((dia) => dia.instructor_id === data.instructor.id)
          .map((dia) => dateFromIso(dia.session_date)),
      ),
    [data.trainings, data.instructor.id],
  );
  const availableDates = data.availability.map((item) =>
    dateFromIso(item.available_date),
  );
  const selectedIso = selected ? isoFromDate(selected) : '';
  const disponivelNoDia = selectedIso
    ? data.availability.find((item) => item.available_date === selectedIso)
    : undefined;
  const ordenadas = [...data.availability].sort((a, b) =>
    a.available_date.localeCompare(b.available_date),
  );

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return notify('Selecione uma data no calendário.');
    try {
      await marcarDisponibilidade(isoFromDate(selected), note);
      notify('Disponibilidade registrada.');
      setNote('');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar a data.');
    }
  }

  async function remove(id: string) {
    try {
      await removerDisponibilidade(id);
      notify('Disponibilidade removida.');
      await reload();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Erro ao remover a data.',
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ptBR}
          modifiers={{ training: meusDias, available: availableDates }}
          modifiersClassNames={{
            training: 'bg-doc-ink text-doc-paper font-bold',
            available: 'ring-2 ring-sl-gold ring-inset',
          }}
          className="w-full border border-doc-rule-strong bg-doc-sheet [--cell-size:--spacing(11)]"
        />
        <p className="mt-3 flex flex-wrap gap-4 font-doc-mono text-xs text-doc-ink-muted">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="size-3 bg-doc-ink" />
            Seu treinamento
          </span>
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="size-3 border-2 border-sl-gold" />
            Disponível
          </span>
        </p>
        <form onSubmit={save} className="mt-5 space-y-3">
          <p className="font-semibold">
            {selected
              ? formatDate(selectedIso)
              : 'Escolha a data no calendário'}
          </p>
          {disponivelNoDia ? (
            <p className="flex items-center justify-between gap-3 text-sm">
              <span>
                Você já marcou este dia
                {disponivelNoDia.note ? ` · ${disponivelNoDia.note}` : ''}.
              </span>
              <button
                type="button"
                onClick={() => void remove(disponivelNoDia.id)}
                className={botaoTexto}
              >
                Remover
              </button>
            </p>
          ) : null}
          <label className="block">
            <span className={rotulo}>Observação (opcional)</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={campo}
            />
          </label>
          <button type="submit" className={botao({ className: 'w-full' })}>
            <Check className="size-4" aria-hidden="true" />
            Marcar disponibilidade
          </button>
        </form>
      </div>
      <section>
        <h2 className={cn(tituloBloco, 'mb-2')}>Datas informadas</h2>
        {ordenadas.length === 0 ? (
          <Vazio
            titulo="Nenhuma data informada"
            texto="Marque no calendário os dias em que você pode dar aula."
          />
        ) : (
          <ul className="border-t border-doc-ink">
            {ordenadas.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-doc-rule-strong py-3"
              >
                <div className="min-w-0">
                  <p className={cn(mono, 'text-sm')}>
                    {formatDate(item.available_date)}
                  </p>
                  {item.note ? (
                    <p className="truncate text-sm text-doc-ink-muted">
                      {item.note}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  aria-label={`Remover ${formatDate(item.available_date)}`}
                  className={botaoIcone}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
