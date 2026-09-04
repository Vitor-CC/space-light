import { NextResponse } from 'next/server';

import { updateClientAddress } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** A equipe Space preenche o endereço da edificação de qualquer cliente. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json()) as {
    clientId?: string;
    address?: string;
    district?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  if (!input.clientId) {
    return NextResponse.json({ error: 'Cliente não informado.' }, { status: 400 });
  }
  try {
    await updateClientAddress({
      clientId: input.clientId,
      byUserId: user.id,
      address: {
        address: input.address ?? '',
        district: input.district ?? '',
        city: input.city ?? '',
        state: input.state ?? '',
        postalCode: input.postalCode ?? '',
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar o endereço.' },
      { status: 400 },
    );
  }
}
