import type { Metadata } from 'next';
import { ArrowLeft, LifeBuoy, MessageCircle, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Esqueci minha senha | Space Light Engenharia',
  description: 'Como recuperar o acesso ao portal da Space Light Engenharia.',
  robots: { index: false, follow: false },
};

const WHATSAPP = 'https://wa.me/5511941318646?text=Ol%C3%A1%2C%20esqueci%20a%20senha%20do%20Portal%20Space%20Light.%20Meu%20e-mail%20de%20acesso%20%C3%A9%3A%20';

const steps = [
  { number: '01', title: 'Fale com a Space Light', text: 'Chame no WhatsApp ou ligue e informe o e-mail que você usa para entrar no portal.' },
  { number: '02', title: 'A equipe gera uma senha temporária', text: 'A senha antiga deixa de funcionar na hora e a temporária é passada só para você.' },
  { number: '03', title: 'Você cria a sua nova senha', text: 'Entre com a senha temporária: o portal pede uma nova senha antes de liberar o acesso.' },
];

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const { portal } = await searchParams;
  const loginPath = portal === 'instrutor' ? '/instrutor/login' : '/cliente/login';

  return <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 py-12 text-white">
    <section className="w-full max-w-xl border border-white/12 bg-[#171716] p-7 sm:p-10">
      <Link href="/" aria-label="Voltar ao site da Space Light" className="block w-fit"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-12 w-auto brightness-0 invert" /></Link>
      <div className="mt-9 flex size-13 items-center justify-center bg-[#f2ad19] text-black"><LifeBuoy className="size-6" /></div>
      <span className="eyebrow mt-7 block text-[#f2ad19]">Recuperação de acesso</span>
      <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-.05em]">Esqueceu a senha?</h1>
      <p className="mt-5 text-sm leading-relaxed text-white/58">Por segurança, quem redefine a senha é a equipe da Space Light — o portal ainda não envia link de recuperação por e-mail. É rápido:</p>

      <ol className="mt-7 space-y-px bg-white/10">{steps.map((step) => <li key={step.number} className="flex gap-4 bg-[#171716] p-5">
        <span className="font-heading text-lg font-black text-[#f2ad19]">{step.number}</span>
        <span className="min-w-0"><strong className="block text-sm font-extrabold uppercase tracking-[-.01em]">{step.title}</strong><span className="mt-2 block text-xs leading-relaxed text-white/58">{step.text}</span></span>
      </li>)}</ol>

      <div className="mt-7 space-y-3">
        <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-4 bg-[#f2ad19] px-6 text-black transition hover:bg-[#ff9900]"><MessageCircle className="size-6 shrink-0" /><span><span className="eyebrow block">Atendimento direto</span><strong className="mt-1 block text-base font-extrabold uppercase">Falar no WhatsApp</strong></span></a>
        <a href="tel:+5511941318646" className="flex min-h-14 items-center gap-4 border border-white/18 px-6 text-sm font-bold transition hover:bg-white hover:text-black"><Phone className="size-4 shrink-0 text-[#f2ad19]" />+55 11 94131-8646</a>
      </div>

      <p className="mt-7 border-l-4 border-white/20 pl-4 text-xs leading-relaxed text-white/48">É da equipe da Space Light? Peça a redefinição ao dono da conta, que faz isso pela aba <strong className="font-bold text-white/70">Funcionários</strong> da Área da Empresa.</p>

      <Link href={loginPath} className="mt-7 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-white/50 transition hover:text-[#f2ad19]"><ArrowLeft className="size-3.5" />Voltar para o login</Link>
    </section>
  </main>;
}
