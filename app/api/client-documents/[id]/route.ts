import { NextResponse } from 'next/server';

import { findClientDocumentForUser } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { readStoredFile } from '@/lib/blob-storage';

/** Entrega o documento avulso: só a equipe e o próprio cliente. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.must_reset) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  const doc = await findClientDocumentForUser({ documentId: id, user });
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  const stored = await readStoredFile(doc.object_key);
  if (!stored) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  const download = new URL(request.url).searchParams.get('download') === '1';
  return new Response(stored.stream, {
    headers: {
      'Content-Type': doc.content_type,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
