import { InstructorPortal } from '@/components/instructor-portal/instructor-portal';
import { getInstructorDashboardData } from '@/db/company-repository';
import { requireInstructor } from '@/lib/app-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InstructorPortalPage() {
  const user = await requireInstructor();
  if (user.must_reset) redirect('/definir-senha');
  const data = await getInstructorDashboardData(user);
  if (!data) redirect('/instrutor/login?status=pending');
  return <InstructorPortal initialData={data} />;
}
