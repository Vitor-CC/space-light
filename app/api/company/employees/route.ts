import { NextResponse } from 'next/server';

import {
  createEmployeeByOwner,
  deleteEmployeeByOwner,
  isOwnerByEmailOrFlag,
  listEmployees,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password-auth';

async function requireOwner() {
  const user = await getCurrentUser();
  if (
    !user ||
    user.role !== 'admin' ||
    user.must_reset ||
    !isOwnerByEmailOrFlag(user.email, user.is_owner)
  ) {
    return null;
  }
  return user;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: 'Acesso restrito ao dono da conta.' }, { status: 403 });
  }
  return NextResponse.json({ employees: await listEmployees() });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: 'Acesso restrito ao dono da conta.' }, { status: 403 });
  }
  const input = (await request.json()) as { name?: string; email?: string };
  if (!input.name?.trim() || !input.email?.trim()) {
    return NextResponse.json({ error: 'Informe o nome e o e-mail do funcionário.' }, { status: 400 });
  }
  try {
    const temporaryPassword = generateTemporaryPassword();
    const credentials = await hashPassword(temporaryPassword);
    const result = await createEmployeeByOwner({
      name: input.name,
      email: input.email,
      createdByUserId: owner.id,
      ...credentials,
    });
    return NextResponse.json({ ...result, temporaryPassword }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar o funcionário.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: 'Acesso restrito ao dono da conta.' }, { status: 403 });
  }
  const { userId } = (await request.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: 'Funcionário não informado.' }, { status: 400 });
  try {
    await deleteEmployeeByOwner({ userId, byUserId: owner.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao excluir funcionário.' }, { status: 400 });
  }
}
