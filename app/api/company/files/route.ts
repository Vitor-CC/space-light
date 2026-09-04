import { NextResponse } from 'next/server';

import {
  deleteFileRow,
  findFileById,
  findTrainingForClient,
  newFileId,
  registerStoredFile,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_PHOTO_TYPES,
  MAX_UPLOAD_BYTES,
  deleteStoredFile,
  isStorageConfigured,
  uploadTrainingFile,
} from '@/lib/blob-storage';

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const form = await request.formData();
  const clientId = String(form.get('clientId') ?? '');
  const trainingId = String(form.get('trainingId') ?? '');
  const kind = String(form.get('kind') ?? '') === 'photo' ? 'photo' : 'document';
  const uploads = form.getAll('files').filter((item): item is File => item instanceof File);

  if (!clientId || !trainingId) {
    return NextResponse.json({ error: 'Escolha o cliente e o treinamento.' }, { status: 400 });
  }
  if (uploads.length === 0) {
    return NextResponse.json({ error: 'Escolha ao menos um arquivo.' }, { status: 400 });
  }

  const training = await findTrainingForClient({ clientId, trainingId });
  if (!training) {
    return NextResponse.json({ error: 'Treinamento não pertence a este cliente.' }, { status: 400 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'O armazenamento de arquivos ainda não foi configurado nesta instalação.' },
      { status: 503 },
    );
  }

  const accepted = kind === 'photo' ? ACCEPTED_PHOTO_TYPES : ACCEPTED_DOCUMENT_TYPES;
  const saved: string[] = [];
  const rejected: string[] = [];

  for (const file of uploads) {
    const contentType = file.type || 'application/octet-stream';
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES || !accepted.includes(contentType)) {
      rejected.push(file.name);
      continue;
    }
    try {
      const fileId = newFileId();
      const { objectKey } = await uploadTrainingFile({
        clientId,
        trainingId,
        fileId,
        name: file.name,
        contentType,
        body: await file.arrayBuffer(),
      });
      await registerStoredFile({
        fileId,
        clientId,
        trainingId,
        name: file.name,
        objectKey,
        contentType,
        size: file.size,
        kind,
        createdByUserId: user.id,
      });
      saved.push(file.name);
    } catch {
      rejected.push(file.name);
    }
  }

  return NextResponse.json({ saved: saved.length, rejected }, { status: saved.length ? 201 : 400 });
}

export async function DELETE(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { fileId } = (await request.json()) as { fileId?: string };
  if (!fileId) return NextResponse.json({ error: 'Arquivo não informado.' }, { status: 400 });

  const file = await findFileById(fileId);
  if (!file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  if (file.status === 'stored') {
    // Se o Blob falhar, a linha fica: melhor um órfão do que um link quebrado.
    try {
      await deleteStoredFile(file.object_key);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erro ao apagar o arquivo.' },
        { status: 500 },
      );
    }
  }
  await deleteFileRow({ fileId, byUserId: user.id });
  return NextResponse.json({ ok: true });
}
