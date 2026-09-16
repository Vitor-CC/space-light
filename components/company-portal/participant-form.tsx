'use client';

import { CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { formatDate, inputClass } from '@/components/company-portal/company-ui';
import type { CheckinResult, CompanyTraining } from '@/lib/company-types';
import { diaDoCheckin } from '@/lib/dias-da-turma';
import { limparDigitacaoCpf, limparDigitacaoRg, problemaCpf, problemaRg } from '@/lib/documentos';
import { checkinParticipant, findMockTrainingByToken, registerMockParticipant, RequestError } from '@/lib/mock-company-database';

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
  const [blocked, setBlocked] = useState('');

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
      if (submissionError instanceof RequestError && submissionError.status === 403) setBlocked(submissionError.message);
      else setError(submissionError instanceof Error ? submissionError.message : 'Não foi possível concluir a inscrição.');
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
      if (checkinError instanceof RequestError && checkinError.status === 403) setBlocked(checkinError.message);
      else setError(checkinError instanceof Error ? checkinError.message : 'Não foi possível registrar a presença.');
    } finally {
      setBusy(false);
    }
  }

  if (training === undefined) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><span className="size-3 animate-pulse bg-[#f2ad19]" /></main>;
  }

  if (!training) {
    return <main className="flex min-h-screen items-center justify-center bg-[#efefeb] p-5 text-[#0b0b0b]"><section className="w-full max-w-xl border-t-4 border-[#f2ad19] bg-white p-8 text-center shadow-xl"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="mx-auto h-14 w-auto" /><h1 className="mt-9 text-3xl font-black uppercase tracking-[0.02em]">Formulário indisponível</h1><p className="mt-4 text-sm leading-relaxed text-[#666]">O link pode ter expirado, estar incorreto ou ter sido desativado. Solicite um novo QR Code à equipe responsável pelo treinamento.</p></section></main>;
  }

  if (blocked) {
    return <main className="flex min-h-screen items-center justify-center bg-[#efefeb] p-5 text-[#0b0b0b]"><section className="w-full max-w-xl border-t-4 border-[#b62525] bg-white p-8 text-center shadow-xl"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="mx-auto h-14 w-auto" /><h1 className="mt-9 text-3xl font-black uppercase tracking-[0.02em]">Check-in não permitido</h1><p className="mt-4 text-sm leading-relaxed text-[#666]">{blocked}</p></section></main>;
  }

  if (submitted) {
    return <main className="flex min-h-screen items-center justify-center bg-black p-5 text-white"><section className="w-full max-w-2xl border border-white/15 bg-[#171716] p-8 text-center md:p-12"><span className="mx-auto flex size-16 items-center justify-center bg-[#f2ad19] text-black"><CheckCircle2 className="size-8" /></span><span className="eyebrow mt-8 block text-[#f2ad19]">{checkin?.alreadyCheckedIn ? 'Check-in já registrado' : 'Check-in confirmado'}</span><h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-[0.01em]">Presença registrada.</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/62">{checkin ? <>{checkin.fullName}, sua presença no <strong className="text-white">dia {checkin.day}{checkin.totalDays > 1 ? ` de ${checkin.totalDays}` : ''}</strong> de <strong className="text-white">{training.nr} · {training.title}</strong> está registrada.</> : <>Seus dados foram vinculados a <strong className="text-white">{training.nr} · {training.title}</strong>.</>}</p>{checkin && checkin.totalDays > 1 ? <p className={`mx-auto mt-5 max-w-lg border-l-4 p-4 text-left text-xs leading-relaxed ${checkin.daysPresent >= checkin.totalDays ? 'border-[#3fae5c] bg-[#3fae5c]/10 text-white/75' : 'border-[#f2ad19] bg-white/5 text-white/70'}`}><strong className="mb-1 block text-white">Presença em {checkin.daysPresent} de {checkin.totalDays} dias</strong>{checkin.daysPresent >= checkin.totalDays ? 'Você tem presença em todos os dias do treinamento.' : 'Faça o check-in em todos os dias: o certificado só é emitido para quem tem presença em todos eles.'}</p> : null}<div className="mt-8 border-l-4 border-[#f2ad19] bg-white/5 p-4 text-left"><strong className="block text-xs uppercase tracking-[0.1em]">Importante</strong><p className="mt-2 text-xs leading-relaxed text-white/55">Esta inscrição não cria conta e não libera acesso à Área do Cliente. O portal é exclusivo da empresa contratante; o participante apenas preenche este formulário público.</p></div></section></main>;
  }

  // O dia do check-in (hoje, ou o próximo), não o 1º dia da turma.
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diaAberto = diaDoCheckin(training, hoje);
  const totalDias = (training.sessions ?? []).length;
  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">
    <header className="bg-black px-5 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-5"><Link href="/" aria-label="Space Light Engenharia — início"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-12 w-auto brightness-0 invert" /></Link><span className="hidden text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/45 sm:block">Formulário do participante</span></div></header>
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-8 lg:grid-cols-[.78fr_1.22fr] lg:py-12">
      <aside className="relative overflow-hidden bg-black p-7 text-white md:p-10"><div className="hero-grid absolute inset-0 opacity-25" /><div className="relative z-10"><span className="eyebrow text-[#f2ad19]">{training.client_name}</span><h1 className="mt-5 text-4xl font-black uppercase leading-[.94] tracking-[0.01em]">{training.nr}<br />{training.title}</h1><p className="mt-5 text-sm leading-relaxed text-white/58">Faça o check-in em cada dia do treinamento com o seu CPF. O certificado só é emitido para quem tem presença em todos os dias.</p><div className="mt-9 space-y-4 border-t border-white/12 pt-7 text-xs text-white/65"><p className="flex items-center gap-3"><CalendarDays className="size-4 text-[#f2ad19]" />{diaAberto ? `${formatDate(diaAberto.session_date)}${totalDias > 1 ? ` · dia ${diaAberto.day_number} de ${totalDias}` : ''}` : formatDate(training.training_date)}</p><p className="flex items-center gap-3"><Clock3 className="size-4 text-[#f2ad19]" />{training.duration}</p><p className="flex items-center gap-3"><MapPin className="size-4 text-[#f2ad19]" />{training.location}</p></div></div></aside>
      <section className="bg-white p-6 md:p-10"><div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center bg-[#f2ad19]"><UserRound className="size-5" /></span><div><span className="eyebrow text-[#8a6107]">{step === 'cpf' ? 'Check-in do dia' : 'Primeiro acesso'}</span><h2 className="mt-2 text-2xl font-black uppercase tracking-[0.03em]">{step === 'cpf' ? 'Informe seu CPF' : 'Dados do participante'}</h2></div></div>{step === 'cpf' ? <form onSubmit={submitCpf} className="mt-8 grid gap-5"><p className="text-sm leading-relaxed text-[#666]">Se você já fez o check-in em um dia anterior deste treinamento, a presença de hoje é registrada na hora. No primeiro acesso, pedimos seus dados uma única vez.</p><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">CPF *</span><input required value={cpf} onChange={(event) => setCpf(limparDigitacaoCpf(event.target.value))} className={inputClass} inputMode="numeric" autoComplete="off" placeholder="Só números" /></label>{error ? <p role="alert" className="border-l-4 border-[#b62525] bg-[#fff1f1] p-3 text-xs font-bold text-[#8f1717]">{error}</p> : null}<button type="submit" disabled={busy} className="inline-flex h-14 items-center justify-center gap-3 bg-[#f2ad19] px-6 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900] disabled:opacity-50"><ShieldCheck className="size-4" />{busy ? 'Verificando…' : 'Fazer check-in'}</button></form> : <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2"><p className="sm:col-span-2 border-l-4 border-[#f2ad19] bg-[#fff8e8] p-3 text-xs leading-relaxed text-[#555]">Primeiro acesso nesta turma: preencha seus dados uma vez. Nos próximos dias, basta o CPF.</p><label className="sm:col-span-2"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Nome completo *</span><input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} className={inputClass} autoComplete="name" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">CPF *</span><input required value={form.documentId} onChange={(event) => update('documentId', limparDigitacaoCpf(event.target.value))} className={inputClass} inputMode="numeric" autoComplete="off" placeholder="Só números" /><span className="mt-1.5 block text-[11px] leading-relaxed text-[#777]">Os 11 números, sem ponto nem traço.</span></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">RG *</span><input required value={form.rg} onChange={(event) => update('rg', limparDigitacaoRg(event.target.value))} className={inputClass} autoComplete="off" autoCapitalize="characters" placeholder="Só números" /><span className="mt-1.5 block text-[11px] leading-relaxed text-[#777]">Sem ponto nem traço. Não lembra o RG? Digite o seu CPF aqui.</span></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Data de nascimento *</span><input required type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} className={inputClass} /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Cargo ou função *</span><input required value={form.jobTitle} onChange={(event) => update('jobTitle', event.target.value)} className={inputClass} autoComplete="organization-title" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">E-mail</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} autoComplete="email" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Telefone</span><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} autoComplete="tel" /></label><label className="sm:col-span-2 flex cursor-pointer items-start gap-3 border border-black/10 bg-[#f7f7f4] p-4"><input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-0.5 size-4 accent-[#f2ad19]" /><span className="text-xs leading-relaxed text-[#555]">Autorizo o registro destes dados para controle de presença, emissão de documentos e certificados relacionados a este treinamento. *</span></label>{error ? <p role="alert" className="sm:col-span-2 border-l-4 border-[#b62525] bg-[#fff1f1] p-3 text-xs font-bold text-[#8f1717]">{error}</p> : null}<button type="submit" disabled={busy} className="sm:col-span-2 inline-flex h-14 items-center justify-center gap-3 bg-[#f2ad19] px-6 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900] disabled:opacity-50"><ShieldCheck className="size-4" />{busy ? 'Enviando…' : 'Confirmar inscrição e presença'}</button><p className="sm:col-span-2 text-center text-[10px] leading-relaxed text-[#888]">Você não receberá uma conta. Os registros e certificados serão entregues à empresa contratante.</p></form>}</section>
    </div>
  </main>;
}
