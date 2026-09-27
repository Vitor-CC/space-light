import { NextResponse } from 'next/server';

import { updateClientByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

type Corpo = Partial<Record<'name' | 'legalName' | 'document' | 'unit' | 'contactName' | 'contactEmail' | 'contactPhone' | 'shortCode', string>>;

/** A gestão edita qualquer dado cadastral da empresa. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const corpo = (await request.json()) as Corpo;
  try {
    return NextResponse.json(await updateClientByAdmin({
      clientId: id,
      byUserId: user.id,
      name: corpo.name ?? '',
      legalName: corpo.legalName ?? '',
      document: corpo.document ?? '',
      unit: corpo.unit ?? '',
      contactName: corpo.contactName ?? '',
      contactEmail: corpo.contactEmail ?? '',
      contactPhone: corpo.contactPhone ?? '',
      shortCode: corpo.shortCode,
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar os dados do cliente.' },
      { status: 400 },
    );
  }
}
