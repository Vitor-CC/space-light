import { redirect } from 'next/navigation';

import { AttendanceList } from '@/components/attendance-list';
import { getAttendanceListData } from '@/db/company-repository';
import { requireUser } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

export default async function AttendanceListPage({ params }: { params: Promise<{ trainingId: string }> }) {
  const user = await requireUser();
  if (user.must_reset) redirect('/cliente/definir-senha');
  if (user.role !== 'admin' && user.role !== 'instructor') redirect('/cliente');
  const { trainingId } = await params;
  const data = await getAttendanceListData({
    trainingId,
    user: { id: user.id, role: user.role, instructor_id: user.instructor_id },
  });
  if (!data) redirect(user.role === 'admin' ? '/empresa' : '/instrutor');
  return (
    <main className="min-h-screen bg-[#efefeb] p-4 md:p-8">
      <AttendanceList data={data} />
    </main>
  );
}
