import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Área do Instrutor | Space Light',
  description: 'Agenda, treinamentos, QR Code e disponibilidade dos instrutores Space Light.',
  robots: { index: false, follow: false },
};

export default function InstructorAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
