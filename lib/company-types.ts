export type CompanyClient = {
  id: string;
  name: string;
  legal_name: string;
  document: string;
  unit: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
  /** Login da empresa no portal; nulo = ainda não consegue entrar. */
  username: string | null;
  status: string;
  created_at: string;
};

export type CompanyInstructor = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  professional_registry: string;
  specialties: string;
  base_city: string;
  status: string;
  source: string;
  created_at: string;
  document_count: number;
  pending_document_count: number;
};

export type CompanyInstructorDocument = {
  id: string;
  instructor_id: string;
  name: string;
  content_type: string;
  size: number;
  category: 'identity' | 'professional_registration' | 'qualification' | 'experience';
  status: string;
  created_at: string;
};

export type CompanyInstructorAvailability = {
  id: string;
  instructor_id: string;
  instructor_name: string;
  available_date: string;
  note: string;
  status: string;
  created_at: string;
};

/** Um dia do treinamento: data, horário e o instrutor escalado para ele. */
export type TrainingSession = {
  id: string;
  training_id: string;
  day_number: number;
  session_date: string;
  start_time: string;
  end_time: string;
  instructor_id: string | null;
  instructor_name: string | null;
  status: string;
};

export type CompanyTraining = {
  id: string;
  client_id: string;
  instructor_id: string | null;
  client_name: string;
  /** Razão social; vem só na busca pelo QR, para saber se o cliente pede login. */
  client_legal_name?: string;
  /** Página pública do QR: o formulário pede o login da Amazon. */
  pedeLogin?: boolean;
  code: string;
  nr: string;
  /** Título que sai impresso no certificado. */
  title: string;
  /** Nome interno para diferenciar turmas; nunca sai em documento. */
  internal_label: string;
  /** Assunto da turma, avisado ao instrutor na escala; vem só na gestão. */
  theme?: string;
  /** Conteúdo programático; vem só nos dados da gestão. */
  content_program?: string;
  training_date: string;
  duration: string;
  location: string;
  instructor: string;
  status: string;
  participant_limit: number;
  qr_token: string;
  qr_enabled: number;
  created_at: string;
  file_count: number;
  participant_count: number;
  sessions: TrainingSession[];
  /** Validade do certificado em meses; 0 = não informada. Só existe no portal. */
  validity_months?: number;
  /** Quando o último lote de certificados foi gerado; nulo = turma sem certificado. */
  certificate_generated_at?: string | null;
};

/** Pedido de nova turma feito pelo cliente no portal. */
export type CompanyTrainingRequest = {
  id: string;
  client_id: string;
  client_name: string;
  requested_by_name: string | null;
  nr: string;
  title: string;
  participants: number;
  preferred_period: string;
  location: string;
  notes: string;
  based_on_training_id: string | null;
  status: string;
  created_at: string;
};

export type CompanyFile = {
  id: string;
  client_id: string;
  client_name: string;
  training_id: string;
  training_title: string;
  training_nr: string;
  name: string;
  object_key: string;
  content_type: string;
  size: number;
  kind: 'photo' | 'document' | 'attendance';
  session_id: string | null;
  status: string;
  created_at: string;
};

export type CompanyParticipant = {
  id: string;
  training_id: string;
  training_title: string;
  training_nr: string;
  client_name: string;
  full_name: string;
  document_id: string;
  rg: string;
  birth_date: string;
  email: string;
  phone: string;
  job_title: string;
  /** Login interno do participante; só cliente Amazon pede (vazio nos demais). */
  employee_login?: string;
  created_at: string;
  /** Dias da turma com check-in deste aluno. */
  days_present: number;
  /** Dias da turma. Certificado só com days_present === days_total. */
  days_total: number;
  /** Ids dos dias com presença, separados por vírgula. Vem só nos dados do instrutor. */
  present_sessions?: string | null;
};

/** Resposta do check-in pelo QR: qual dia foi marcado e quantos o aluno já tem. */
export type CheckinResult = {
  participantId: string;
  fullName: string;
  day: number;
  totalDays: number;
  daysPresent: number;
  alreadyCheckedIn: boolean;
};

export type AttendanceListData = {
  training: {
    id: string;
    client_name: string;
    location: string;
    duration: string;
    instructor: string;
    nr: string;
    title: string;
    dates: string[];
    content_program: string;
  };
  participants: {
    full_name: string;
    document_id: string;
    rg: string;
    birth_date: string;
  }[];
};

export type CompanyEmployee = {
  id: string;
  name: string;
  email: string;
  is_owner: number;
  active: number;
  must_reset: number;
  job_title: string;
  last_login_at: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};

export type CompanyDashboardData = {
  clients: CompanyClient[];
  instructors: CompanyInstructor[];
  instructorAvailability: CompanyInstructorAvailability[];
  trainings: CompanyTraining[];
  files: CompanyFile[];
  participants: CompanyParticipant[];
  /** Um par por presença gravada (check-in do aluno ou marcação da gestão). */
  attendance: { participant_id: string; session_id: string }[];
  requests: CompanyTrainingRequest[];
  /** Há envio de e-mail configurado (RESEND_API_KEY + MAIL_FROM no servidor)? */
  mailConfigured: boolean;
  currentUser: { id: string; email: string; name: string; jobTitle: string; isOwner: boolean };
};
