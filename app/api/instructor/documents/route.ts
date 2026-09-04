import { NextResponse } from 'next/server';

import {
  listInstructorDocuments,
  replaceInstructorDocument,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_PHOTO_TYPES,
  MAX_UPLOAD_BYTES,
  deleteStoredFile,
  isStorageConfigured,
  uploadInstructorFile,
} from '@/lib/blob-storage';
import { INSTRUCTOR_DOCUMENT_CATEGORIES } from '@/lib/instructor-documents';

/** O instrutor pendente também entra aqui: é o que ele precisa fazer para ser aprovado. */
async function requireInstructorUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) return null;
  return user;
}

export async function GET() {
  const user = await requireInstructorUser();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const documents = await listInstructorDocuments(user.instructor_id!);
  return NextResponse.json({
    documents: documents.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      status: item.status,
      size: item.size,
      createdAt: item.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireInstructorUser();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const form = await request.formData();
  const category = String(form.get('category') ?? '');
  const file = form.get('file');
  if (!INSTRUCTOR_DOCUMENT_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Documento desconhecido.' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Escolha o arquivo.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. O limite é de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.` },
      { status: 400 },
    );
  }
  const contentType = file.type || 'application/octet-stream';
  if (![...ACCEPTED_PHOTO_TYPES, ...ACCEPTED_DOCUMENT_TYPES].includes(contentType)) {
    return NextResponse.json({ error: 'Envie uma foto (JPG, PNG, WEBP, HEIC) ou um PDF.' }, { status: 400 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'O armazenamento de arquivos ainda não foi configurado nesta instalação.' },
      { status: 503 },
    );
  }

  try {
    const documentId = crypto.randomUUID();
    const { objectKey } = await uploadInstructorFile({
      instructorId: user.instructor_id!,
      documentId,
      category,
      name: file.name || category,
      contentType,
      body: await file.arrayBuffer(),
    });
    const { replaced } = await replaceInstructorDocument({
      instructorId: user.instructor_id!,
      category,
      name: file.name || category,
      objectKey,
      contentType,
      size: file.size,
      byUserId: user.id,
    });
    // Limpa o arquivo antigo só depois que o novo já está registrado.
    for (const oldKey of replaced) {
      if (oldKey === objectKey) continue;
      try { await deleteStoredFile(oldKey); } catch { /* órfão no Blob é melhor que perder o novo */ }
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar o documento.' },
      { status: 500 },
    );
  }
}
