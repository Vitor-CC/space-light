import { ArrowLeft, ArrowRight, Building2, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const messages: Record<string, string> = {
  invalid: 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
  pending: 'Seu cadastro foi recebido e aguarda aprovação da Space Light.',
  registered: 'Cadastro enviado. A Space Light fará a aprovação antes do primeiro acesso.',
  session: 'Sua sessão expirou. Entre novamente para continuar.',
  logout: 'Você saiu com segurança.',
};

export function ClientLogin({ status, portal = 'client' }: { status?: string; portal?: 'client' | 'instructor' }) {
  const isInstructor = portal === 'instructor';
  const message = status === 'registered'
    ? isInstructor
      ? 'Cadastro enviado. A Space Light fará a aprovação antes do primeiro acesso.'
      : messages.registered
    : status ? messages[status] : '';
  return (
    <main className="grid min-h-screen bg-[#080808] text-white lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image src="/images/brand-v2/heroes/space-light-hero-02-brand-v2.png" alt="Treinamento prático conduzido pela Space Light Engenharia" fill priority sizes="55vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.25),rgba(0,0,0,.82)),linear-gradient(0deg,rgba(0,0,0,.96),transparent_62%)]" />
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <Link href="/" aria-label="Voltar ao site da Space Light" className="w-fit"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-14 w-auto brightness-0 invert" /></Link>
          <div className="max-w-2xl"><span className="eyebrow text-[#f2ad19]">Portal corporativo</span><h1 className="mt-6 text-[clamp(3.5rem,6vw,7rem)] font-black uppercase leading-[0.86] tracking-[-0.07em]">Tudo do seu treinamento em um só lugar.</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-white/68">Consulte registros, fotos, documentos e certificados organizados pela Space Light para a sua empresa.</p></div>
        </div>
      </section>
      <section className="flex min-h-screen flex-col bg-[#f5f5f2] text-[#0b0b0b]">
        <header className="flex h-[76px] items-center justify-between border-b border-black/10 px-5 sm:px-8 lg:hidden"><Link href="/" aria-label="Space Light Engenharia — início"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto object-contain" /></Link><Link href="/" className="flex size-11 items-center justify-center border border-black/15" aria-label="Voltar ao site"><ArrowLeft className="size-4" /></Link></header>
        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-14 xl:px-24"><div className="w-full max-w-[540px]">
          <div className="flex size-14 items-center justify-center bg-black text-[#f2ad19]"><ShieldCheck className="size-6" /></div><span className="eyebrow mt-8 block text-[#8a6107]">{isInstructor ? 'Área do Instrutor' : 'Portal Space Light'}</span><h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.055em] sm:text-5xl">Acesse sua conta</h2><p className="mt-5 max-w-md text-sm leading-relaxed text-[#666] sm:text-base">{isInstructor ? 'Consulte sua agenda, informe disponibilidade e inicie os treinamentos atribuídos a você.' : 'Clientes e equipe da Space Light usam este mesmo acesso. Cada conta é direcionada automaticamente para a área correta.'}</p>
          {message ? <p role="status" className="mt-6 border-l-4 border-[#f2ad19] bg-white p-4 text-sm font-semibold leading-relaxed text-[#444]">{message}</p> : null}
          <form action="/api/auth/login" method="post" className="mt-7 space-y-4"><input type="hidden" name="loginPath" value={isInstructor ? '/instrutor/login' : '/cliente/login'} /><label className="block"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">E-mail corporativo</span><input name="email" type="email" autoComplete="email" required placeholder={isInstructor ? 'instrutor@email.com' : 'voce@empresa.com.br'} className="h-14 w-full rounded-none border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/20" /></label><label className="block"><span className="mb-2 flex items-baseline justify-between gap-3"><span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Senha</span><Link href={isInstructor ? '/esqueci-senha?portal=instrutor' : '/esqueci-senha'} className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] underline underline-offset-2 hover:text-black">Esqueci minha senha</Link></span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a6107]" /><input name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" className="h-14 w-full rounded-none border border-black/15 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/20" /></span></label><button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-2 bg-[#f2ad19] px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-[#ff9900]">Entrar no portal <ArrowRight className="size-4" /></button></form>
          <div className="mt-7 grid gap-px bg-black/12 sm:grid-cols-2"><div className="bg-white p-5"><Building2 className="size-5 text-[#8a6107]" /><strong className="mt-4 block text-sm uppercase">Acesso criado pela Space</strong><p className="mt-2 text-xs leading-relaxed text-[#666]">Use a senha temporária enviada pela equipe e crie uma nova no primeiro acesso.</p></div><Link href={isInstructor ? '/instrutor/cadastro' : '/cliente/cadastro'} className="group bg-white p-5 transition hover:bg-[#fff8e8]"><UserPlus className="size-5 text-[#8a6107]" /><strong className="mt-4 block text-sm uppercase">{isInstructor ? 'Cadastrar como instrutor' : 'Cadastrar minha empresa'}</strong><p className="mt-2 text-xs leading-relaxed text-[#666]">Envie os dados para análise e aprovação da Space Light.</p></Link></div><p className="mt-5 text-center text-xs text-[#666]">{isInstructor ? <>É cliente da Space Light? <Link href="/cliente/login" className="font-bold text-[#8a6107] underline hover:text-black">Acesse a Área do Cliente</Link></> : <>É instrutor da Space Light? <Link href="/instrutor/login" className="font-bold text-[#8a6107] underline hover:text-black">Acesse a Área do Instrutor e cadastre-se</Link></>}</p>
        </div></div>
      </section>
    </main>
  );
}
