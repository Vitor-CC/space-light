import { NextResponse } from 'next/server';

import { isOwnerByEmailOrFlag, resetUserPasswordByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso restrito à equipe Space Light.' }, { status: 403 });
  }
  const input = (await request.json()) as {
    userId?: string;
    clientId?: string;
    instructorId?: string;
  };
  if (!input.userId && !input.clientId && !input.instructorId) {
    return NextResponse.json({ error: 'Informe de quem é a senha a redefinir.' }, { status: 400 });
  }
  try {
    const temporaryPassword = generateTemporaryPassword();
    const credentials = await hashPassword(temporaryPassword);
    const target = await resetUserPasswordByAdmin({
      userId: input.userId,
      clientId: input.clientId,
      instructorId: input.instructorId,
      byUserId: user.id,
      actorIsOwner: isOwnerByEmailOrFlag(user.email, user.is_owner),
      ...credentials,
    });
    return NextResponse.json({ ...target, temporaryPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao redefinir a senha.' },
      { status: 400 },
    );
  }
}
