import { NextResponse } from 'next/server';
import { createClientByAdmin, deleteClientByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password-auth';
import { USUARIO_REGRA, usuarioValido } from '@/lib/usuario';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = await request.json() as { name?: string; legalName?: string; document?: string; unit?: string; contactName?: string; contactEmail?: string; contactPhone?: string; username?: string };
  if (!input.name || !input.legalName || !input.document || !input.unit || !input.contactName || !input.contactEmail || !input.username) return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  if (!usuarioValido(input.username)) return NextResponse.json({ error: `Nome de usuário inválido. ${USUARIO_REGRA}` }, { status: 400 });
  try {
    const temporaryPassword = generateTemporaryPassword();
    const credentials = await hashPassword(temporaryPassword);
    const result = await createClientByAdmin({ name: input.name, legalName: input.legalName, document: input.document, unit: input.unit, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone ?? '', username: input.username, createdByUserId: user.id, ...credentials });
    return NextResponse.json({ ...result, temporaryPassword }, { status: 201 });
  } catch (error) {
    // O nome de usuário é conferido antes de gravar; o resto é o índice único de CNPJ/e-mail.
    const mensagem = error instanceof Error && error.message.startsWith('Este nome de usuário')
      ? error.message
      : 'Já existe um cliente com este CNPJ ou e-mail.';
    return NextResponse.json({ error: mensagem }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { clientId } = (await request.json()) as { clientId?: string };
  if (!clientId) return NextResponse.json({ error: 'Cliente não informado.' }, { status: 400 });
  try {
    await deleteClientByAdmin({ clientId, byUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao excluir cliente.' }, { status: 400 });
  }
}
