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

export type CompanyTraining = {
  id: string;
  client_id: string;
  instructor_id: string | null;
  client_name: string;
  code: string;
  nr: string;
  title: string;
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
  created_at: string;
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
  currentUser: { id: string; email: string; isOwner: boolean };
};
