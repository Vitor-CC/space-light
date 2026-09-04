import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { findValidResetToken } from '@/db/company-repository';
import { hashResetToken } from '@/lib/password-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Criar nova senha | Space Light Engenharia',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;
  if (!token) redirect('/esqueci-senha?status=expired');

  const valid = await findValidResetToken(await hashResetToken(token));
  if (!valid) redirect('/esqueci-senha?status=expired');

  const firstName = valid.name.trim().split(/\s+/)[0];

  return <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 py-12 text-white">
    <section className="w-full max-w-xl border border-white/12 bg-[#171716] p-7 sm:p-10">
      <Link href="/" aria-label="Voltar ao site da Space Light" className="block w-fit"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-12 w-auto brightness-0 invert" /></Link>
      <div className="mt-9 flex size-13 items-center justify-center bg-[#f2ad19] text-black"><KeyRound className="size-6" /></div>
      <span className="eyebrow mt-7 block text-[#f2ad19]">Recuperação de acesso</span>
      <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.035em]">Crie sua nova senha</h1>
      <p className="mt-5 text-sm leading-relaxed text-white/58">{firstName ? `Olá, ${firstName}. ` : ''}Escolha uma senha nova para <strong className="font-bold text-white/80">{valid.email}</strong>. Ela substitui a anterior imediatamente.</p>

      {status === 'invalid' ? <p role="alert" className="mt-5 border-l-4 border-[#b62525] bg-[#b62525]/12 p-4 text-sm leading-relaxed">Use ao menos 10 caracteres e repita a mesma senha nos dois campos.</p> : null}

      <form action="/api/auth/reset-password" method="post" className="mt-7 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder="Nova senha (mínimo de 10 caracteres)" className="h-14 w-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-[#f2ad19]" />
        <input name="passwordConfirmation" type="password" minLength={10} required autoComplete="new-password" placeholder="Repita a nova senha" className="h-14 w-full border border-white/15 bg-black/40 px-4 text-sm outline-none focus:border-[#f2ad19]" />
        <button type="submit" className="h-14 w-full bg-[#f2ad19] text-xs font-extrabold uppercase tracking-[0.1em] text-black hover:bg-[#ff9900]">Salvar nova senha</button>
      </form>

      <p className="mt-6 text-[11px] leading-relaxed text-white/40">Este link só funciona uma vez e expira em 60 minutos após o pedido.</p>
    </section>
  </main>;
}
