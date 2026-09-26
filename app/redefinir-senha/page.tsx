import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { MolduraAcesso, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';
import { findValidResetToken } from '@/db/company-repository';
import { hashResetToken } from '@/lib/password-auth';
import { AJUDA_SENHA, AVISO_SENHA } from '@/lib/regras-senha';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Criar nova senha | Space Light Engenharia',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  if (!token) redirect('/esqueci-senha?status=expired');

  const valid = await findValidResetToken(await hashResetToken(token));
  if (!valid) redirect('/esqueci-senha?status=expired');

  const firstName = valid.name.trim().split(/\s+/)[0];

  return <MolduraAcesso sobretitulo="Recuperação de acesso">
    <div className="flex flex-col gap-6">
      <TituloAcesso titulo="Crie sua nova senha" texto={<>{firstName ? `Olá, ${firstName}. ` : ''}A senha nova vale para <strong className="font-semibold text-ds-texto">{valid.email}</strong> e substitui a anterior na hora.</>} />
      {status === 'invalid' ? <Faixa tom="perigo">{AVISO_SENHA}</Faixa> : null}
      <form action="/api/auth/reset-password" method="post" className="flex flex-col gap-6">
        <input type="hidden" name="token" value={token} />
        <Campo rotulo="Nova senha" ajuda={AJUDA_SENHA}><input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <Campo rotulo="Repita a nova senha"><input name="passwordConfirmation" type="password" minLength={8} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <button type="submit" className={botaoClasses('primario', 'L', 'w-full')}>Salvar nova senha</button>
      </form>
      <p className="ds-caption text-ds-texto-2">Este link só funciona uma vez e expira 60 minutos depois do pedido.</p>
    </div>
  </MolduraAcesso>;
}
