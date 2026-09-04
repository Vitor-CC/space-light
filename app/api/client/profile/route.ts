import { NextResponse } from 'next/server';

import { updateClientProfile } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'client' || !user.client_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json()) as {
    unit?: string;
    contactName?: string;
    contactPhone?: string;
  };
  try {
    await updateClientProfile({
      clientId: user.client_id,
      userId: user.id,
      unit: input.unit ?? '',
      contactName: input.contactName ?? '',
      contactPhone: input.contactPhone ?? '',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar os dados.' },
      { status: 400 },
    );
  }
}
