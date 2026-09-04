import { NextResponse } from 'next/server';

import { findInstructorDocumentForUser } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { readStoredFile } from '@/lib/blob-storage';

/** Documento pessoal do instrutor: só ele e a equipe Space Light abrem. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const document = await findInstructorDocumentForUser({ documentId: id, user });
  if (!document) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }
  try {
    const stored = await readStoredFile(document.object_key);
    if (!stored) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    const download = new URL(request.url).searchParams.get('download') === '1';
    return new Response(stored.stream, {
      headers: {
        'Content-Type': document.content_type,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao ler o documento.' },
      { status: 500 },
    );
  }
}
