import type {
  CompanyInstructor,
  CompanyInstructorDocument,
  CompanyParticipant,
  CompanyTraining,
} from '@/lib/company-types';

export type InstructorAvailability = {
  id: string;
  instructor_id: string;
  available_date: string;
  note: string;
  status: string;
  created_at: string;
};

export type InstructorDashboardData = {
  instructor: CompanyInstructor;
  trainings: CompanyTraining[];
  availability: InstructorAvailability[];
  documents: CompanyInstructorDocument[];
  participants: CompanyParticipant[];
  currentUser: { id: string; name: string; email: string };
};
