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
};

export type ClientPhoto = {
  id: string;
  clientId: string;
  trainingId: string;
  src: string;
  alt: string;
  dateLabel: string;
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

/** Participante da turma como a empresa vê: nome, função e presença. Sem CPF/RG. */
export type ClientParticipant = {
  id: string;
  trainingId: string;
  fullName: string;
  jobTitle: string;
  daysPresent: number;
  daysTotal: number;
};

export type ClientPortalData = {
  organization: ClientOrganization;
  trainings: ClientTraining[];
  participants: ClientParticipant[];
  photos: ClientPhoto[];
  documents: ClientDocument[];
  certificates: ClientCertificate[];
};
