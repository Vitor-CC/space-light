import { NextResponse } from 'next/server';
import { createClientByAdmin, deleteClientByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = await request.json() as { name?: string; legalName?: string; document?: string; unit?: string; contactName?: string; contactEmail?: string; contactPhone?: string };
  if (!input.name || !input.legalName || !input.document || !input.unit || !input.contactName || !input.contactEmail) return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  try {
    const temporaryPassword = generateTemporaryPassword();
    const credentials = await hashPassword(temporaryPassword);
    const result = await createClientByAdmin({ name: input.name, legalName: input.legalName, document: input.document, unit: input.unit, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone ?? '', createdByUserId: user.id, ...credentials });
    return NextResponse.json({ ...result, temporaryPassword }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Já existe um cliente com este CNPJ ou e-mail.' }, { status: 409 });
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
