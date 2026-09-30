import { NextResponse } from 'next/server';

import { updateInstructorEquipment } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/** Carro, celular e notebook. Vale também para cadastro ainda em análise. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const input = (await request.json().catch(() => ({}))) as { equipment?: unknown };
  try {
    const equipment = await updateInstructorEquipment({
      instructorId: user.instructor_id,
      userId: user.id,
      equipment: input.equipment,
    });
    return NextResponse.json({ ok: true, equipment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar os dados.' },
      { status: 400 },
    );
  }
}
