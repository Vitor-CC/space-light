'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { formatDate } from '@/components/company-portal/company-ui';
import { botao, campo, mono, rotulo } from '@/components/portal/kit';
import type { CheckinResult, CompanyTraining } from '@/lib/company-types';
import { diaDoCheckin } from '@/lib/dias-da-turma';
import {
  limparDigitacaoCpf,
  limparDigitacaoRg,
  problemaCpf,
  problemaRg,
} from '@/lib/documentos';
import {
  checkinParticipant,
  findMockTrainingByToken,
  registerMockParticipant,
  RequestError,
} from '@/lib/mock-company-database';
import { cn } from '@/lib/utils';

type FormState = {
  fullName: string;
  documentId: string;
  rg: string;
  birthDate: string;
  jobTitle: string;
  email: string;
  phone: string;
  consent: boolean;
};

const initialForm: FormState = {
  fullName: '',
  documentId: '',
  rg: '',
  birthDate: '',
  jobTitle: '',
  email: '',
  phone: '',
  consent: false,
};

export function ParticipantForm() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [training, setTraining] = useState<CompanyTraining | null | undefined>(
    token ? undefined : null,
  );
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Começa pelo CPF: quem já se inscreveu num dia anterior só marca presença.
  const [step, setStep] = useState<'cpf' | 'form'>('cpf');
  const [cpf, setCpf] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkin, setCheckin] = useState<CheckinResult | null>(null);
  // Faltou um dia anterior: a turma segue sem ele e nada é gravado.
  const [blocked, setBlocked] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void findMockTrainingByToken(token)
      .then((result) => {
        if (!cancelled) setTraining(result);
      })
      .catch(() => {
        if (!cancelled) setTraining(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.consent) {
      setError('Confirme a autorização para registrar a participação.');
      return;
    }
    if (!form.email && !form.phone) {
      setError('Informe pelo menos um contato: e-mail ou telefone.');
      return;
    }
    const problemaDocumento =
      problemaCpf(form.documentId) ?? problemaRg(form.rg);
    if (problemaDocumento) {
      setError(problemaDocumento);
      return;
    }
    setBusy(true);
    try {
      const result = await registerMockParticipant(token, form);
      setCheckin(result.checkin);
      setSubmitted(true);
    } catch (submissionError) {
      if (
        submissionError instanceof RequestError &&
        submissionError.status === 403
      )
        setBlocked(submissionError.message);
      else
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Não foi possível concluir a inscrição.',
        );
    } finally {
      setBusy(false);
    }
  }

  async function submitCpf(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const problemaDocumento = problemaCpf(cpf);
    if (problemaDocumento) {
      setError(problemaDocumento);
      return;
    }
    setBusy(true);
    try {
      const result = await checkinParticipant(token, cpf);
      if (result.found && result.checkin) {
        setCheckin(result.checkin);
        setSubmitted(true);
      } else {
        update('documentId', cpf);
        setStep('form');
      }
    } catch (checkinError) {
      if (checkinError instanceof RequestError && checkinError.status === 403)
        setBlocked(checkinError.message);
      else
        setError(
          checkinError instanceof Error
            ? checkinError.message
            : 'Não foi possível registrar a presença.',
        );
    } finally {
      setBusy(false);
    }
  }

  if (training === undefined) {
    return (
      <Pagina>
        <output
          aria-label="Carregando"
          className="block h-40 animate-pulse bg-doc-rule"
        />
      </Pagina>
    );
  }

  if (!training) {
    return (
      <Pagina>
        <h1 className="font-heading text-3xl leading-none font-extrabold uppercase">
          Formulário indisponível
        </h1>
        <p className="mt-4 text-doc-ink-muted">
          O link pode estar errado ou ter sido desativado. Peça um novo QR Code
          ao instrutor.
        </p>
      </Pagina>
    );
  }

  if (blocked) {
    return (
      <Pagina>
        <h1 className="font-heading text-3xl leading-none font-extrabold uppercase">
          Check-in não permitido
        </h1>
        <p className="mt-4 border-l-4 border-doc-error py-1 pl-4">{blocked}</p>
      </Pagina>
    );
  }

  if (submitted) {
    const completo = checkin ? checkin.daysPresent >= checkin.totalDays : false;
    return (
      <Pagina>
        <p className="font-doc-mono text-xs text-doc-mark">
          {checkin?.alreadyCheckedIn
            ? 'Check-in já registrado'
            : 'Check-in confirmado'}
        </p>
        <h1 className="mt-2 font-heading text-4xl leading-none font-extrabold uppercase">
          Presença registrada
        </h1>
        <p className="mt-4">
          {checkin ? (
            <>
              {checkin.fullName}, dia {checkin.day}
              {checkin.totalDays > 1 ? ` de ${checkin.totalDays}` : ''} de{' '}
              <strong>
                {training.nr} · {training.title}
              </strong>
              .
            </>
          ) : (
            <>
              Dados vinculados a{' '}
              <strong>
                {training.nr} · {training.title}
              </strong>
              .
            </>
          )}
        </p>
        {checkin && checkin.totalDays > 1 ? (
          <p
            className={cn(
              'mt-5 border-l-4 py-1 pl-4',
              completo ? 'border-doc-ink' : 'border-sl-gold',
            )}
          >
            <strong className={mono}>
              {checkin.daysPresent} de {checkin.totalDays} dias.
            </strong>{' '}
            {completo
              ? 'Presença em todos os dias.'
              : 'Faça o check-in em todos os dias: o certificado exige presença completa.'}
          </p>
        ) : null}
      </Pagina>
    );
  }

  // O dia do check-in (hoje, ou o próximo), não o 1º dia da turma.
  const hoje = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  const diaAberto = diaDoCheckin(training, hoje);
  const totalDias = (training.sessions ?? []).length;
  const erro = error ? (
    <p
      role="alert"
      className="border-l-4 border-doc-error py-1 pl-4 text-sm font-semibold text-doc-error sm:col-span-2"
    >
      {error}
    </p>
  ) : null;

  return (
    <Pagina largo>
      <p className="font-doc-mono text-xs text-doc-mark">
        {training.client_name}
      </p>
      <h1 className="mt-2 font-heading text-3xl leading-none font-extrabold uppercase md:text-4xl">
        <span className="font-doc-mono text-doc-mark">{training.nr}</span>{' '}
        {training.title}
      </h1>
      <p className={cn(mono, 'mt-3 text-sm text-doc-ink-muted')}>
        {diaAberto
          ? `${formatDate(diaAberto.session_date)}${totalDias > 1 ? ` · dia ${diaAberto.day_number} de ${totalDias}` : ''}`
          : formatDate(training.training_date)}{' '}
        · {training.duration}
      </p>
      <p className="text-sm text-doc-ink-muted">{training.location}</p>

      <div className="mt-8 border-t border-doc-ink pt-6">
        {step === 'cpf' ? (
          <form onSubmit={submitCpf} className="grid max-w-md gap-5">
            <h2 className="font-heading text-xl font-bold">Check-in do dia</h2>
            <label>
              <span className={rotulo}>CPF</span>
              <input
                required
                value={cpf}
                onChange={(event) =>
                  setCpf(limparDigitacaoCpf(event.target.value))
                }
                className={cn(campo, mono)}
                inputMode="numeric"
                autoComplete="off"
                aria-describedby="cpf-ajuda"
              />
              <span
                id="cpf-ajuda"
                className="mt-1.5 block text-sm text-doc-ink-muted"
              >
                Só os 11 números. Se já fez check-in num dia anterior, a
                presença de hoje é registrada na hora.
              </span>
            </label>
            {erro}
            <button
              type="submit"
              disabled={busy}
              className={botao({
                tamanho: 'lg',
                className: 'disabled:opacity-60',
              })}
            >
              {busy ? 'Verificando…' : 'Fazer check-in'}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="font-heading text-xl font-bold">Seus dados</h2>
              <p className="text-sm text-doc-ink-muted">
                Só no primeiro dia. Nos próximos, basta o CPF.
              </p>
            </div>
            <label className="sm:col-span-2">
              <span className={rotulo}>Nome completo</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => update('fullName', event.target.value)}
                className={campo}
                autoComplete="name"
              />
            </label>
            <label>
              <span className={rotulo}>CPF</span>
              <input
                required
                value={form.documentId}
                onChange={(event) =>
                  update('documentId', limparDigitacaoCpf(event.target.value))
                }
                className={cn(campo, mono)}
                inputMode="numeric"
                autoComplete="off"
              />
              <span className="mt-1.5 block text-sm text-doc-ink-muted">
                Os 11 números, sem ponto nem traço.
              </span>
            </label>
            <label>
              <span className={rotulo}>RG</span>
              <input
                required
                value={form.rg}
                onChange={(event) =>
                  update('rg', limparDigitacaoRg(event.target.value))
                }
                className={cn(campo, mono)}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <span className="mt-1.5 block text-sm text-doc-ink-muted">
                Sem ponto nem traço. Sem o RG, digite o CPF.
              </span>
            </label>
            <label>
              <span className={rotulo}>Data de nascimento</span>
              <input
                required
                type="date"
                value={form.birthDate}
                onChange={(event) => update('birthDate', event.target.value)}
                className={cn(campo, mono)}
              />
            </label>
            <label>
              <span className={rotulo}>Cargo ou função</span>
              <input
                required
                value={form.jobTitle}
                onChange={(event) => update('jobTitle', event.target.value)}
                className={campo}
                autoComplete="organization-title"
              />
            </label>
            <label>
              <span className={rotulo}>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                className={campo}
                autoComplete="email"
              />
            </label>
            <label>
              <span className={rotulo}>Telefone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                className={campo}
                autoComplete="tel"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => update('consent', event.target.checked)}
                className="doc-focus mt-1 size-5 shrink-0 accent-sl-black"
              />
              <span className="text-sm">
                Autorizo o registro destes dados para controle de presença e
                emissão de documentos e certificados deste treinamento.
              </span>
            </label>
            {erro}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className={botao({
                  tamanho: 'lg',
                  className: 'w-full disabled:opacity-60 sm:w-auto',
                })}
              >
                {busy ? 'Enviando…' : 'Confirmar presença'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Pagina>
  );
}

function Pagina({
  children,
  largo = false,
}: {
  children: React.ReactNode;
  largo?: boolean;
}) {
  return (
    <main className="doc-ui min-h-dvh bg-doc-paper text-doc-ink">
      <header className="border-b border-doc-rule-strong">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link
            href="/"
            aria-label="Space Light Engenharia — site"
            className="doc-focus"
          >
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt=""
              width={260}
              height={49}
              className="h-6 w-auto"
            />
          </Link>
        </div>
      </header>
      <div
        className={cn('mx-auto px-4 py-10', largo ? 'max-w-3xl' : 'max-w-xl')}
      >
        {children}
      </div>
    </main>
  );
}
