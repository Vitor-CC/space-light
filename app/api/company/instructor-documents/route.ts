import { NextResponse } from 'next/server';

import {
  listAllInstructorDocuments,
  setInstructorDocumentStatus,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) return null;
  return user;
}

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const documents = await listAllInstructorDocuments();
  return NextResponse.json({
    documents: documents.map((item) => ({
      id: item.id,
      instructorId: item.instructor_id,
      category: item.category,
      name: item.name,
      status: item.status,
      size: item.size,
      createdAt: item.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const input = (await request.json()) as { documentId?: string; status?: string };
  if (!input.documentId || (input.status !== 'approved' && input.status !== 'rejected')) {
    return NextResponse.json({ error: 'Informe o documento e a decisão.' }, { status: 400 });
  }
  try {
    const result = await setInstructorDocumentStatus({
      documentId: input.documentId,
      status: input.status,
      byUserId: user.id,
    });
    return NextResponse.json({ ok: true, activated: result.activated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao avaliar o documento.' },
      { status: 400 },
    );
  }
}
