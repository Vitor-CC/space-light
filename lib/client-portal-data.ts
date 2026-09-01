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

export type ClientPortalData = {
  organization: ClientOrganization;
  trainings: ClientTraining[];
  photos: ClientPhoto[];
  documents: ClientDocument[];
  certificates: ClientCertificate[];
};

export const DEMO_CLIENT_EMAIL = 'cliente@spacelight.com.br';
export const DEMO_CLIENT_PASSWORD = 'space2026';
export const CLIENT_SESSION_KEY = 'space-light-client-demo-session';

export function isDemoCredentials(email: string, password: string) {
  return (
    email.trim().toLowerCase() === DEMO_CLIENT_EMAIL &&
    password === DEMO_CLIENT_PASSWORD
  );
}

export const clientPortalData: ClientPortalData = {
  organization: {
    id: 'client-acme-sp-001',
    legalName: 'Indústria Horizonte Paulista S.A.',
    displayName: 'Horizonte Paulista',
    document: '12.345.678/0001-90',
    unit: 'Unidade Guarulhos · SP',
    contactName: 'Mariana Costa',
    contactRole: 'Coordenação de Segurança do Trabalho',
    email: DEMO_CLIENT_EMAIL,
    phone: '(11) 4000-2026',
  },
  trainings: [
    {
      id: 'training-nr23-2026-08',
      clientId: 'client-acme-sp-001',
      code: 'SL-2026-0823',
      nr: 'NR 23',
      title: 'Brigada de Incêndio e Emergências',
      date: '2026-08-19',
      dateLabel: '19 ago 2026',
      duration: '8 horas',
      location: 'Unidade Guarulhos · SP',
      instructor: 'Equipe técnica Space Light',
      status: 'Concluído',
      participantCount: 28,
      photoCount: 48,
      documentCount: 3,
      certificateCount: 28,
    },
    {
      id: 'training-nr35-2026-06',
      clientId: 'client-acme-sp-001',
      code: 'SL-2026-0635',
      nr: 'NR 35',
      title: 'Trabalho em Altura',
      date: '2026-06-12',
      dateLabel: '12 jun 2026',
      duration: '8 horas',
      location: 'Unidade Guarulhos · SP',
      instructor: 'Equipe técnica Space Light',
      status: 'Concluído',
      participantCount: 16,
      photoCount: 31,
      documentCount: 2,
      certificateCount: 16,
    },
    {
      id: 'training-nr10-2026-09',
      clientId: 'client-acme-sp-001',
      code: 'SL-2026-0910',
      nr: 'NR 10',
      title: 'Segurança em Instalações Elétricas',
      date: '2026-09-22',
      dateLabel: '22 set 2026',
      duration: '16 horas',
      location: 'Unidade Guarulhos · SP',
      instructor: 'A confirmar',
      status: 'Agendado',
      participantCount: 22,
      photoCount: 0,
      documentCount: 1,
      certificateCount: 0,
    },
  ],
  photos: [
    {
      id: 'photo-001',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      src: '/images/brand-v2/cases/space-light-case-01-brand-v2.png',
      alt: 'Equipe participando de atividade prática de prevenção a incêndios',
      dateLabel: '19 ago 2026',
    },
    {
      id: 'photo-002',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      src: '/images/brand-v2/cases/space-light-case-02-brand-v2.png',
      alt: 'Instrutor orientando a equipe durante treinamento',
      dateLabel: '19 ago 2026',
    },
    {
      id: 'photo-003',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      src: '/images/brand-v2/cases/space-light-case-03-brand-v2.png',
      alt: 'Participantes em simulação técnica supervisionada',
      dateLabel: '19 ago 2026',
    },
    {
      id: 'photo-004',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr35-2026-06',
      src: '/images/brand-v2/cases/space-light-case-04-brand-v2.png',
      alt: 'Equipe reunida após treinamento de segurança',
      dateLabel: '12 jun 2026',
    },
    {
      id: 'photo-005',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr35-2026-06',
      src: '/images/brand-v2/editorial/space-light-editorial-pratica-brand-v2.png',
      alt: 'Atividade prática de segurança do trabalho',
      dateLabel: '12 jun 2026',
    },
    {
      id: 'photo-006',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr35-2026-06',
      src: '/images/brand-v2/editorial/space-light-editorial-equipe-brand-v2.png',
      alt: 'Equipe durante orientação coletiva',
      dateLabel: '12 jun 2026',
    },
  ],
  documents: [
    {
      id: 'document-001',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      title: 'Lista de presença consolidada',
      category: 'Registro do treinamento',
      format: 'PDF',
      size: '1,8 MB',
      updatedAt: '21 ago 2026',
    },
    {
      id: 'document-002',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      title: 'Conteúdo programático — NR 23',
      category: 'Programa',
      format: 'PDF',
      size: '684 KB',
      updatedAt: '19 ago 2026',
    },
    {
      id: 'document-003',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr35-2026-06',
      title: 'Relatório de execução — NR 35',
      category: 'Relatório técnico',
      format: 'PDF',
      size: '2,4 MB',
      updatedAt: '15 jun 2026',
    },
    {
      id: 'document-004',
      clientId: 'client-acme-sp-001',
      trainingId: null,
      title: 'Proposta comercial aprovada',
      category: 'Comercial',
      format: 'PDF',
      size: '920 KB',
      updatedAt: '28 mai 2026',
    },
  ],
  certificates: [
    {
      id: 'certificate-001',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      title: 'Certificados — Brigada de Incêndio',
      reference: 'Lote SL-2026-0823',
      issuedAt: '21 ago 2026',
      expiresAt: 'Conforme plano da empresa',
      quantity: 28,
    },
    {
      id: 'certificate-002',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr35-2026-06',
      title: 'Certificados — Trabalho em Altura',
      reference: 'Lote SL-2026-0635',
      issuedAt: '15 jun 2026',
      expiresAt: 'Junho de 2028',
      quantity: 16,
    },
    {
      id: 'certificate-003',
      clientId: 'client-acme-sp-001',
      trainingId: 'training-nr23-2026-08',
      title: 'Declaração de realização do treinamento',
      reference: 'Documento corporativo',
      issuedAt: '21 ago 2026',
      expiresAt: 'Sem vencimento',
      quantity: 1,
    },
  ],
};
