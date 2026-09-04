import type { AuditEntry, CompanyDashboardData, CompanyEmployee, CompanyTraining } from '@/lib/company-types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
}

export function readMockCompanyDatabase() {
  return requestJson<CompanyDashboardData>('/api/company/dashboard', { cache: 'no-store' });
}

export function createMockClient(input: { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string }) {
  return requestJson<{ id: string; email: string; temporaryPassword: string }>('/api/company/clients', { method: 'POST', body: JSON.stringify(input) });
}

export function approveClient(clientId: string) {
  return requestJson<{ ok: true }>(`/api/company/clients/${encodeURIComponent(clientId)}/approve`, { method: 'POST' });
}

export function createInstructor(input: { name: string; document: string; email: string; phone: string; professionalRegistry: string; specialties: string; baseCity: string }) {
  return requestJson<{ instructorId: string; email: string; temporaryPassword: string }>('/api/company/instructors', { method: 'POST', body: JSON.stringify(input) });
}

export function approveInstructor(instructorId: string) {
  return requestJson<{ ok: true }>(`/api/company/instructors/${encodeURIComponent(instructorId)}/approve`, { method: 'POST' });
}

export function createMockTraining(input: { clientId: string; instructorId: string; nr: string; title: string; dates: string[]; contentProgram: string; duration: string; location: string; participantLimit: number }) {
  return requestJson<{ id: string; code: string; qrToken: string }>('/api/company/trainings', { method: 'POST', body: JSON.stringify(input) });
}

/**
 * Envia um arquivo por requisição de propósito: uma função da Vercel aceita
 * no máximo 4,5 MB por requisição, então um lote inteiro de uma vez estouraria.
 */
export async function uploadCompanyFiles(input: {
  clientId: string;
  trainingId: string;
  kind: 'photo' | 'document';
  files: File[];
  onProgress?: (done: number, total: number, name: string) => void;
}) {
  const saved: string[] = [];
  const rejected: string[] = [];
  for (const [index, file] of input.files.entries()) {
    input.onProgress?.(index, input.files.length, file.name);
    const body = new FormData();
    body.append('clientId', input.clientId);
    body.append('trainingId', input.trainingId);
    body.append('kind', input.kind);
    body.append('files', file);
    try {
      const response = await fetch('/api/company/files', { method: 'POST', body });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; saved?: number };
      if (!response.ok || !payload.saved) throw new Error(payload.error || 'falhou');
      saved.push(file.name);
    } catch {
      rejected.push(file.name);
    }
  }
  input.onProgress?.(input.files.length, input.files.length, '');
  return { saved: saved.length, rejected };
}

export function deleteCompanyFile(fileId: string) {
  return requestJson<{ ok: true }>('/api/company/files', { method: 'DELETE', body: JSON.stringify({ fileId }) });
}

export function findMockTrainingByToken(token: string) {
  return requestJson<{ training: CompanyTraining | null }>(`/api/public/trainings/${encodeURIComponent(token)}`, { cache: 'no-store' }).then((result) => result.training);
}

export function registerMockParticipant(token: string, input: { fullName: string; documentId: string; rg: string; birthDate: string; email: string; phone: string; jobTitle: string }) {
  return requestJson<{ id: string; training: CompanyTraining }>(`/api/public/trainings/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify(input) });
}

// --- Equipe Space Light (funcionários) e auditoria ---

export function readEmployees() {
  return requestJson<{ employees: CompanyEmployee[] }>('/api/company/employees', { cache: 'no-store' }).then((result) => result.employees);
}

export function createEmployee(input: { name: string; email: string }) {
  return requestJson<{ userId: string; email: string; temporaryPassword: string }>('/api/company/employees', { method: 'POST', body: JSON.stringify(input) });
}

export function setEmployeeActive(userId: string, active: boolean) {
  return requestJson<{ ok: true }>(`/api/company/employees/${encodeURIComponent(userId)}/status`, { method: 'POST', body: JSON.stringify({ active }) });
}

export function readAuditLogs() {
  return requestJson<{ entries: AuditEntry[] }>('/api/company/audit', { cache: 'no-store' }).then((result) => result.entries);
}

// --- Exclusões ---

export function deleteClient(clientId: string) {
  return requestJson<{ ok: true }>('/api/company/clients', { method: 'DELETE', body: JSON.stringify({ clientId }) });
}

export function deleteInstructor(instructorId: string) {
  return requestJson<{ ok: true }>('/api/company/instructors', { method: 'DELETE', body: JSON.stringify({ instructorId }) });
}

export function deleteTraining(trainingId: string) {
  return requestJson<{ ok: true }>('/api/company/trainings', { method: 'DELETE', body: JSON.stringify({ trainingId }) });
}

export function deleteEmployee(userId: string) {
  return requestJson<{ ok: true }>('/api/company/employees', { method: 'DELETE', body: JSON.stringify({ userId }) });
}

// --- Redefinição de senha pelo painel ---

export function resetUserPassword(target: { userId?: string; clientId?: string; instructorId?: string }) {
  return requestJson<{ userId: string; name: string; email: string; active: boolean; temporaryPassword: string }>('/api/company/users/reset-password', { method: 'POST', body: JSON.stringify(target) });
}

// --- Documentos obrigatórios do instrutor ---

export function readInstructorDocuments() {
  return requestJson<{ documents: Array<{ id: string; instructorId: string; category: string; name: string; status: string; size: number; createdAt: string }> }>('/api/company/instructor-documents', { cache: 'no-store' }).then((result) => result.documents);
}

export function reviewInstructorDocument(documentId: string, status: 'approved' | 'rejected') {
  return requestJson<{ ok: true; activated: boolean }>('/api/company/instructor-documents', { method: 'POST', body: JSON.stringify({ documentId, status }) });
}

export function generateCertificates(trainingId: string) {
  return requestJson<{ ok: true; fileId: string }>('/api/company/certificates', { method: 'POST', body: JSON.stringify({ trainingId }) });
}
