'use client';

import { CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { formatDate, inputClass } from '@/components/company-portal/company-ui';
import type { CompanyTraining } from '@/lib/company-types';
import { findMockTrainingByToken, registerMockParticipant } from '@/lib/mock-company-database';

type FormState = {
  fullName: string;
  documentId: string;
  jobTitle: string;
  email: string;
  phone: string;
  consent: boolean;
};

const initialForm: FormState = {
  fullName: '',
  documentId: '',
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
    try {
      await registerMockParticipant(token, form);
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Não foi possível concluir a inscrição.');
    }
  }

  if (training === undefined) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><span className="size-3 animate-pulse bg-[#f2ad19]" /></main>;
  }

  if (!training) {
    return <main className="flex min-h-screen items-center justify-center bg-[#efefeb] p-5 text-[#0b0b0b]"><section className="w-full max-w-xl border-t-4 border-[#f2ad19] bg-white p-8 text-center shadow-xl"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="mx-auto h-14 w-auto" /><h1 className="mt-9 text-3xl font-black uppercase tracking-[-0.05em]">Formulário indisponível</h1><p className="mt-4 text-sm leading-relaxed text-[#666]">O link pode ter expirado, estar incorreto ou ter sido desativado. Solicite um novo QR Code à equipe responsável pelo treinamento.</p></section></main>;
  }

  if (submitted) {
    return <main className="flex min-h-screen items-center justify-center bg-black p-5 text-white"><section className="w-full max-w-2xl border border-white/15 bg-[#171716] p-8 text-center md:p-12"><span className="mx-auto flex size-16 items-center justify-center bg-[#f2ad19] text-black"><CheckCircle2 className="size-8" /></span><span className="eyebrow mt-8 block text-[#f2ad19]">Inscrição confirmada</span><h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.055em]">Presença registrada.</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/62">Seus dados foram vinculados a <strong className="text-white">{training.nr} · {training.title}</strong>. Apresente-se à equipe Space Light no início do treinamento.</p><div className="mt-8 border-l-4 border-[#f2ad19] bg-white/5 p-4 text-left"><strong className="block text-xs uppercase">Importante</strong><p className="mt-2 text-xs leading-relaxed text-white/55">Esta inscrição não cria conta e não libera acesso à Área do Cliente. O portal é exclusivo da empresa contratante; o participante apenas preenche este formulário público.</p></div></section></main>;
  }

  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">
    <header className="bg-black px-5 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-5"><Link href="/" aria-label="Space Light Engenharia — início"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-12 w-auto brightness-0 invert" /></Link><span className="hidden text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/45 sm:block">Formulário do participante</span></div></header>
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-8 lg:grid-cols-[.78fr_1.22fr] lg:py-12">
      <aside className="relative overflow-hidden bg-black p-7 text-white md:p-10"><div className="hero-grid absolute inset-0 opacity-25" /><div className="relative z-10"><span className="eyebrow text-[#f2ad19]">{training.client_name}</span><h1 className="mt-5 text-4xl font-black uppercase leading-[.94] tracking-[-0.06em]">{training.nr}<br />{training.title}</h1><p className="mt-5 text-sm leading-relaxed text-white/58">Preencha seus dados para registrar sua participação. Leva menos de dois minutos.</p><div className="mt-9 space-y-4 border-t border-white/12 pt-7 text-xs text-white/65"><p className="flex items-center gap-3"><CalendarDays className="size-4 text-[#f2ad19]" />{formatDate(training.training_date)}</p><p className="flex items-center gap-3"><Clock3 className="size-4 text-[#f2ad19]" />{training.duration}</p><p className="flex items-center gap-3"><MapPin className="size-4 text-[#f2ad19]" />{training.location}</p></div></div></aside>
      <section className="bg-white p-6 md:p-10"><div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center bg-[#f2ad19]"><UserRound className="size-5" /></span><div><span className="eyebrow text-[#8a6107]">Cadastro de presença</span><h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">Dados do participante</h2></div></div><form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Nome completo *</span><input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} className={inputClass} autoComplete="name" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Matrícula ou identificador *</span><input required value={form.documentId} onChange={(event) => update('documentId', event.target.value)} className={inputClass} /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Cargo ou função *</span><input required value={form.jobTitle} onChange={(event) => update('jobTitle', event.target.value)} className={inputClass} autoComplete="organization-title" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">E-mail</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} autoComplete="email" /></label><label><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.11em]">Telefone</span><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} autoComplete="tel" /></label><label className="sm:col-span-2 flex cursor-pointer items-start gap-3 border border-black/10 bg-[#f7f7f4] p-4"><input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-0.5 size-4 accent-[#f2ad19]" /><span className="text-xs leading-relaxed text-[#555]">Autorizo o registro destes dados para controle de presença, emissão de documentos e certificados relacionados a este treinamento. *</span></label>{error ? <p role="alert" className="sm:col-span-2 border-l-4 border-[#b62525] bg-[#fff1f1] p-3 text-xs font-bold text-[#8f1717]">{error}</p> : null}<button type="submit" className="sm:col-span-2 inline-flex h-14 items-center justify-center gap-3 bg-[#f2ad19] px-6 text-[10px] font-extrabold uppercase tracking-[0.13em] text-black hover:bg-[#ff9900]"><ShieldCheck className="size-4" />Confirmar minha inscrição</button><p className="sm:col-span-2 text-center text-[10px] leading-relaxed text-[#888]">Você não receberá uma conta. Os registros e certificados serão entregues à empresa contratante.</p></form></section>
    </div>
  </main>;
}
