'use client';

import { CalendarDays, CheckCircle2, Clock3, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { formatDate } from '@/components/company-portal/company-ui';
import { BarraProgresso, botaoClasses, Campo, campoClasses, Cartao, Faixa, Logo } from '@/components/ds/base';
import type { CheckinResult, CompanyTraining } from '@/lib/company-types';
import { diaDoCheckin } from '@/lib/dias-da-turma';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
import { checkinParticipant, findMockTrainingByToken, registerMockParticipant } from '@/lib/mock-company-database';

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
  const [training, setTraining] = useState<CompanyTraining | null | undefined>(undefined);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Começa pelo CPF: quem já se inscreveu num dia anterior só marca presença.
  const [step, setStep] = useState<'cpf' | 'form'>('cpf');
  const [cpf, setCpf] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkin, setCheckin] = useState<CheckinResult | null>(null);
  // Faltou um dia anterior: a turma segue sem ele e nada é gravado.

  useEffect(() => {
    let cancelled = false;
    if (!token) { setTraining(null); return; }
    void findMockTrainingByToken(token).then((result) => { if (!cancelled) setTraining(result); }).catch(() => { if (!cancelled) setTraining(null); });
    return () => { cancelled = true; };
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
    const problemaDocumento = problemaCpf(form.documentId) ?? problemaRg(form.rg);
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
      setError(submissionError instanceof Error ? submissionError.message : 'Não foi possível concluir a inscrição.');
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
      setError(checkinError instanceof Error ? checkinError.message : 'Não foi possível registrar a presença.');
    } finally {
      setBusy(false);
    }
  }

  const topo = <header className="bg-ds-inverso px-5 py-4"><div className="mx-auto flex max-w-xl items-center justify-between gap-4"><Link href="/" aria-label="Space Light Engenharia — início"><Logo cor="claro" className="h-9" /></Link><span className="hidden ds-caps text-ds-amarelo sm:block">Check-in do participante</span></div></header>;

  if (training === undefined) {
    return <main className="flex min-h-screen items-center justify-center bg-ds-inverso"><span className="size-3 animate-pulse rounded-full bg-ds-amarelo" /></main>;
  }

  if (!training) {
    return <main className="min-h-screen bg-ds-muted text-ds-texto">{topo}<div className="mx-auto max-w-xl px-4 py-10"><Cartao className="p-7 text-center"><h1 className="ds-h3">Formulário indisponível</h1><p className="mt-3 ds-body-s text-ds-texto-2">O link pode ter expirado, estar incorreto ou ter sido desativado. Peça um novo QR Code à equipe responsável pelo treinamento.</p></Cartao></div></main>;
  }

  // O dia do check-in (hoje, ou o próximo), não o 1º dia da turma.
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diaAberto = diaDoCheckin(training, hoje);
  const totalDias = (training.sessions ?? []).length;

  const cartaoTurma = <section className="flex flex-col gap-2.5 rounded-[10px] p-[18px] ds-degrade">
    <div className="flex items-start justify-between gap-3 ds-caps text-ds-texto"><span className="min-w-0 truncate">{training.client_name}</span>{totalDias > 1 && diaAberto ? <span className="shrink-0">Dia {diaAberto.day_number} de {totalDias}</span> : null}</div>
    <h1 className="ds-h4 text-ds-texto">{training.nr} · {training.title}</h1>
    <div className="flex flex-col gap-1 ds-body-s text-ds-texto [&_svg]:size-3.5">
      <span className="inline-flex items-center gap-1.5"><CalendarDays />{diaAberto ? formatDate(diaAberto.session_date) : formatDate(training.training_date)}</span>
      {training.duration ? <span className="inline-flex items-center gap-1.5"><Clock3 />{training.duration}</span> : null}
      {training.location ? <span className="inline-flex items-center gap-1.5"><MapPin />{training.location}</span> : null}
    </div>
  </section>;

  if (submitted) {
    const completo = checkin ? checkin.daysPresent >= checkin.totalDays : false;
    return <main className="min-h-screen bg-ds-muted text-ds-texto">{topo}<div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      <Cartao className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ds-sucesso text-ds-texto-inv"><CheckCircle2 className="size-7" /></span>
        <span className="ds-caps text-ds-sucesso">{checkin?.alreadyCheckedIn ? 'Check-in já registrado' : 'Check-in confirmado'}</span>
        <h1 className="ds-h3">Presença registrada</h1>
        <p className="ds-body-s text-ds-texto-2">{checkin ? <>{checkin.fullName}, sua presença no <strong className="font-semibold text-ds-texto">dia {checkin.day}{checkin.totalDays > 1 ? ` de ${checkin.totalDays}` : ''}</strong> de <strong className="font-semibold text-ds-texto">{training.nr} · {training.title}</strong> está registrada.</> : <>Seus dados foram vinculados a <strong className="font-semibold text-ds-texto">{training.nr} · {training.title}</strong>.</>}</p>
      </Cartao>
      {checkin && checkin.totalDays > 1 ? <Cartao className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3"><strong className="ds-body-s font-semibold">Presença na turma</strong><span className="ds-body-s font-medium">{checkin.daysPresent} de {checkin.totalDays} dias</span></div>
        <BarraProgresso valor={checkin.daysPresent} total={checkin.totalDays} />
        <p className="ds-caption text-ds-texto-2">{completo ? 'Você tem presença em todos os dias do treinamento.' : 'Faça o check-in em todos os dias: o certificado só sai para quem tem presença em todos eles.'}</p>
      </Cartao> : null}
      <Faixa tom="neutro" titulo="Importante">Esta inscrição não cria conta. Os registros e certificados são entregues à empresa contratante.</Faixa>
    </div></main>;
  }

  return <main className="min-h-screen bg-ds-muted text-ds-texto">
    {topo}
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      {cartaoTurma}
      <Cartao className="p-5 sm:p-7">
        <span className="ds-caps text-ds-amarelo-texto">{step === 'cpf' ? 'Check-in do dia' : 'Primeiro acesso'}</span>
        <h2 className="mt-1 ds-h4">{step === 'cpf' ? 'Informe seu CPF' : 'Seus dados'}</h2>
        {step === 'cpf' ? <form onSubmit={submitCpf} className="mt-5 flex flex-col gap-5">
          <p className="ds-body-s text-ds-texto-2">Já fez check-in em um dia anterior desta turma? A presença de hoje é registrada na hora. No primeiro acesso pedimos seus dados uma única vez.</p>
          <Campo rotulo="CPF *"><input required value={cpf} onChange={(event) => setCpf(limparDigitacaoCpf(event.target.value))} className={campoClasses} inputMode="numeric" autoComplete="off" placeholder="Só números" /></Campo>
          {error ? <Faixa tom="perigo">{error}</Faixa> : null}
          <button type="submit" disabled={busy} className={botaoClasses('primario', 'L', 'w-full')}>{busy ? 'Verificando…' : 'Fazer check-in'}</button>
        </form> : <form onSubmit={submit} className="mt-5 grid gap-5 sm:grid-cols-2">
          <Faixa tom="sinal" className="sm:col-span-2">Preencha seus dados uma vez. Nos próximos dias, basta o CPF.</Faixa>
          <Campo rotulo="Nome completo *" className="sm:col-span-2"><input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} className={campoClasses} autoComplete="name" /></Campo>
          <Campo rotulo="CPF *" ajuda="Os 11 números, sem ponto nem traço."><input required value={form.documentId} onChange={(event) => update('documentId', limparDigitacaoCpf(event.target.value))} className={campoClasses} inputMode="numeric" autoComplete="off" placeholder="Só números" /></Campo>
          <Campo rotulo="RG *" ajuda="Sem ponto nem traço. Não lembra o RG? Digite o CPF."><input required value={form.rg} onChange={(event) => update('rg', limparDigitacaoRg(event.target.value))} className={campoClasses} autoComplete="off" autoCapitalize="characters" placeholder="Só números" /></Campo>
          <Campo rotulo="Data de nascimento *"><input required type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} className={campoClasses} /></Campo>
          <Campo rotulo="Cargo ou função *"><input required value={form.jobTitle} onChange={(event) => update('jobTitle', event.target.value)} className={campoClasses} autoComplete="organization-title" /></Campo>
          <Campo rotulo="E-mail"><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={campoClasses} autoComplete="email" /></Campo>
          <Campo rotulo="Telefone"><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={campoClasses} autoComplete="tel" /></Campo>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ds-borda bg-ds-muted p-4 sm:col-span-2"><input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-0.5 size-4 accent-ds-inverso" /><span className="ds-caption text-ds-texto-2">Autorizo o registro destes dados para controle de presença, emissão de documentos e certificados relacionados a este treinamento. *</span></label>
          {error ? <Faixa tom="perigo" className="sm:col-span-2">{error}</Faixa> : null}
          <button type="submit" disabled={busy} className={botaoClasses('primario', 'L', 'w-full sm:col-span-2')}>{busy ? 'Enviando…' : 'Confirmar inscrição e presença'}</button>
          <p className="text-center ds-caption text-ds-texto-2 sm:col-span-2">Você não recebe uma conta. Os registros e certificados vão para a empresa contratante.</p>
        </form>}
      </Cartao>
    </div>
  </main>;
}
