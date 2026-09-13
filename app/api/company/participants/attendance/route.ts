import { NextResponse } from 'next/server';

import { setAttendanceByAdmin } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

/**
 * A gestão marca ou desmarca a presença de um participante num dia, sem as
 * travas do check-in (para quem esteve na aula e não conseguiu escanear).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { participantId, sessionId, present } = (await request.json()) as {
    participantId?: string;
    sessionId?: string;
    present?: boolean;
  };
  if (!participantId || !sessionId || typeof present !== 'boolean') {
    return NextResponse.json({ error: 'Informe o participante, o dia e se está presente.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await setAttendanceByAdmin({ participantId, sessionId, present, byUserId: user.id }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao marcar a presença.' },
      { status: 400 },
    );
  }
}
