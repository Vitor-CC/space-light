import { NextResponse } from 'next/server';

import { updateUserPassword } from '@/db/company-repository';
import { getCurrentUser, portalPathForRole } from '@/lib/app-auth';
import { hashPassword, verifyPassword } from '@/lib/password-auth';
import { redirectInterno } from '@/lib/safe-redirect';

/**
 * Dois fluxos na mesma rota:
 * - `/definir-senha` (senha temporária): só a senha nova, como sempre foi.
 * - Troca dentro do portal (`voltarPara`): exige a senha atual, porque quem
 *   está com a sessão aberta num computador emprestado não pode trocar a senha
 *   de outra pessoa. O resultado volta para a tela de origem.
 */
const PORTAIS_COM_TROCA = ['/cliente'];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/entrar', request.url), 303);
  }
  const form = await request.formData();
  const campo = (nome: string) => {
    const valor = form.get(nome);
    return typeof valor === 'string' ? valor : '';
  };
  const password = campo('password');
  const confirmation = campo('passwordConfirmation');
  const voltarPara = campo('voltarPara');
  const noPortal = PORTAIS_COM_TROCA.includes(voltarPara);

  if (noPortal) {
    const atual = campo('currentPassword');
    if (
      !(await verifyPassword(atual, user.password_hash, user.password_salt))
    ) {
      return redirectInterno(request, `${voltarPara}?senha=atual-incorreta`);
    }
    if (password.length < 10 || password !== confirmation) {
      return redirectInterno(request, `${voltarPara}?senha=invalida`);
    }
  } else if (password.length < 10 || password !== confirmation) {
    return NextResponse.redirect(
      new URL('/definir-senha?status=invalid', request.url),
      303,
    );
  }

  const credentials = await hashPassword(password);
  await updateUserPassword({ userId: user.id, ...credentials });
  if (noPortal) return redirectInterno(request, `${voltarPara}?senha=alterada`);
  return NextResponse.redirect(
    new URL(portalPathForRole(user.role), request.url),
    303,
  );
}
