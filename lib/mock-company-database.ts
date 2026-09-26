import type { AuditEntry, CheckinResult, CompanyDashboardData, CompanyEmployee, CompanyTraining, TrainingSession } from '@/lib/company-types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new RequestError(payload.error || 'Não foi possível concluir a operação.', response.status);
  return payload;
}

/** Erro de API com o status HTTP, para a tela distinguir recusa (403) de falha. */
export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function readMockCompanyDatabase() {
  return requestJson<CompanyDashboardData>('/api/company/dashboard', { cache: 'no-store' });
}

export function createMockClient(input: { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string; username: string }) {
  return requestJson<{ id: string; email: string; username: string; temporaryPassword: string }>('/api/company/clients', { method: 'POST', body: JSON.stringify(input) });
}

/** Define ou troca o nome de usuário (login) de uma empresa. */
export function setClientUsername(clientId: string, username: string) {
  return requestJson<{ ok: true; username: string }>('/api/company/clients/username', { method: 'POST', body: JSON.stringify({ clientId, username }) });
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

export type NovoDia = { date: string; startTime: string; endTime: string; instructorId: string | null };

export function createMockTraining(input: { clientId: string; nr: string; title: string; internalLabel: string; theme: string; days: NovoDia[]; contentProgram: string; duration: string; location: string }) {
  return requestJson<{ id: string; code: string; qrToken: string }>('/api/company/trainings', { method: 'POST', body: JSON.stringify(input) });
}

/** Troca só a identificação interna da turma — o certificado não muda. */
export function renameTraining(trainingId: string, internalLabel: string) {
  return requestJson<{ ok: true }>(`/api/company/trainings/${encodeURIComponent(trainingId)}`, { method: 'PATCH', body: JSON.stringify({ internalLabel }) });
}

/** A Space escala o instrutor, a data ou o horário de um dia do treinamento. */
export function updateTrainingDay(trainingId: string, input: { sessionId: string; instructorId?: string | null; sessionDate?: string; startTime?: string; endTime?: string }) {
  return requestJson<{ ok: true; sessions: TrainingSession[] }>(`/api/company/trainings/${encodeURIComponent(trainingId)}/sessions`, { method: 'PATCH', body: JSON.stringify(input) });
}

/**
 * Encerra a turma pela Space, inteira ou só um dia (`sessionId`). Sem a foto
 * da lista, fechar o último dia volta com 409 e `needsConfirmation` — quem
 * insiste manda `semLista`.
 */
export async function completeTrainingByCompany(trainingId: string, semLista = false, sessionId?: string) {
  const response = await fetch(`/api/company/trainings/${encodeURIComponent(trainingId)}/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semLista, sessionId }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; needsConfirmation?: boolean; turmaConcluida?: boolean; certificates?: number; certificatePublished?: boolean; certificateProblem?: string | null };
  if (response.status === 409 && payload.needsConfirmation) return { needsConfirmation: true as const, message: payload.error ?? '' };
  if (!response.ok) throw new Error(payload.error || 'Não foi possível encerrar o treinamento.');
  return { needsConfirmation: false as const, ...payload };
}

/**
 * Envia um arquivo por requisição de propósito. Começou por causa do limite de
 * 4,5 MB da Vercel, que não existe mais, e ficou por dois motivos melhores: dá
 * para mostrar o progresso com nome de arquivo, e uma falha no meio derruba só
 * aquele envio em vez do lote inteiro.
 */
export async function uploadCompanyFiles(input: {
  clientId: string;
  trainingId: string;
  kind: 'photo' | 'document' | 'attendance';
  files: File[];
  /** Dia a que a lista assinada pertence; sem ele, o servidor usa o último. */
  sessionId?: string;
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
    if (input.sessionId) body.append('sessionId', input.sessionId);
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

export function registerMockParticipant(token: string, input: { fullName: string; documentId: string; rg: string; birthDate: string; email: string; phone: string; employeeLogin?: string }) {
  return requestJson<{ id: string; training: CompanyTraining; checkin: CheckinResult }>(`/api/public/trainings/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify(input) });
}

/** Check-in só com o CPF. `found: false` quando é o primeiro acesso do aluno na turma. */
export function checkinParticipant(token: string, documentId: string) {
  return requestJson<{ found: boolean; checkin: CheckinResult | null }>(`/api/public/trainings/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ checkinOnly: true, documentId }) });
}

// --- Equipe Space Light (funcionários) e auditoria ---

export function readEmployees() {
  return requestJson<{ employees: CompanyEmployee[] }>('/api/company/employees', { cache: 'no-store' }).then((result) => result.employees);
}

export function createEmployee(input: { name: string; email: string; jobTitle?: string }) {
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
  return requestJson<{ userId: string; name: string; email: string; username: string | null; active: boolean; temporaryPassword: string }>('/api/company/users/reset-password', { method: 'POST', body: JSON.stringify(target) });
}

// --- Documentos obrigatórios do instrutor ---

export function readInstructorDocuments() {
  return requestJson<{ documents: Array<{ id: string; instructorId: string; category: string; name: string; status: string; size: number; createdAt: string }> }>('/api/company/instructor-documents', { cache: 'no-store' }).then((result) => result.documents);
}

export function reviewInstructorDocument(documentId: string, status: 'approved' | 'rejected') {
  return requestJson<{ ok: true; activated: boolean }>('/api/company/instructor-documents', { method: 'POST', body: JSON.stringify({ documentId, status }) });
}

export type AvisoCertificado = 'enviado' | 'sem-email' | 'nao-configurado' | 'falhou' | null;

export function generateCertificates(trainingId: string, opcoes: { validityMonths?: number; notifyClient?: boolean } = {}) {
  return requestJson<{ ok: true; documents: { name: string; fileId: string }[]; aviso: AvisoCertificado }>('/api/company/certificates', { method: 'POST', body: JSON.stringify({ trainingId, ...opcoes }) });
}

export function saveTrainingValidity(trainingId: string, months: number) {
  return requestJson<{ ok: true }>(`/api/company/trainings/${encodeURIComponent(trainingId)}/validity`, { method: 'POST', body: JSON.stringify({ months }) });
}

export function setTrainingRequestStatus(requestId: string, status: 'open' | 'scheduled' | 'declined') {
  return requestJson<{ ok: true }>('/api/company/requests', { method: 'PATCH', body: JSON.stringify({ requestId, status }) });
}

export function saveEmployeeJobTitle(userId: string, jobTitle: string) {
  return requestJson<{ ok: true }>(`/api/company/employees/${encodeURIComponent(userId)}/job-title`, { method: 'POST', body: JSON.stringify({ jobTitle }) });
}

export function saveClientAddress(input: { clientId: string; address: string; district: string; city: string; state: string; postalCode: string }) {
  return requestJson<{ ok: true }>('/api/company/clients/address', { method: 'POST', body: JSON.stringify(input) });
}

// --- Edição pela gestão ---

/** A função saiu dos formulários em 26/09/2026; o login só existe para cliente Amazon. */
export type DadosParticipante = { fullName: string; documentId: string; rg: string; birthDate: string; email: string; phone: string; employeeLogin?: string };

export function updateClient(clientId: string, input: { name: string; legalName: string; document: string; unit: string; contactName: string; contactEmail: string; contactPhone: string }) {
  return requestJson<{ ok: true }>(`/api/company/clients/${encodeURIComponent(clientId)}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateInstructor(instructorId: string, input: { name: string; document: string; email: string; phone: string; professionalRegistry: string; specialties: string; baseCity: string }) {
  return requestJson<{ ok: true }>(`/api/company/instructors/${encodeURIComponent(instructorId)}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateTrainingDetails(trainingId: string, details: { clientId: string; nr: string; title: string; duration: string; location: string; contentProgram: string; theme: string; validityMonths?: number }) {
  return requestJson<{ ok: true }>(`/api/company/trainings/${encodeURIComponent(trainingId)}`, { method: 'PATCH', body: JSON.stringify({ details }) });
}

export function addTrainingDay(trainingId: string, input: NovoDia) {
  return requestJson<{ ok: true; sessions: TrainingSession[] }>(`/api/company/trainings/${encodeURIComponent(trainingId)}/sessions`, { method: 'POST', body: JSON.stringify(input) });
}

export function removeTrainingDay(trainingId: string, sessionId: string) {
  return requestJson<{ ok: true; sessions: TrainingSession[] }>(`/api/company/trainings/${encodeURIComponent(trainingId)}/sessions`, { method: 'DELETE', body: JSON.stringify({ sessionId }) });
}

export function addParticipantByCompany(trainingId: string, participant: DadosParticipante) {
  return requestJson<{ id: string }>('/api/company/participants', { method: 'POST', body: JSON.stringify({ trainingId, ...participant }) });
}

export function updateParticipantByCompany(participantId: string, participant: DadosParticipante) {
  return requestJson<{ ok: true }>('/api/company/participants', { method: 'PATCH', body: JSON.stringify({ participantId, ...participant }) });
}

export function removeParticipantByCompany(participantId: string) {
  return requestJson<{ ok: true }>('/api/company/participants', { method: 'DELETE', body: JSON.stringify({ participantId }) });
}

/** Marca (present = true) ou desmarca a presença de um dia, sem as travas do check-in. */
export function setParticipantAttendance(participantId: string, sessionId: string, present: boolean) {
  return requestJson<{ ok: true }>('/api/company/participants/attendance', { method: 'POST', body: JSON.stringify({ participantId, sessionId, present }) });
}
