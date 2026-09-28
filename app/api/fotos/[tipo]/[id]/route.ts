import { NextResponse } from 'next/server';

import { getPhotoKey } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { readStoredFile } from '@/lib/blob-storage';
import type { TipoDeFoto } from '@/lib/fotos';

/**
 * Mostra a foto a qualquer pessoa logada no portal. O endereço muda a cada
 * troca (?v=), então o navegador pode guardar a imagem por muito tempo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  if (!(await getCurrentUser())) return new NextResponse(null, { status: 401 });
  const { tipo, id } = await params;
  const chave = await getPhotoKey(tipo as TipoDeFoto, id);
  if (!chave) return new NextResponse(null, { status: 404 });
  const arquivo = await readStoredFile(chave);
  if (!arquivo) return new NextResponse(null, { status: 404 });
  return new Response(arquivo.stream, {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(arquivo.size),
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
