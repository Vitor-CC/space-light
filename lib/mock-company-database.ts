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

export function createMockTraining(input: { clientId: string; instructorId: string; nr: string; title: string; trainingDate: string; duration: string; location: string; participantLimit: number }) {
  return requestJson<{ id: string; code: string; qrToken: string }>('/api/company/trainings', { method: 'POST', body: JSON.stringify(input) });
}

export function publishMockFiles(clientId: string, trainingId: string, selectedFiles: File[]) {
  return requestJson<{ count: number }>('/api/company/files', { method: 'POST', body: JSON.stringify({ clientId, trainingId, files: selectedFiles.map((file) => ({ name: file.name, contentType: file.type, size: file.size })) }) });
}

export function findMockTrainingByToken(token: string) {
  return requestJson<{ training: CompanyTraining | null }>(`/api/public/trainings/${encodeURIComponent(token)}`, { cache: 'no-store' }).then((result) => result.training);
}

export function registerMockParticipant(token: string, input: { fullName: string; documentId: string; email: string; phone: string; jobTitle: string }) {
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
