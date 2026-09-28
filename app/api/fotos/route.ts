import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { setPhotoKey, type StoredUser } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { deleteStoredFile, uploadProfilePhoto } from '@/lib/blob-storage';
import type { TipoDeFoto } from '@/lib/fotos';

const TIPOS: TipoDeFoto[] = ['instrutor', 'equipe', 'cliente'];
const LIMITE = 10 * 1024 * 1024;

/**
 * Quem troca qual foto: a equipe troca a de instrutor e o logo de cliente; cada
 * um troca a própria (funcionário, instrutor e o login da empresa).
 */
function pode(user: StoredUser, tipo: TipoDeFoto, id: string) {
  if (tipo === 'equipe') return user.role === 'admin' && user.id === id;
  if (tipo === 'instrutor') return user.role === 'admin' || (user.role === 'instructor' && user.instructor_id === id);
  return user.role === 'admin' || (user.role === 'client' && user.client_id === id);
}

async function usuarioQuePode(tipo: string, id: string) {
  const user = await getCurrentUser();
  if (!user || user.must_reset) return null;
  if (!TIPOS.includes(tipo as TipoDeFoto) || !id || !pode(user, tipo as TipoDeFoto, id)) return null;
  return user;
}

/** Envia ou troca a foto. Sai quadrada, 256 px, em WebP; o logo é encaixado inteiro num fundo branco. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const texto = (campo: string) => { const valor = form?.get(campo); return typeof valor === 'string' ? valor : ''; };
  const tipo = texto('tipo');
  const id = texto('id');
  const arquivo = form?.get('file');
  const user = await usuarioQuePode(tipo, id);
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  if (!(arquivo instanceof File) || arquivo.size === 0) return NextResponse.json({ error: 'Escolha uma imagem.' }, { status: 400 });
  if (arquivo.size > LIMITE) return NextResponse.json({ error: 'Imagem muito grande. O limite é de 10 MB.' }, { status: 400 });

  let tratada: Buffer;
  try {
    const entrada = sharp(Buffer.from(await arquivo.arrayBuffer())).rotate();
    tratada = tipo === 'cliente'
      ? await entrada.resize(256, 256, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).webp({ quality: 85 }).toBuffer()
      : await entrada.resize(256, 256, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'Não deu para ler a imagem. Use JPG, PNG ou WebP.' }, { status: 400 });
  }

  const { objectKey } = await uploadProfilePhoto({ tipo, id, body: tratada.buffer.slice(tratada.byteOffset, tratada.byteOffset + tratada.byteLength) as ArrayBuffer });
  try {
    const { anterior } = await setPhotoKey({ tipo: tipo as TipoDeFoto, id, chave: objectKey, byUserId: user.id });
    if (anterior) await deleteStoredFile(anterior).catch(() => undefined);
    return NextResponse.json({ ok: true, chave: objectKey });
  } catch (error) {
    await deleteStoredFile(objectKey).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar a foto.' }, { status: 400 });
  }
}

/** Remove a foto: o avatar volta a mostrar as iniciais. */
export async function DELETE(request: Request) {
  const { tipo, id } = (await request.json().catch(() => ({}))) as { tipo?: string; id?: string };
  const user = await usuarioQuePode(tipo ?? '', id ?? '');
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const { anterior } = await setPhotoKey({ tipo: tipo as TipoDeFoto, id: id as string, chave: '', byUserId: user.id });
    if (anterior) await deleteStoredFile(anterior).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao remover a foto.' }, { status: 400 });
  }
}
