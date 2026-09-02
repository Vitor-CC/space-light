'use client';

import {
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Home,
  ImageIcon,
  Images,
  LayoutDashboard,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ClientCertificate, ClientDocument, ClientPortalData, ClientTraining } from '@/lib/client-portal-data';

type PortalSection =
  | 'dashboard'
  | 'trainings'
  | 'photos'
  | 'documents'
  | 'certificates'
  | 'profile';

const navigation: Array<{
  id: PortalSection;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard },
  { id: 'trainings', label: 'Treinamentos', shortLabel: 'Treinos', icon: GraduationCap },
  { id: 'photos', label: 'Fotos', shortLabel: 'Fotos', icon: Images },
  { id: 'documents', label: 'Documentos', shortLabel: 'Docs', icon: FileText },
  { id: 'certificates', label: 'Certificados', shortLabel: 'Certif.', icon: Award },
  { id: 'profile', label: 'Perfil da empresa', shortLabel: 'Perfil', icon: Building2 },
];

const sectionCopy: Record<PortalSection, { title: string; description: string }> = {
  dashboard: {
    title: 'Visão geral',
    description: 'Acompanhe os registros mais recentes da sua empresa.',
  },
  trainings: {
    title: 'Treinamentos',
    description: 'Histórico e agenda de capacitações contratadas pela empresa.',
  },
  photos: {
    title: 'Fotos',
    description: 'Registros visuais organizados por treinamento.',
  },
  documents: {
    title: 'Documentos',
    description: 'Arquivos técnicos, listas e relatórios liberados pela Space Light.',
  },
  certificates: {
    title: 'Certificados',
    description: 'Lotes corporativos de certificados disponíveis para consulta.',
  },
  profile: {
    title: 'Perfil da empresa',
    description: 'Dados cadastrais vinculados a este acesso corporativo.',
  },
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function demoFileHref(title: string, type: string, legalName: string) {
  const body = [
    'SPACE LIGHT ENGENHARIA',
    type.toUpperCase(),
    '',
    title,
    `Cliente: ${legalName}`,
    '',
    'Arquivo demonstrativo do protótipo da Área do Cliente.',
    'Os arquivos oficiais serão disponibilizados pela equipe Space Light após a integração do backend.',
  ].join('\n');

  return `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;
}

function StatusTag({ status }: { status: ClientTraining['status'] }) {
  const isCompleted = status === 'Concluído';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
        isCompleted ? 'bg-[#daf2df] text-[#17642d]' : 'bg-[#f2ad19]/18 text-[#785303]'
      }`}
    >
      {isCompleted ? <CheckCircle2 className="size-3.5" /> : <CalendarDays className="size-3.5" />}
      {status}
    </span>
  );
}

function SectionHeading({ section }: { section: PortalSection }) {
  const copy = sectionCopy[section];
  return (
    <div className="flex flex-col gap-4 border-b border-black/12 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="eyebrow text-[#8a6107]">Área do Cliente</span>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.055em] md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#666] md:text-base">{copy.description}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 border border-black/10 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]">
        <ShieldCheck className="size-4 text-[#8a6107]" /> Somente leitura
      </span>
    </div>
  );
}

function TrainingCard({ training }: { training: ClientTraining }) {
  return (
    <article className="border border-black/10 bg-white">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center bg-black font-heading text-lg font-black text-[#f2ad19]">
            {training.nr}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusTag status={training.status} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">{training.code}</span>
            </div>
            <h2 className="mt-3 max-w-2xl text-xl font-extrabold uppercase leading-tight tracking-[-0.035em] md:text-2xl">
              {training.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#666]">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-[#8a6107]" />{training.dateLabel}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[#8a6107]" />{training.duration}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-[#8a6107]" />{training.location}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-black/10 md:min-w-[270px]">
          {[
            ['Participantes', training.participantCount],
            ['Fotos', training.photoCount],
            ['Certificados', training.certificateCount],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#f5f5f2] px-3 py-4 text-center">
              <strong className="block font-heading text-xl">{value}</strong>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#777]">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-black/8 bg-[#fafaf8] px-6 py-4 text-xs text-[#666] md:px-7">
        <span><strong className="text-black">Instrutor:</strong> {training.instructor}</span>
        <span><strong className="text-black">Documentos:</strong> {training.documentCount}</span>
      </div>
    </article>
  );
}

function Dashboard({ data, userName, onNavigate }: { data: ClientPortalData; userName: string; onNavigate: (section: PortalSection) => void }) {
  const lastTraining = data.trainings[0];
  const totals = {
    trainings: data.trainings.length,
    photos: data.trainings.reduce((total, item) => total + item.photoCount, 0),
    documents: data.documents.length,
    certificates: data.certificates.reduce((total, item) => total + item.quantity, 0),
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-black p-7 text-white md:p-10">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow text-[#f2ad19]">Olá, {userName}</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-black uppercase leading-[0.94] tracking-[-0.055em] md:text-5xl">
              Seus treinamentos estão organizados e disponíveis.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/62 md:text-base">
              Consulte os materiais da {data.organization.displayName}. Novos registros aparecem aqui após a liberação da equipe Space Light.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('trainings')}
            className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-[#ff9900]"
          >
            Ver treinamentos <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Treinamentos', value: totals.trainings, icon: GraduationCap, section: 'trainings' as const },
          { label: 'Fotos registradas', value: totals.photos, icon: ImageIcon, section: 'photos' as const },
          { label: 'Documentos', value: totals.documents, icon: FileText, section: 'documents' as const },
          { label: 'Certificados', value: totals.certificates, icon: Award, section: 'certificates' as const },
        ].map(({ label, value, icon: Icon, section }) => (
          <button
            type="button"
            key={label}
            onClick={() => onNavigate(section)}
            className="group flex min-h-36 items-center justify-between bg-white p-6 text-left transition hover:bg-[#fff8e8]"
          >
            <div>
              <strong className="font-heading text-4xl font-black tracking-[-0.05em]">{value}</strong>
              <span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#777]">{label}</span>
            </div>
            <span className="flex size-11 items-center justify-center bg-black text-[#f2ad19] transition group-hover:bg-[#f2ad19] group-hover:text-black">
              <Icon className="size-5" />
            </span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <span className="eyebrow text-[#8a6107]">Atividade recente</span>
            <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[-0.04em]">Último treinamento</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('trainings')}
            className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107] hover:text-black"
          >
            Ver todos
          </button>
        </div>
        {lastTraining ? <TrainingCard training={lastTraining} /> : <EmptyState text="Nenhum treinamento foi publicado para esta empresa ainda." />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate('photos')}
          className="group flex min-h-28 items-center justify-between border border-black/10 bg-white p-6 text-left hover:border-[#f2ad19]"
        >
          <span className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center bg-[#f2ad19]"><Images className="size-5" /></span>
            <span><strong className="block text-sm uppercase">Ver fotos recentes</strong><span className="mt-1 block text-xs text-[#777]">Registros separados por treinamento</span></span>
          </span>
          <ChevronRight className="size-5 text-black/30 transition group-hover:translate-x-1 group-hover:text-black" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('documents')}
          className="group flex min-h-28 items-center justify-between border border-black/10 bg-white p-6 text-left hover:border-[#f2ad19]"
        >
          <span className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center bg-black text-[#f2ad19]"><FileCheck2 className="size-5" /></span>
            <span><strong className="block text-sm uppercase">Consultar documentos</strong><span className="mt-1 block text-xs text-[#777]">Arquivos liberados pela Space Light</span></span>
          </span>
          <ChevronRight className="size-5 text-black/30 transition group-hover:translate-x-1 group-hover:text-black" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="border border-dashed border-black/20 bg-white p-10 text-center text-sm text-[#666]">{text}</div>;
}

function Trainings({ data }: { data: ClientPortalData }) {
  return data.trainings.length ? <div className="space-y-4">{data.trainings.map((training) => <TrainingCard key={training.id} training={training} />)}</div> : <EmptyState text="Nenhum treinamento disponível no momento." />;
}

function Photos({ data }: { data: ClientPortalData }) {
  const trainingById = new Map(data.trainings.map((training) => [training.id, training]));
  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-l-4 border-[#f2ad19] bg-white p-4 text-sm text-[#666]">
        <ImageIcon className="mt-0.5 size-5 shrink-0 text-[#8a6107]" />
        <p>As fotos liberadas pela equipe Space Light aparecem aqui, separadas por treinamento.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.photos.map((photo) => {
          const training = trainingById.get(photo.trainingId);
          return (
            <a key={photo.id} href={photo.src} target="_blank" rel="noreferrer" className="group relative min-h-[300px] overflow-hidden bg-black">
              <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover opacity-85 transition duration-500 group-hover:scale-[1.025] group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="eyebrow text-[#f2ad19]">{training?.nr} · {photo.dateLabel}</span>
                <strong className="mt-2 block text-base uppercase leading-tight">{training?.title}</strong>
                <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">Abrir foto <ChevronRight className="size-3.5" /></span>
              </div>
            </a>
          );
        })}
      </div>
      {!data.photos.length ? <EmptyState text="Nenhuma foto foi publicada para esta empresa ainda." /> : null}
    </div>
  );
}

function DocumentRow({ document, data }: { document: ClientDocument; data: ClientPortalData }) {
  const training = data.trainings.find((item) => item.id === document.trainingId);
  return (
    <article className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
      <span className="flex size-12 items-center justify-center bg-black text-[#f2ad19]"><FileText className="size-5" /></span>
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{document.category}</span>
        <h2 className="mt-1 text-base font-extrabold uppercase tracking-[-0.02em]">{document.title}</h2>
        <p className="mt-2 text-xs text-[#777]">{training ? `${training.nr} · ${training.dateLabel}` : 'Documento geral da empresa'} · {document.format} · {document.size} · Atualizado em {document.updatedAt}</p>
      </div>
      <a
        href={demoFileHref(document.title, 'Documento', data.organization.legalName)}
        download={`${slugify(document.title)}.txt`}
        className="inline-flex h-11 items-center justify-center gap-2 border border-black/16 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white"
      >
        <Download className="size-4" /> Baixar arquivo
      </a>
    </article>
  );
}

function Documents({ data }: { data: ClientPortalData }) {
  return data.documents.length ? <div className="space-y-3">{data.documents.map((document) => <DocumentRow key={document.id} document={document} data={data} />)}</div> : <EmptyState text="Nenhum documento foi publicado para esta empresa ainda." />;
}

function CertificateCard({ certificate, data }: { certificate: ClientCertificate; data: ClientPortalData }) {
  const training = data.trainings.find((item) => item.id === certificate.trainingId);
  return (
    <article className="relative overflow-hidden border border-black/10 bg-white p-6 md:p-7">
      <div className="absolute right-0 top-0 h-1 w-24 bg-[#f2ad19]" />
      <div className="flex items-start justify-between gap-6">
        <span className="flex size-14 items-center justify-center bg-[#f2ad19] text-black"><Award className="size-6" /></span>
        <span className="font-heading text-4xl font-black tracking-[-0.05em] text-black/12">{String(certificate.quantity).padStart(2, '0')}</span>
      </div>
      <span className="eyebrow mt-8 block text-[#8a6107]">{training?.nr} · {certificate.reference}</span>
      <h2 className="mt-3 text-xl font-extrabold uppercase leading-tight tracking-[-0.035em]">{certificate.title}</h2>
      <dl className="mt-6 grid gap-3 border-y border-black/8 py-5 text-xs">
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Emissão</dt><dd className="font-bold text-right">{certificate.issuedAt}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Validade</dt><dd className="font-bold text-right">{certificate.expiresAt}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Quantidade</dt><dd className="font-bold text-right">{certificate.quantity}</dd></div>
      </dl>
      <a
        href={demoFileHref(certificate.title, 'Certificado', data.organization.legalName)}
        download={`${slugify(certificate.title)}.txt`}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 bg-black px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#f2ad19] hover:text-black"
      >
        <Download className="size-4" /> Baixar lote
      </a>
    </article>
  );
}

function Certificates({ data }: { data: ClientPortalData }) {
  return (
    <div>
      <div className="mb-6 border-l-4 border-[#f2ad19] bg-white p-5">
        <strong className="text-sm uppercase">Acesso corporativo</strong>
        <p className="mt-2 text-sm leading-relaxed text-[#666]">Os certificados são organizados em lotes para a empresa contratante. Participantes não possuem conta nem acesso individual ao portal.</p>
      </div>
      {data.certificates.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.certificates.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} data={data} />)}</div> : <EmptyState text="Nenhum lote de certificados foi publicado ainda." />}
    </div>
  );
}

function Profile({ data }: { data: ClientPortalData }) {
  const organization = data.organization;
  const fields = [
    ['Razão social', organization.legalName],
    ['CNPJ', organization.document],
    ['Unidade', organization.unit],
    ['Responsável', organization.contactName],
    ['Cargo', organization.contactRole],
    ['E-mail', organization.email],
    ['Telefone', organization.phone],
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center gap-4 border-b border-black/8 pb-6">
          <span className="flex size-16 items-center justify-center bg-black text-[#f2ad19]"><Building2 className="size-7" /></span>
          <div><span className="eyebrow text-[#8a6107]">Empresa contratante</span><h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">{organization.displayName}</h2></div>
        </div>
        <dl className="mt-2 divide-y divide-black/8">
          {fields.map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr]"><dt className="text-xs font-bold text-[#777]">{label}</dt><dd className="text-sm font-semibold">{value}</dd></div>)}
        </dl>
      </section>
      <aside className="space-y-5">
        <div className="bg-black p-7 text-white">
          <ShieldCheck className="size-8 text-[#f2ad19]" />
          <h2 className="mt-7 text-2xl font-black uppercase tracking-[-0.04em]">Como funciona este acesso</h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />A empresa consulta e baixa materiais liberados.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />Não há envio, edição ou exclusão de arquivos pelo cliente.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />Participantes e alunos não possuem conta individual.</li>
          </ul>
        </div>
        <div className="border border-black/10 bg-white p-6">
          <span className="eyebrow text-[#8a6107]">Precisa corrigir um dado?</span>
          <p className="mt-3 text-sm leading-relaxed text-[#666]">Como o portal é somente leitura, a atualização cadastral é feita pela equipe Space Light.</p>
          <a href="https://wa.me/5511941318646?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20%C3%81rea%20do%20Cliente." target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107] hover:text-black"><Phone className="size-4" /> Falar com a Space Light</a>
        </div>
      </aside>
    </div>
  );
}

export function ClientPortal({ data, user }: { data: ClientPortalData; user: { name: string; email: string } }) {
  const [section, setSection] = useState<PortalSection>('dashboard');

  const content = useMemo(() => {
    switch (section) {
      case 'dashboard': return <Dashboard data={data} userName={user.name} onNavigate={setSection} />;
      case 'trainings': return <Trainings data={data} />;
      case 'photos': return <Photos data={data} />;
      case 'documents': return <Documents data={data} />;
      case 'certificates': return <Certificates data={data} />;
      case 'profile': return <Profile data={data} />;
    }
  }, [data, section, user.name]);

  return (
    <main className="min-h-screen bg-[#efefeb] text-[#0b0b0b]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black text-white">
        <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <a href="/" aria-label="Space Light Engenharia — início" className="shrink-0"><Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="h-11 w-auto brightness-0 invert" /></a>
            <span className="hidden h-8 w-px bg-white/15 sm:block" />
            <div className="hidden min-w-0 sm:block"><span className="block truncate text-xs font-bold">{data.organization.displayName}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-white/42">Acesso corporativo</span></div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="hidden h-10 items-center gap-2 border border-white/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70 transition hover:border-[#f2ad19] hover:text-white sm:inline-flex"><Home className="size-4" /> Site</a>
            <form action="/api/auth/logout" method="post"><Button type="submit" variant="outline" className="h-10 rounded-none border-white/15 bg-white/5 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black"><LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span></Button></form>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-76px)] border-r border-black/8 bg-[#171716] p-5 text-white lg:block">
          <div className="sticky top-[96px]">
            <div className="border-b border-white/10 px-3 pb-5"><span className="eyebrow text-[#f2ad19]">Navegação</span><p className="mt-2 text-xs leading-relaxed text-white/45">Consulta de treinamentos e arquivos da empresa.</p></div>
            <nav aria-label="Navegação da Área do Cliente" className="mt-5 space-y-1">
              {navigation.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return <button key={id} type="button" onClick={() => setSection(id)} className={`flex h-12 w-full items-center gap-3 px-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] transition ${active ? 'bg-[#f2ad19] text-black' : 'text-white/62 hover:bg-white/8 hover:text-white'}`}><Icon className="size-4" />{label}<ChevronRight className={`ml-auto size-4 ${active ? 'opacity-100' : 'opacity-20'}`} /></button>;
              })}
            </nav>
            <div className="mt-7 border border-white/10 p-4"><div className="flex items-center gap-3"><UserRound className="size-5 text-[#f2ad19]" /><div className="min-w-0"><strong className="block truncate text-xs">{user.name}</strong><span className="mt-1 block truncate text-[9px] uppercase tracking-[0.1em] text-white/40">{user.email}</span></div></div></div>
          </div>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Navegação móvel da Área do Cliente" className="grid grid-cols-6 overflow-x-auto border-b border-black/10 bg-white lg:hidden">
            {navigation.map(({ id, shortLabel, icon: Icon }) => {
              const active = section === id;
              return <button key={id} type="button" onClick={() => setSection(id)} aria-label={sectionCopy[id].title} className={`flex min-w-[74px] flex-col items-center gap-1.5 border-r border-black/8 px-2 py-3 text-[9px] font-extrabold uppercase tracking-[0.08em] ${active ? 'bg-[#f2ad19] text-black' : 'text-[#666]'}`}><Icon className="size-4" />{shortLabel}</button>;
            })}
          </nav>

          <div className="p-4 sm:p-6 md:p-8 xl:p-11">
            <SectionHeading section={section} />
            <div key={section} className="mt-7">{content}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
