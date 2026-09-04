import type { Metadata } from 'next';
import { ArrowLeft, LifeBuoy, MessageCircle, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { isMailerConfigured } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Esqueci minha senha | Space Light Engenharia',
  description: 'Recupere o acesso ao portal da Space Light Engenharia.',
  robots: { index: false, follow: false },
};

const WHATSAPP = 'https://wa.me/5511941318646?text=Ol%C3%A1%2C%20esqueci%20a%20senha%20do%20Portal%20Space%20Light.%20Meu%20e-mail%20de%20acesso%20%C3%A9%3A%20';

const loginPaths: Record<string, string> = {
  instrutor: '/instrutor/login',
  empresa: '/empresa/login',
  cliente: '/cliente/login',
};

const notices: Record<string, { tone: 'ok' | 'warn'; text: string }> = {
  sent: {
    tone: 'ok',
    text: 'Se existir uma conta com esse e-mail, o link para criar uma nova senha acabou de ser enviado. Verifique também a caixa de spam — o link vale por 60 minutos.',
  },
  invalid: { tone: 'warn', text: 'Informe o e-mail que você usa para entrar no portal.' },
  expired: { tone: 'warn', text: 'Aquele link expirou ou já tinha sido usado. Peça um novo abaixo.' },
  unavailable: {
    tone: 'warn',
    text: 'O envio automático está indisponível no momento. Fale com a Space Light pelo WhatsApp que a equipe redefine sua senha.',
  },
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; status?: string }>;
}) {
  const { portal, status } = await searchParams;
  const loginPath = loginPaths[portal ?? ''] ?? '/cliente/login';
  const notice = status ? notices[status] : undefined;
  const selfService = isMailerConfigured();

  return <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 py-12 text-white">
    <section className="w-full max-w-xl border border-white/12 bg-[#171716] p-7 sm:p-10">
      <Link href="/" aria-label="Voltar ao site da Space Light" className="block w-fit"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-12 w-auto brightness-0 invert" /></Link>
      <div className="mt-9 flex size-13 items-center justify-center bg-[#f2ad19] text-black"><LifeBuoy className="size-6" /></div>
      <span className="eyebrow mt-7 block text-[#f2ad19]">Recuperação de acesso</span>
      <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[0.01em]">Esqueceu a senha?</h1>

      {notice ? <p role="status" className={`mt-6 border-l-4 p-4 text-sm leading-relaxed ${notice.tone === 'ok' ? 'border-[#f2ad19] bg-[#f2ad19]/12 text-white/85' : 'border-[#b62525] bg-[#b62525]/12 text-white/85'}`}>{notice.text}</p> : null}

      {selfService ? <>
        <p className="mt-5 text-sm leading-relaxed text-white/58">Informe o e-mail que você usa para entrar. Enviaremos um link para você criar uma senha nova.</p>
        <form action="/api/auth/forgot-password" method="post" className="mt-6 space-y-3">
          {portal ? <input type="hidden" name="portal" value={portal} /> : null}
          <label className="block">
            <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.12em] text-white/50">Seu e-mail de acesso</span>
            <input name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" className="h-14 w-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-[#f2ad19]" />
          </label>
          <button type="submit" className="h-14 w-full bg-[#f2ad19] text-xs font-extrabold uppercase tracking-[0.1em] text-black hover:bg-[#ff9900]">Enviar link de redefinição</button>
        </form>
        <p className="mt-4 text-[11px] leading-relaxed text-white/40">Por segurança, a mesma mensagem aparece exista ou não uma conta com esse e-mail.</p>

        <div className="mt-8 border-t border-white/10 pt-7">
          <span className="eyebrow block text-white/40">Se preferir falar com alguém</span>
          <div className="mt-4 space-y-3">
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-4 border border-white/18 px-5 text-sm font-bold transition hover:bg-white hover:text-black"><MessageCircle className="size-5 shrink-0 text-[#f2ad19]" />Falar no WhatsApp</a>
            <a href="tel:+5511941318646" className="flex min-h-14 items-center gap-4 border border-white/18 px-5 text-sm font-bold transition hover:bg-white hover:text-black"><Phone className="size-4 shrink-0 text-[#f2ad19]" />+55 11 94131-8646</a>
          </div>
        </div>
      </> : <>
        <p className="mt-5 text-sm leading-relaxed text-white/58">Fale com a equipe da Space Light: ela gera uma senha temporária na hora, e você cria a sua no primeiro acesso.</p>
        <div className="mt-7 space-y-3">
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-4 bg-[#f2ad19] px-6 text-black transition hover:bg-[#ff9900]"><MessageCircle className="size-6 shrink-0" /><span><span className="eyebrow block">Atendimento direto</span><strong className="mt-1 block text-base font-extrabold uppercase tracking-[0.06em]">Falar no WhatsApp</strong></span></a>
          <a href="tel:+5511941318646" className="flex min-h-14 items-center gap-4 border border-white/18 px-6 text-sm font-bold transition hover:bg-white hover:text-black"><Phone className="size-4 shrink-0 text-[#f2ad19]" />+55 11 94131-8646</a>
        </div>
      </>}

      <p className="mt-7 border-l-4 border-white/20 pl-4 text-xs leading-relaxed text-white/48">É da equipe da Space Light? O dono da conta também pode redefinir seu acesso pela aba <strong className="font-bold text-white/70">Funcionários</strong> da Área da Empresa.</p>

      <Link href={loginPath} className="mt-7 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-white/50 transition hover:text-[#f2ad19]"><ArrowLeft className="size-3.5" />Voltar para o login</Link>
    </section>
  </main>;
}
