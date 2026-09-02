import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscrição em treinamento | Space Light Engenharia',
  description: 'Formulário público de participantes dos treinamentos Space Light.',
  robots: { index: false, follow: false },
};

export default function ParticipantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
