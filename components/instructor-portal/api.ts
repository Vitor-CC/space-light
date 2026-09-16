import type { CompanyParticipant } from '@/lib/company-types';
import type { InstructorDashboardData } from '@/lib/instructor-types';

/*
 * Chamadas do portal do instrutor, copiadas como estavam dentro do componente:
 * mesmas rotas, mesmos corpos, mesmo tratamento de erro.
 */

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
}

const turma = (id: string) =>
  `/api/instructor/trainings/${encodeURIComponent(id)}`;

export type ArquivoDaTurma = {
  id: string;
  name: string;
  kind: string;
  size: number;
  contentType: string;
  createdAt: string;
  stored: boolean;
};
export type MeuDocumento = {
  id: string;
  category: string;
  name: string;
  status: string;
  size: number;
  createdAt: string;
};
export type ResultadoDoEncerramento = {
  certificates?: number;
  trainingCompleted?: boolean;
  remainingDays?: number;
  certificatePublished?: boolean;
  certificateProblem?: string | null;
};
export type NovoParticipante = {
  fullName: string;
  documentId: string;
  rg: string;
  birthDate: string;
  jobTitle: string;
  email: string;
  phone: string;
};

export const lerPainel = () =>
  requestJson<InstructorDashboardData>('/api/instructor/dashboard');

export const iniciarTurma = (id: string) =>
  requestJson(`${turma(id)}/start`, { method: 'POST' });

export const encerrarDia = (id: string) =>
  requestJson<ResultadoDoEncerramento>(`${turma(id)}/complete`, {
    method: 'POST',
  });

export const lerParticipantes = (id: string) =>
  requestJson<{ participants: CompanyParticipant[] }>(
    `${turma(id)}/participants`,
  ).then((r) => r.participants);

export const incluirParticipante = (id: string, dados: NovoParticipante) =>
  requestJson(`${turma(id)}/participants`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });

export const removerParticipante = (id: string, participantId: string) =>
  requestJson(`${turma(id)}/participants`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });

export const lerArquivos = (id: string) =>
  requestJson<{ files: ArquivoDaTurma[] }>(`${turma(id)}/files`, {
    cache: 'no-store',
  }).then((r) => r.files);

/** Um arquivo por requisição: função da Vercel aceita no máximo 4,5 MB por vez. */
export async function enviarListaAssinada(id: string, arquivos: File[]) {
  let enviados = 0;
  const falhas: string[] = [];
  for (const file of arquivos) {
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${turma(id)}/files`, {
        method: 'POST',
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'falhou');
      enviados += 1;
    } catch (error) {
      falhas.push(
        `${file.name} (${error instanceof Error ? error.message : 'erro'})`,
      );
    }
  }
  return { enviados, falhas };
}

export const marcarDisponibilidade = (availableDate: string, note: string) =>
  requestJson('/api/instructor/availability', {
    method: 'POST',
    body: JSON.stringify({ availableDate, note }),
  });

export const removerDisponibilidade = (availabilityId: string) =>
  requestJson('/api/instructor/availability', {
    method: 'DELETE',
    body: JSON.stringify({ availabilityId }),
  });

export const salvarCadastro = (dados: {
  name: string;
  phone: string;
  professionalRegistry: string;
  baseCity: string;
  specialties: string;
}) =>
  requestJson('/api/instructor/profile', {
    method: 'POST',
    body: JSON.stringify(dados),
  });

export const lerDocumentos = () =>
  requestJson<{ documents: MeuDocumento[] }>('/api/instructor/documents', {
    cache: 'no-store',
  }).then((r) => r.documents);

export async function enviarDocumento(category: string, file: File) {
  const body = new FormData();
  body.append('category', category);
  body.append('file', file);
  const response = await fetch('/api/instructor/documents', {
    method: 'POST',
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok)
    throw new Error(payload.error || 'Não foi possível enviar.');
}
