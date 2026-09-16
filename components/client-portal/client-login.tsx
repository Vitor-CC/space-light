import { ArrowLeft, ArrowRight, Building2, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export type LoginPortal = 'client' | 'instructor' | 'company';

const messages: Record<string, string> = {
  invalid: 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
  pending: 'Seu cadastro foi recebido e aguarda aprovação da Space Light.',
  registered: 'Cadastro enviado. A Space Light fará a aprovação antes do primeiro acesso.',
  login: 'Entre com seu e-mail e senha para continuar.',
  session: 'Sua sessão expirou. Entre novamente para continuar.',
  logout: 'Você saiu com segurança.',
};

/** Na porta da empresa o login é o nome de usuário, não o e-mail. */
const usernameMessages: Record<string, string> = {
  invalid: 'Nome de usuário ou senha incorretos. Confira os dados e tente novamente.',
  login: 'Entre com seu nome de usuário e senha para continuar.',
};

type PortalCopy = {
  loginPath: string;
  forgotKey: string;
  heroImage: string;
  heroAlt: string;
  heroEyebrow: string;
  heroTitle: string;
  heroText: string;
  eyebrow: string;
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  info: { title: string; text: string };
  register: { href: string; title: string; text: string } | null;
  registeredMessage?: string;
  /** A empresa entra pelo nome de usuário criado pela Space. */
  usernameLogin?: boolean;
};

const portals: Record<LoginPortal, PortalCopy> = {
  client: {
    loginPath: '/cliente/login',
    forgotKey: 'cliente',
    heroImage: '/images/brand-v2/heroes/space-light-hero-02-brand-v2.png',
    heroAlt: 'Treinamento prático conduzido pela Space Light Engenharia',
    heroEyebrow: 'Portal do cliente',
    heroTitle: 'Tudo do seu treinamento em um só lugar.',
    heroText: 'Consulte registros, fotos, documentos e certificados organizados pela Space Light para a sua empresa.',
    eyebrow: 'Portal do cliente',
    title: 'Acesse sua conta',
    description: 'Use o nome de usuário que a Space Light criou para a sua empresa.',
    emailLabel: 'Nome de usuário',
    emailPlaceholder: 'ex.: empresaexemplo1',
    info: { title: 'Acesso criado pela Space', text: 'Use a senha temporária enviada pela equipe e crie uma nova no primeiro acesso.' },
    register: null,
    usernameLogin: true,
  },
  instructor: {
    loginPath: '/instrutor/login',
    forgotKey: 'instrutor',
    heroImage: '/images/brand-v2/editorial/space-light-editorial-teoria-brand-v2.png',
    heroAlt: 'Instrutor da Space Light conduzindo a parte teórica de um treinamento',
    heroEyebrow: 'Área do instrutor',
    heroTitle: 'Sua agenda e suas turmas, do aceite ao encerramento.',
    heroText: 'Informe disponibilidade, acompanhe os treinamentos atribuídos a você e registre a presença da turma.',
    eyebrow: 'Área do instrutor',
    title: 'Acesse sua conta',
    description: 'Consulte sua agenda, informe disponibilidade e inicie os treinamentos atribuídos a você.',
    emailLabel: 'Seu e-mail',
    emailPlaceholder: 'instrutor@email.com',
    info: { title: 'Acesso criado pela Space', text: 'Use a senha temporária enviada pela equipe e crie uma nova no primeiro acesso.' },
    register: { href: '/instrutor/cadastro', title: 'Cadastrar como instrutor', text: 'Envie os dados para análise e aprovação da Space Light.' },
    registeredMessage: 'Cadastro enviado. A Space Light fará a aprovação antes do primeiro acesso.',
  },
  company: {
    loginPath: '/empresa/login',
    forgotKey: 'empresa',
    heroImage: '/images/brand-v2/editorial/space-light-editorial-equipe-brand-v2.png',
    heroAlt: 'Equipe da Space Light Engenharia em campo',
    heroEyebrow: 'Área da empresa',
    heroTitle: 'A operação inteira da Space Light em um painel.',
    heroText: 'Clientes, instrutores, turmas, listas de presença e documentos — cada item ligado ao treinamento certo.',
    eyebrow: 'Área da empresa',
    title: 'Acesso da equipe',
    description: 'Entrada restrita à equipe da Space Light. Cada pessoa entra com o próprio login e toda ação fica registrada.',
    emailLabel: 'E-mail da equipe',
    emailPlaceholder: 'voce@spacelightengenharia.com.br',
    info: { title: 'Acesso criado pelo dono', text: 'Funcionários não se cadastram sozinhos: o dono da conta cria o acesso na aba Funcionários e passa a senha temporária.' },
    register: null,
  },
};

export function ClientLogin({ status, portal = 'client' }: { status?: string; portal?: LoginPortal }) {
  const copy = portals[portal];
  const message = status === 'registered'
    ? copy.registeredMessage ?? messages.registered
    : copy.usernameLogin && (status === 'invalid' || status === 'login')
      ? usernameMessages[status]
      : status ? messages[status] : '';
  return (
    <main className="grid min-h-screen bg-[#080808] text-white lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image src={copy.heroImage} alt={copy.heroAlt} fill priority sizes="55vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.25),rgba(0,0,0,.82)),linear-gradient(0deg,rgba(0,0,0,.96),transparent_62%)]" />
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <Link href="/" aria-label="Voltar ao site da Space Light" className="w-fit"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-14 w-auto brightness-0 invert" /></Link>
          <div className="max-w-2xl"><span className="eyebrow text-[#f2ad19]">{copy.heroEyebrow}</span><h1 className="mt-6 text-[clamp(3.5rem,6vw,7rem)] font-black uppercase leading-[0.86] tracking-normal md:tracking-[-0.01em] xl:tracking-[-0.02em]">{copy.heroTitle}</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-white/68">{copy.heroText}</p></div>
        </div>
      </section>
      <section className="flex min-h-screen flex-col bg-[#f5f5f2] text-[#0b0b0b]">
        <header className="flex h-[76px] items-center justify-between border-b border-black/10 px-5 sm:px-8 lg:hidden"><Link href="/" aria-label="Space Light Engenharia — início"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto object-contain" /></Link><Link href="/entrar" className="flex size-11 items-center justify-center border border-black/15" aria-label="Escolher outra área de acesso"><ArrowLeft className="size-4" /></Link></header>
        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-14 xl:px-24"><div className="w-full max-w-[540px]">
          <div className="flex size-14 items-center justify-center bg-black text-[#f2ad19]"><ShieldCheck className="size-6" /></div><span className="eyebrow mt-8 block text-[#8a6107]">{copy.eyebrow}</span><h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[0.01em] sm:text-5xl sm:tracking-normal">{copy.title}</h2><p className="mt-5 max-w-md text-sm leading-relaxed text-[#666] sm:text-base">{copy.description}</p>
          {message ? <p role="status" className="mt-6 border-l-4 border-[#f2ad19] bg-white p-4 text-sm font-semibold leading-relaxed text-[#444]">{message}</p> : null}
          <form action="/api/auth/login" method="post" className="mt-7 space-y-4"><input type="hidden" name="loginPath" value={copy.loginPath} /><label className="block"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">{copy.emailLabel}</span><input name="login" type={copy.usernameLogin ? 'text' : 'email'} autoComplete={copy.usernameLogin ? 'username' : 'email'} autoCapitalize="none" spellCheck={false} required placeholder={copy.emailPlaceholder} className="h-14 w-full rounded-none border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/20" /></label><label className="block"><span className="mb-2 flex items-baseline justify-between gap-3"><span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">Senha</span><Link href={`/esqueci-senha?portal=${copy.forgotKey}`} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107] underline underline-offset-2 hover:text-black">Esqueci minha senha</Link></span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a6107]" /><input name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" className="h-14 w-full rounded-none border border-black/15 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/20" /></span></label><button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-2 bg-[#f2ad19] px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-black transition hover:bg-[#ff9900]">Entrar no portal <ArrowRight className="size-4" /></button></form>
          <div className={`mt-7 grid gap-px bg-black/12 ${copy.register ? 'sm:grid-cols-2' : ''}`}><div className="bg-white p-5"><Building2 className="size-5 text-[#8a6107]" /><strong className="mt-4 block text-sm uppercase tracking-[0.08em]">{copy.info.title}</strong><p className="mt-2 text-xs leading-relaxed text-[#666]">{copy.info.text}</p></div>{copy.register ? <Link href={copy.register.href} className="group bg-white p-5 transition hover:bg-[#fff8e8]"><UserPlus className="size-5 text-[#8a6107]" /><strong className="mt-4 block text-sm uppercase tracking-[0.08em]">{copy.register.title}</strong><p className="mt-2 text-xs leading-relaxed text-[#666]">{copy.register.text}</p></Link> : null}</div><p className="mt-5 text-center text-xs text-[#666]">Não é a sua área? <Link href="/entrar" className="font-bold text-[#8a6107] underline hover:text-black">Escolher outra área de acesso</Link></p>
        </div></div>
      </section>
    </main>
  );
}
