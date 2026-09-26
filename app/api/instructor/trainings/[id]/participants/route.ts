import { NextResponse } from 'next/server';

import {
  addParticipantByInstructor,
  listInstructorTrainingParticipants,
  removeParticipantByInstructor,
} from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';

async function requireInstructor() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor' || !user.instructor_id || user.must_reset) return null;
  return user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireInstructor();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({
    participants: await listInstructorTrainingParticipants({
      instructorId: user.instructor_id!,
      trainingId: id,
    }),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireInstructor();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  const input = (await request.json()) as {
    fullName?: string; documentId?: string; rg?: string; birthDate?: string; email?: string; phone?: string; jobTitle?: string; employeeLogin?: string;
  };
  try {
    const result = await addParticipantByInstructor({
      instructorId: user.instructor_id!,
      trainingId: id,
      userId: user.id,
      participant: {
        fullName: input.fullName ?? '',
        documentId: input.documentId ?? '',
        rg: input.rg ?? '',
        birthDate: input.birthDate ?? '',
        email: input.email ?? '',
        phone: input.phone ?? '',
        jobTitle: input.jobTitle,
        employeeLogin: input.employeeLogin,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível adicionar o participante.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireInstructor();
  if (!user) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  const { id } = await params;
  const input = (await request.json()) as { participantId?: string };
  if (!input.participantId) {
    return NextResponse.json({ error: 'Participante não informado.' }, { status: 400 });
  }
  try {
    await removeParticipantByInstructor({
      instructorId: user.instructor_id!,
      trainingId: id,
      participantId: input.participantId,
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível remover o participante.' },
      { status: 400 },
    );
  }
}
