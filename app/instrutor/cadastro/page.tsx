import { ArrowLeft, CalendarCheck2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const messages: Record<string, string> = {
  weak: 'Crie uma senha com pelo menos 10 caracteres.',
  mismatch: 'As duas senhas precisam ser iguais.',
  required: 'Preencha todos os campos obrigatórios.',
  exists: 'Já existe um cadastro com este CPF ou e-mail. Fale com a Space Light.',
};

export const dynamic = 'force-dynamic';

export default async function InstructorRegistrationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = status ? messages[status] : '';
  const fields = [
    ['name', 'Nome completo', 'Nome do instrutor', 'text'],
    ['document', 'CPF', '000.000.000-00', 'text'],
    ['email', 'E-mail', 'instrutor@email.com', 'email'],
    ['phone', 'Telefone / WhatsApp', '(11) 99999-9999', 'tel'],
    ['professionalRegistry', 'Registro profissional', 'Registro, conselho ou habilitação', 'text'],
    ['baseCity', 'Cidade base', 'São Paulo · SP', 'text'],
  ] as const;
  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">
    <header className="flex h-[76px] items-center justify-between border-b border-white/10 bg-black px-5 text-white sm:px-8"><Link href="/"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link><Link href="/instrutor/login" className="inline-flex h-11 items-center gap-2 border border-white/20 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em]"><ArrowLeft className="size-4" /> Voltar ao login</Link></header>
    <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[.72fr_1.28fr] lg:px-8 lg:py-16"><aside className="bg-black p-7 text-white lg:p-9"><CalendarCheck2 className="size-9 text-[#f2ad19]" /><span className="eyebrow mt-8 block text-[#f2ad19]">Área do Instrutor</span><h1 className="mt-4 text-4xl font-black uppercase leading-[.95] tracking-[0.01em]">Solicite seu acesso</h1><p className="mt-5 text-sm leading-relaxed text-white/60">Após o cadastro, a Space Light confere seus dados e aprova o acesso antes de liberar agenda e treinamentos.</p><div className="mt-8 border border-white/12 p-5"><ShieldCheck className="size-5 text-[#f2ad19]" /><strong className="mt-4 block text-sm uppercase tracking-[0.08em]">Aprovação obrigatória</strong><p className="mt-2 text-xs leading-relaxed text-white/50">Somente instrutores aprovados visualizam as turmas atribuídas pela gestão.</p></div></aside>
      <div className="border border-black/10 bg-white p-6 sm:p-8 lg:p-10"><span className="eyebrow text-[#8a6107]">Dados profissionais</span><h2 className="mt-3 text-3xl font-black uppercase tracking-[0.02em]">Cadastro do instrutor</h2>{message ? <p role="alert" className="mt-5 border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 text-sm font-semibold">{message}</p> : null}<form action="/api/auth/register-instructor" method="post" className="mt-7 grid gap-5 sm:grid-cols-2">{fields.map(([name, label, placeholder, type]) => <label key={name}><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">{label}</span><input name={name} type={type} required placeholder={placeholder} className="h-13 w-full border border-black/15 bg-[#fafaf8] px-4 text-sm outline-none focus:border-[#f2ad19]" /></label>)}<label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Especialidades / NRs</span><input name="specialties" required placeholder="Ex.: NR 10, NR 33, NR 35" className="h-13 w-full border border-black/15 bg-[#fafaf8] px-4 text-sm outline-none focus:border-[#f2ad19]" /></label><label><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Crie uma senha</span><input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder="Mínimo de 10 caracteres" className="h-13 w-full border border-black/15 bg-[#fafaf8] px-4 text-sm outline-none focus:border-[#f2ad19]" /></label><label><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Repita a senha</span><input name="passwordConfirmation" type="password" minLength={10} required autoComplete="new-password" placeholder="Repita a senha" className="h-13 w-full border border-black/15 bg-[#fafaf8] px-4 text-sm outline-none focus:border-[#f2ad19]" /></label><button type="submit" className="h-14 bg-[#f2ad19] px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-black hover:bg-[#ff9900] sm:col-span-2">Enviar para aprovação</button></form></div></section>
  </main>;
}
