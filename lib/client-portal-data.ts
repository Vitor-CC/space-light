// Tipos de dados da Área do Cliente. Os dados reais vêm do banco via
// `getClientPortalData` em `db/company-repository.ts`.

export type TrainingStatus = 'Concluído' | 'Agendado' | 'Em andamento';

export type ClientTraining = {
  id: string;
  clientId: string;
  code: string;
  nr: string;
  title: string;
  date: string;
  dateLabel: string;
  duration: string;
  location: string;
  instructor: string;
  status: TrainingStatus;
  participantCount: number;
  photoCount: number;
  documentCount: number;
  certificateCount: number;
  /** Último dia da turma (YYYY-MM-DD): a validade conta a partir dele. */
  lastDate: string;
  daysTotal: number;
  /** Validade do certificado em meses; 0 = não informada. */
  validityMonths: number;
  /** Vencimento (YYYY-MM-DD) quando há validade e a turma foi concluída. */
  expiresAt: string | null;
};

export type ClientParticipant = {
  id: string;
  trainingId: string;
  fullName: string;
  jobTitle: string;
  daysPresent: number;
  daysTotal: number;
  /** PDF do certificado desta pessoa, quando já foi gerado. */
  certificateFileId: string | null;
};

export type ClientTrainingRequest = {
  id: string;
  nr: string;
  title: string;
  participants: number;
  preferredPeriod: string;
  status: string;
  createdAt: string;
};

export type ClientPhoto = {
  id: string;
  clientId: string;
  trainingId: string;
  src: string;
  alt: string;
  dateLabel: string;
  createdAt: string;
};

export type ClientDocument = {
  id: string;
  clientId: string;
  trainingId: string | null;
  title: string;
  category: string;
  format: string;
  size: string;
  updatedAt: string;
  createdAt: string;
  /** Certificado individual de aluno (vai na aba Certificados, não em Documentos). */
  isCertificate: boolean;
};

export type ClientCertificate = {
  id: string;
  clientId: string;
  trainingId: string;
  title: string;
  reference: string;
  issuedAt: string;
  expiresAt: string;
  quantity: number;
};

export type ClientOrganization = {
  id: string;
  legalName: string;
  displayName: string;
  document: string;
  unit: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
};

export type ClientPortalData = {
  organization: ClientOrganization;
  trainings: ClientTraining[];
  photos: ClientPhoto[];
  documents: ClientDocument[];
  certificates: ClientCertificate[];
  participants: ClientParticipant[];
  requests: ClientTrainingRequest[];
};
