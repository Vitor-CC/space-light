import { NextResponse } from 'next/server';

import { deleteClientDocument, registerClientDocument } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { ACCEPTED_DOCUMENT_TYPES, ACCEPTED_PHOTO_TYPES, MAX_UPLOAD_BYTES, deleteStoredFile, uploadClientDocument } from '@/lib/blob-storage';

async function equipe() {
  const user = await getCurrentUser();
  return user && user.role === 'admin' && !user.must_reset ? user : null;
}

/** A equipe envia um documento avulso ao cliente (laudo etc.), opcionalmente respondendo a um pedido dele. */
export async function POST(request: Request) {
  const user = await equipe();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const form = await request.formData();
  const clientId = String(form.get('clientId') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const requestId = String(form.get('requestId') ?? '') || null;
  const file = form.get('file');
  if (!clientId || !title) return NextResponse.json({ error: 'Informe o cliente e o título do documento.' }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Escolha o arquivo.' }, { status: 400 });
  const contentType = file.type || 'application/octet-stream';
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Arquivo acima do limite de envio.' }, { status: 400 });
  if (![...ACCEPTED_DOCUMENT_TYPES, ...ACCEPTED_PHOTO_TYPES].includes(contentType)) return NextResponse.json({ error: 'Tipo de arquivo não aceito. Envie PDF, documento do Office ou imagem.' }, { status: 400 });

  const id = `cdoc-${crypto.randomUUID()}`;
  try {
    const { objectKey } = await uploadClientDocument({ clientId, documentId: id, name: file.name, contentType, body: await file.arrayBuffer() });
    try {
      await registerClientDocument({ id, clientId, requestId, title, name: file.name, objectKey, contentType, size: file.size, byUserId: user.id });
    } catch (error) {
      // Sem a linha, o arquivo no disco ficaria órfão: apaga.
      await deleteStoredFile(objectKey).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao enviar o documento.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await equipe();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { documentId } = (await request.json().catch(() => ({}))) as { documentId?: string };
  if (!documentId) return NextResponse.json({ error: 'Documento não informado.' }, { status: 400 });
  try {
    const { objectKey } = await deleteClientDocument({ documentId, byUserId: user.id });
    await deleteStoredFile(objectKey).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao excluir o documento.' }, { status: 400 });
  }
}
