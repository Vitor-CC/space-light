import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Entrar no portal | Space Light Engenharia',
  description: 'Escolha sua área de acesso no portal da Space Light Engenharia.',
  robots: { index: false, follow: false },
};

const areas = [
  {
    href: '/cliente/login',
    icon: Building2,
    eyebrow: 'Empresas atendidas',
    title: 'Sou cliente',
    text: 'Acompanhe os treinamentos da sua equipe, listas de presença, fotos e certificados.',
  },
  {
    href: '/instrutor/login',
    icon: GraduationCap,
    eyebrow: 'Profissionais parceiros',
    title: 'Sou instrutor',
    text: 'Veja sua agenda, informe disponibilidade e conduza as turmas atribuídas a você.',
  },
  {
    href: '/empresa/login',
    icon: ShieldCheck,
    eyebrow: 'Uso interno',
    title: 'Sou da equipe Space Light',
    text: 'Gestão de clientes, instrutores, turmas, documentos e acessos da equipe.',
  },
];

export default async function ChooseAreaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
    <header className="flex h-[76px] items-center justify-between border-b border-white/10 px-5 sm:px-8">
      <Link href="/" aria-label="Space Light Engenharia — início"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link>
      <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-white/50 transition hover:text-[#f2ad19]"><ArrowLeft className="size-3.5" />Voltar ao site</Link>
    </header>

    <div className="flex flex-1 items-center justify-center px-5 py-14 sm:px-8">
      <div className="w-full max-w-3xl">
        <span className="eyebrow block text-[#f2ad19]">Portal Space Light</span>
        <h1 className="mt-4 text-[clamp(2.6rem,6vw,4.5rem)] font-black uppercase leading-[0.88] tracking-[0.01em] md:tracking-normal">Por onde você entra?</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/58 sm:text-base">Escolha a sua área para ir direto ao login certo.</p>
        {status === 'password-updated' ? <p role="status" className="mt-6 border-l-4 border-[#f2ad19] bg-[#f2ad19]/12 p-4 text-sm leading-relaxed text-white/85">Senha alterada. Entre com a nova senha pela sua área.</p> : null}

        <nav aria-label="Áreas de acesso" className="mt-9 space-y-px bg-white/10">{areas.map((area) => <Link key={area.href} href={area.href} className="group flex items-center gap-5 bg-[#171716] p-6 transition hover:bg-[#f2ad19] hover:text-black sm:p-7">
          <span className="flex size-13 shrink-0 items-center justify-center bg-[#f2ad19] text-black transition group-hover:bg-black group-hover:text-[#f2ad19]"><area.icon className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="eyebrow block text-[#f2ad19] transition group-hover:text-black/60">{area.eyebrow}</span>
            <strong className="mt-2 block text-xl font-extrabold uppercase tracking-[0.04em] sm:text-2xl sm:tracking-[0.03em]">{area.title}</strong>
            <span className="mt-2 block text-xs leading-relaxed text-white/55 transition group-hover:text-black/70 sm:text-sm">{area.text}</span>
          </span>
          <ArrowUpRight className="size-6 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-black" />
        </Link>)}</nav>

        <p className="mt-8 text-xs leading-relaxed text-white/45">Não tem acesso ainda? <Link href="/cliente/cadastro" className="font-bold text-[#f2ad19] underline underline-offset-2 hover:text-white">Cadastre sua empresa</Link> ou <Link href="/instrutor/cadastro" className="font-bold text-[#f2ad19] underline underline-offset-2 hover:text-white">cadastre-se como instrutor</Link>. Funcionários da Space recebem o acesso do dono da conta.</p>
      </div>
    </div>
  </main>;
}
