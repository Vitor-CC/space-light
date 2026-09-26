import { MolduraAcesso, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';
import { requireUser } from '@/lib/app-auth';
import { AJUDA_SENHA, AVISO_SENHA } from '@/lib/regras-senha';

export const dynamic = 'force-dynamic';

export default async function DefinePasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser('/entrar');
  const { status } = await searchParams;
  return <MolduraAcesso sobretitulo="Primeiro acesso">
    <div className="flex flex-col gap-6">
      <TituloAcesso titulo="Crie sua senha" texto={`Olá, ${user.name.split(' ')[0]}. Para proteger sua conta, troque a senha temporária antes de continuar.`} />
      {status ? <Faixa tom="perigo">{AVISO_SENHA}</Faixa> : null}
      <form action="/api/auth/change-password" method="post" className="flex flex-col gap-6">
        <Campo rotulo="Nova senha" ajuda={AJUDA_SENHA}><input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <Campo rotulo="Repita a nova senha"><input name="passwordConfirmation" type="password" minLength={8} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <button type="submit" className={botaoClasses('primario', 'L', 'w-full')}>Salvar e entrar</button>
      </form>
      <form action="/api/auth/logout" method="post"><button type="submit" className="ds-body-s text-ds-texto-2 hover:text-ds-texto hover:underline underline-offset-4">Sair sem trocar</button></form>
    </div>
  </MolduraAcesso>;
}
