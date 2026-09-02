import { NextResponse } from 'next/server';
import { registerFileMetadata } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = await request.json() as { clientId: string; trainingId: string; files: Array<{ name: string; contentType: string; size: number }> };
  try { return NextResponse.json(await registerFileMetadata({ ...input, createdByUserId: user.id }), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao registrar arquivos.' }, { status: 400 }); }
}
