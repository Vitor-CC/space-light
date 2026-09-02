'use client';

import { Award, Building2, ChevronRight, FileUp, GraduationCap, LayoutDashboard, LogOut, QrCode, RefreshCw, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CompanyCertificates } from '@/components/company-portal/company-certificates';
import { CompanyClients } from '@/components/company-portal/company-clients';
import { CompanyDashboard } from '@/components/company-portal/company-dashboard';
import { CompanyFiles } from '@/components/company-portal/company-files';
import { CompanyInstructors } from '@/components/company-portal/company-instructors';
import { CompanyParticipants } from '@/components/company-portal/company-participants';
import { CompanyTrainings } from '@/components/company-portal/company-trainings';
import { SectionHeading } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData } from '@/lib/company-types';
import { readMockCompanyDatabase } from '@/lib/mock-company-database';

const navigation = [
  { id: 'dashboard' as const, label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard },
  { id: 'clients' as const, label: 'Clientes', shortLabel: 'Clientes', icon: Building2 },
  { id: 'instructors' as const, label: 'Instrutores', shortLabel: 'Instrut.', icon: UserRound },
  { id: 'trainings' as const, label: 'Treinamentos', shortLabel: 'Treinos', icon: GraduationCap },
  { id: 'files' as const, label: 'Arquivos', shortLabel: 'Arquivos', icon: FileUp },
  { id: 'participants' as const, label: 'QR e participantes', shortLabel: 'QR', icon: QrCode },
  { id: 'certificates' as const, label: 'Certificados', shortLabel: 'Certif.', icon: Award },
];

export function CompanyPortal({ initialData }: { initialData: CompanyDashboardData }) {
  const [section, setSection] = useState<CompanySection>('dashboard');
  const [data, setData] = useState<CompanyDashboardData | null>(initialData);
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => setData(await readMockCompanyDatabase()), []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 6000); return () => window.clearTimeout(timer); }, [notice]);

  const content = useMemo(() => {
    if (!data) return null;
    if (section === 'dashboard') return <CompanyDashboard data={data} navigate={setSection} />;
    if (section === 'clients') return <CompanyClients data={data} reload={reload} notify={setNotice} />;
    if (section === 'instructors') return <CompanyInstructors data={data} reload={reload} notify={setNotice} />;
    if (section === 'trainings') return <CompanyTrainings data={data} reload={reload} notify={setNotice} />;
    if (section === 'files') return <CompanyFiles data={data} reload={reload} notify={setNotice} />;
    if (section === 'participants') return <CompanyParticipants data={data} reload={reload} />;
    return <CompanyCertificates data={data} />;
  }, [data, reload, section]);

  return <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">
    {notice ? <output className="fixed right-4 top-24 z-[60] max-w-sm border-l-4 border-[#f2ad19] bg-black p-4 text-sm text-white shadow-xl">{notice}</output> : null}
    <header className="sticky top-0 z-50 flex h-[76px] items-center justify-between border-b border-white/10 bg-black px-4 text-white sm:px-7"><div className="flex min-w-0 items-center gap-5"><Link href="/" aria-label="Space Light Engenharia — início" className="shrink-0"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></Link><span className="hidden h-8 w-px bg-white/15 sm:block" /><div className="hidden sm:block"><strong className="block text-xs">Gestão Space Light</strong><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-white/40">Área interna protegida</span></div></div><div className="flex gap-2"><button type="button" onClick={() => void reload()} aria-label="Atualizar dados" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><RefreshCw className="size-4" /></button><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sair" className="flex size-10 items-center justify-center border border-white/15 text-white/65 hover:border-[#f2ad19] hover:text-white"><LogOut className="size-4" /></button></form></div></header>
    <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden min-h-[calc(100vh-76px)] bg-[#171716] p-5 text-white lg:block"><div className="sticky top-[96px]"><span className="eyebrow px-3 text-[#f2ad19]">Operação</span><nav aria-label="Navegação da Área da Empresa" className="mt-5 space-y-1">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex h-12 w-full items-center gap-3 px-3 text-left text-[10px] font-extrabold uppercase tracking-[0.09em] transition ${section === id ? 'bg-[#f2ad19] text-black' : 'text-white/58 hover:bg-white/8 hover:text-white'}`}><Icon className="size-4" />{label}<ChevronRight className={`ml-auto size-4 ${section === id ? 'opacity-100' : 'opacity-25'}`} /></button>)}</nav><div className="mt-7 flex items-center gap-3 border border-white/10 p-4"><UserRound className="size-5 text-[#f2ad19]" /><div className="min-w-0"><strong className="block truncate text-xs">Equipe Space Light</strong><span className="mt-1 block truncate text-[9px] uppercase tracking-[0.09em] text-white/40">{data?.currentUser.email}</span></div></div></div></aside>
      <div className="min-w-0"><nav aria-label="Navegação móvel da Área da Empresa" className="grid grid-cols-7 overflow-x-auto border-b border-black/10 bg-white lg:hidden">{navigation.map(({ id, shortLabel, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex min-w-[72px] flex-col items-center gap-1.5 border-r border-black/8 px-2 py-3 text-[8px] font-extrabold uppercase tracking-[0.07em] ${section === id ? 'bg-[#f2ad19] text-black' : 'text-[#666]'}`}><Icon className="size-4" />{shortLabel}</button>)}</nav><section className="p-4 sm:p-6 md:p-8 xl:p-11"><SectionHeading section={section} />{!data ? <div className="flex min-h-[420px] items-center justify-center"><RefreshCw className="size-6 animate-spin text-[#8a6107]" /></div> : <div key={section} className="mt-7">{content}</div>}</section></div>
    </div>
  </main>;
}
