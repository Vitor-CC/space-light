import { NextResponse } from 'next/server';

import { findFileForUser } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { readStoredFile } from '@/lib/blob-storage';

/**
 * Entrega o arquivo guardado no Blob privado. A permissão é checada aqui:
 * o Blob nunca é exposto por URL direta, porque as fotos das listas têm
 * nome, CPF, RG e assinatura dos participantes.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const file = await findFileForUser({ fileId: id, user });
  if (!file) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  }
  if (file.status !== 'stored') {
    return NextResponse.json(
      { error: 'Só a ficha deste arquivo existe: o conteúdo não está no armazenamento.' },
      { status: 410 },
    );
  }

  try {
    const stored = await readStoredFile(file.object_key);
    if (!stored) {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }
    // ?download=1 força o "salvar como"; sem ele, abre no navegador.
    const download = new URL(request.url).searchParams.get('download') === '1';
    return new Response(stored.stream, {
      headers: {
        'Content-Type': file.content_type,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao ler o arquivo.' },
      { status: 500 },
    );
  }
}
