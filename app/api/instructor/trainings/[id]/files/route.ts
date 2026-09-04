import { NextResponse } from 'next/server';

import {
  findTrainingForInstructor,
  listTrainingFiles,
  newFileId,
  registerStoredFile,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_PHOTO_TYPES,
  MAX_UPLOAD_BYTES,
  isStorageConfigured,
  uploadTrainingFile,
} from '@/lib/blob-storage';

async function requireOwnTraining(trainingId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) {
    return { error: 'Acesso restrito ao instrutor da turma.', status: 403 } as const;
  }
  const training = await findTrainingForInstructor({
    trainingId,
    instructorId: user.instructor_id,
  });
  if (!training) {
    return { error: 'Este treinamento não está atribuído a você.', status: 404 } as const;
  }
  return { user, training } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireOwnTraining(id);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  // O instrutor só enxerga as fotos que ele mesmo usa para comprovar a lista.
  // Documento do cliente é assunto da Space Light, não dele.
  const files = (await listTrainingFiles(id)).filter((file) => file.kind === 'photo');
  return NextResponse.json({
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      kind: file.kind,
      size: file.size,
      contentType: file.content_type,
      createdAt: file.created_at,
      stored: file.status === 'stored',
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireOwnTraining(id);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'O armazenamento de arquivos ainda não foi configurado nesta instalação.' },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  const kind = String(form.get('kind') ?? 'photo') === 'document' ? 'document' : 'photo';
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: kind === 'photo' ? 'Escolha a foto da lista assinada.' : 'Escolha o documento.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. O limite é de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.` },
      { status: 400 },
    );
  }
  const contentType = file.type || 'application/octet-stream';
  const accepted = kind === 'photo' ? ACCEPTED_PHOTO_TYPES : ACCEPTED_DOCUMENT_TYPES;
  if (!accepted.includes(contentType)) {
    return NextResponse.json(
      {
        error: kind === 'photo'
          ? 'Envie uma imagem: JPG, PNG, WEBP ou HEIC.'
          : 'Envie um documento: PDF, Word, Excel, CSV ou TXT.',
      },
      { status: 400 },
    );
  }

  try {
    const fileId = newFileId();
    const { objectKey } = await uploadTrainingFile({
      clientId: context.training.client_id,
      trainingId: id,
      fileId,
      name: file.name || (kind === 'photo' ? 'lista-assinada' : 'documento'),
      contentType,
      body: await file.arrayBuffer(),
    });
    await registerStoredFile({
      fileId,
      clientId: context.training.client_id,
      trainingId: id,
      name: file.name || (kind === 'photo' ? 'lista-assinada' : 'documento'),
      objectKey,
      contentType,
      size: file.size,
      kind,
      createdByUserId: context.user.id,
    });
    return NextResponse.json({ id: fileId, name: file.name, size: file.size }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar o arquivo.' },
      { status: 500 },
    );
  }
}
