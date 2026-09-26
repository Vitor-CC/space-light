import { MolduraAcesso, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';
import { requireUser } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

export default async function DefinePasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser('/entrar');
  const { status } = await searchParams;
  return <MolduraAcesso sobretitulo="Primeiro acesso">
    <div className="flex flex-col gap-6">
      <TituloAcesso titulo="Crie sua senha" texto={`Olá, ${user.name.split(' ')[0]}. Para proteger sua conta, troque a senha temporária antes de continuar.`} />
      {status ? <Faixa tom="perigo">Use ao menos 10 caracteres e repita a mesma senha nos dois campos.</Faixa> : null}
      <form action="/api/auth/change-password" method="post" className="flex flex-col gap-6">
        <Campo rotulo="Nova senha" ajuda="Mínimo de 10 caracteres."><input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <Campo rotulo="Repita a nova senha"><input name="passwordConfirmation" type="password" minLength={10} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <button type="submit" className={botaoClasses('primario', 'L', 'w-full')}>Salvar e entrar</button>
      </form>
      <form action="/api/auth/logout" method="post"><button type="submit" className="ds-body-s text-ds-texto-2 hover:text-ds-texto hover:underline underline-offset-4">Sair sem trocar</button></form>
    </div>
  </MolduraAcesso>;
}
