'use client';

import {
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileArchive,
  FolderOpen,
  FileCheck2,
  FileText,
  GraduationCap,
  Home,
  ImageIcon,
  Loader2,
  Images,
  LayoutDashboard,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { downloadFilesAsZip, type ZipEntry } from '@/lib/download-zip';
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
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[0.01em] md:text-5xl md:tracking-normal">
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
            <h2 className="mt-3 max-w-2xl text-xl font-extrabold uppercase leading-tight tracking-[0.04em] md:text-2xl md:tracking-[0.03em]">
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
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#777]">{label}</span>
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
            <h2 className="mt-4 max-w-3xl text-3xl font-black uppercase leading-[0.94] tracking-[0.02em] md:text-5xl md:tracking-normal">
              Seus treinamentos estão organizados e disponíveis.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/62 md:text-base">
              Consulte os materiais da {data.organization.displayName}. Novos registros aparecem aqui após a liberação da equipe Space Light.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('trainings')}
            className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff9900]"
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
              <strong className="font-heading text-4xl font-black tracking-[-0.015em]">{value}</strong>
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
            <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Último treinamento</h2>
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
            <span><strong className="block text-sm uppercase tracking-[0.08em]">Ver fotos recentes</strong><span className="mt-1 block text-xs text-[#777]">Registros separados por treinamento</span></span>
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
            <span><strong className="block text-sm uppercase tracking-[0.08em]">Consultar documentos</strong><span className="mt-1 block text-xs text-[#777]">Arquivos liberados pela Space Light</span></span>
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

function DocumentRow({ document, data }: { document: ClientDocument; data: ClientPortalData }) {
  const training = data.trainings.find((item) => item.id === document.trainingId);
  return (
    <article className="grid gap-5 border border-black/10 bg-white p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
      <span className="flex size-12 items-center justify-center bg-black text-[#f2ad19]"><FileText className="size-5" /></span>
      <div className="min-w-0">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{document.category}</span>
        <h2 className="mt-1 truncate text-base font-extrabold uppercase tracking-[0.06em]" title={document.title}>{document.title}</h2>
        <p className="mt-2 text-xs text-[#777]">{training ? `${training.nr} · ${training.dateLabel}` : 'Documento geral da empresa'} · {document.format} · {document.size} · Enviado em {document.updatedAt}</p>
      </div>
      <div className="flex gap-2">
        <a href={`/api/files/${document.id}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 border border-black/16 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white"><Eye className="size-4" />Abrir</a>
        <a href={`/api/files/${document.id}?download=1`} className="inline-flex h-11 items-center justify-center gap-2 bg-[#f2ad19] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff9900]"><Download className="size-4" />Baixar</a>
      </div>
    </article>
  );
}

function DownloadAllButton({ entries, zipName }: { entries: ZipEntry[]; zipName: string }) {
  const [status, setStatus] = useState('');
  if (!entries.length) return null;

  async function run() {
    setStatus('Preparando…');
    try {
      const result = await downloadFilesAsZip({
        entries,
        zipName,
        onProgress: (done, total) => setStatus(done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`),
      });
      if (result.failed.length) window.alert(`${result.zipped} arquivo(s) baixados. Não deu para incluir: ${result.failed.join(', ')}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível montar o arquivo zip.');
    } finally {
      setStatus('');
    }
  }

  return (
    <button type="button" onClick={() => void run()} disabled={Boolean(status)} className="inline-flex h-11 items-center justify-center gap-2 bg-[#f2ad19] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff9900] disabled:opacity-60">
      {status ? <Loader2 className="size-4 animate-spin" /> : <FileArchive className="size-4" />}
      {status || `Baixar ${entries.length === 1 ? 'o arquivo' : `os ${entries.length}`} em zip`}
    </button>
  );
}

function BackToFolders({ onBack, training, download }: { onBack: () => void; training?: ClientTraining; download?: ZipEntry[] }) {
  const slug = `${training?.nr ?? 'turma'}-${training?.title ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training ? `${training.nr} · ${training.dateLabel}` : 'Turma'}</span>
        <h2 className="mt-1 text-xl font-extrabold uppercase tracking-[0.04em]">{training?.title ?? 'Treinamento'}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {download ? <DownloadAllButton entries={download} zipName={slug || 'arquivos'} /> : null}
        <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-2 border border-black/16 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white">
          <ArrowLeft className="size-4" /> Todas as turmas
        </button>
      </div>
    </div>
  );
}

function TrainingFolders({
  data, countFor, coverFor, onOpen, unit,
}: {
  data: ClientPortalData;
  countFor: (trainingId: string) => number;
  coverFor?: (trainingId: string) => string | undefined;
  onOpen: (trainingId: string) => void;
  unit: { one: string; many: string; none: string };
}) {
  if (!data.trainings.length) return <EmptyState text="Nenhum treinamento cadastrado para esta empresa ainda." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.trainings.map((training) => {
        const total = countFor(training.id);
        const cover = coverFor?.(training.id);
        return (
          <button key={training.id} type="button" onClick={() => onOpen(training.id)} className="group flex flex-col overflow-hidden border border-black/10 bg-white text-left transition hover:border-[#f2ad19]">
            <span className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#f7f7f4]">
              {cover
                ? <Image src={cover} alt="" fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                : <FolderOpen className="size-10 text-black/15" />}
              <span className="absolute right-3 top-3 bg-black px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#f2ad19]">
                {total === 0 ? unit.none : total === 1 ? `1 ${unit.one}` : `${total} ${unit.many}`}
              </span>
            </span>
            <span className="flex flex-1 flex-col p-5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training.nr} · {training.dateLabel}</span>
              <strong className="mt-1 line-clamp-2 text-base font-extrabold uppercase leading-tight tracking-[0.06em]">{training.title}</strong>
              <span className="mt-auto pt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#666] transition group-hover:text-black">
                Abrir turma <ChevronRight className="size-3.5" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Photos({ data }: { data: ClientPortalData }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const photosOf = (trainingId: string) => data.photos.filter((photo) => photo.trainingId === trainingId);
  const training = openId ? data.trainings.find((item) => item.id === openId) : undefined;
  const shown = openId ? photosOf(openId) : [];

  if (openId) {
    return (
      <div>
        <BackToFolders onBack={() => setOpenId(null)} training={training} download={shown.map((photo) => ({ id: photo.id, name: photo.alt }))} />
        {shown.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((photo) => (
              <figure key={photo.id} className="group border border-black/10 bg-white">
                <a href={photo.src} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden bg-black" aria-label={`Ver ${photo.alt} em tamanho cheio`}>
                  <Image src={photo.src} alt={photo.alt} fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                </a>
                <figcaption className="p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{photo.dateLabel}</span>
                  <strong className="mt-1 block truncate text-sm" title={photo.alt}>{photo.alt}</strong>
                  <div className="mt-4 flex gap-2">
                    <a href={photo.src} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 border border-black/16 text-[9px] font-extrabold uppercase tracking-[0.12em] transition hover:border-black hover:bg-black hover:text-white"><Eye className="size-4" />Ver</a>
                    <a href={`${photo.src}?download=1`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-[#f2ad19] text-[9px] font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff9900]"><Download className="size-4" />Baixar</a>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : <EmptyState text="Nenhuma foto foi publicada para esta turma ainda." />}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-l-4 border-[#f2ad19] bg-white p-4 text-sm text-[#666]">
        <ImageIcon className="mt-0.5 size-5 shrink-0 text-[#8a6107]" />
        <p>As fotos ficam organizadas por turma. Abra um treinamento para ver e baixar os registros dele.</p>
      </div>
      <TrainingFolders
        data={data}
        countFor={(id) => photosOf(id).length}
        coverFor={(id) => photosOf(id)[0]?.src}
        onOpen={setOpenId}
        unit={{ one: 'foto', many: 'fotos', none: 'Sem fotos' }}
      />
    </div>
  );
}

function Documents({ data }: { data: ClientPortalData }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const docsOf = (trainingId: string) => data.documents.filter((document) => document.trainingId === trainingId);
  const training = openId ? data.trainings.find((item) => item.id === openId) : undefined;
  const shown = openId ? docsOf(openId) : [];

  if (openId) {
    return (
      <div>
        <BackToFolders onBack={() => setOpenId(null)} training={training} download={shown.map((document) => ({ id: document.id, name: document.title }))} />
        {shown.length
          ? <div className="space-y-3">{shown.map((document) => <DocumentRow key={document.id} document={document} data={data} />)}</div>
          : <EmptyState text="Nenhum documento foi publicado para esta turma ainda." />}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-l-4 border-[#f2ad19] bg-white p-4 text-sm text-[#666]">
        <FileText className="mt-0.5 size-5 shrink-0 text-[#8a6107]" />
        <p>Os documentos ficam organizados por turma. Abra um treinamento para ver e baixar os arquivos dele.</p>
      </div>
      <TrainingFolders
        data={data}
        countFor={(id) => docsOf(id).length}
        onOpen={setOpenId}
        unit={{ one: 'documento', many: 'documentos', none: 'Sem documentos' }}
      />
    </div>
  );
}

function CertificateCard({ certificate, data }: { certificate: ClientCertificate; data: ClientPortalData }) {
  const training = data.trainings.find((item) => item.id === certificate.trainingId);
  return (
    <article className="relative overflow-hidden border border-black/10 bg-white p-6 md:p-7">
      <div className="absolute right-0 top-0 h-1 w-24 bg-[#f2ad19]" />
      <div className="flex items-start justify-between gap-6">
        <span className="flex size-14 items-center justify-center bg-[#f2ad19] text-black"><Award className="size-6" /></span>
        <span className="font-heading text-4xl font-black tracking-[-0.015em] text-black/12">{String(certificate.quantity).padStart(2, '0')}</span>
      </div>
      <span className="eyebrow mt-8 block text-[#8a6107]">{training?.nr} · {certificate.reference}</span>
      <h2 className="mt-3 text-xl font-extrabold uppercase leading-tight tracking-[0.04em]">{certificate.title}</h2>
      <dl className="mt-6 grid gap-3 border-y border-black/8 py-5 text-xs">
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Emissão</dt><dd className="font-bold text-right">{certificate.issuedAt}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Validade</dt><dd className="font-bold text-right">{certificate.expiresAt}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#777]">Quantidade</dt><dd className="font-bold text-right">{certificate.quantity}</dd></div>
      </dl>
      <p className="mt-6 flex items-start gap-2.5 border-l-4 border-[#f2ad19] bg-[#fff8e8] p-4 text-[11px] leading-relaxed text-[#6d5116]">
        <FileCheck2 className="mt-0.5 size-4 shrink-0" />
        <span>Os certificados deste lote são emitidos pela Space Light e publicados em <strong className="font-bold">Documentos</strong>, de onde você pode baixá-los.</span>
      </p>
    </article>
  );
}

function Certificates({ data }: { data: ClientPortalData }) {
  const completed = data.trainings.filter((training) => training.status === 'Concluído');
  return (
    <div>
      <div className="mb-6 border-l-4 border-[#f2ad19] bg-white p-5">
        <strong className="text-sm uppercase tracking-[0.08em]">Como funciona</strong>
        <p className="mt-2 text-sm leading-relaxed text-[#666]">Os certificados são emitidos pela Space Light por turma, para a empresa contratante — participantes não têm conta individual. Quando o lote fica pronto, o arquivo é publicado em <strong className="font-bold text-black">Documentos</strong>, de onde você baixa.</p>
      </div>

      {data.certificates.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.certificates.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} data={data} />)}</div> : null}

      {completed.length ? <div className="mt-6">
        <span className="eyebrow text-[#8a6107]">Turmas concluídas</span>
        <h2 className="mt-2 text-xl font-extrabold uppercase tracking-[0.04em]">Elegíveis para certificado</h2>
        <div className="mt-4 space-y-3">{completed.map((training) => <article key={training.id} className="flex flex-wrap items-center gap-4 border border-black/10 bg-white p-5">
          <span className="flex size-12 shrink-0 items-center justify-center bg-[#daf2df] text-[#17642d]"><FileCheck2 className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107]">{training.nr} · {training.dateLabel}</span>
            <h3 className="mt-1 text-sm font-extrabold uppercase tracking-[0.08em]">{training.title}</h3>
            <p className="mt-1 text-xs text-[#777]">{training.participantCount} participante(s) concluíram</p>
          </div>
          <span className="w-fit bg-[#f2ad19]/18 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#785303]">Certificado em preparação</span>
        </article>)}</div>
      </div> : null}

      {!data.certificates.length && !completed.length ? <EmptyState text="Assim que a primeira turma for concluída, ela aparece aqui aguardando a emissão dos certificados." /> : null}
    </div>
  );
}

function Profile({ data }: { data: ClientPortalData }) {
  const organization = data.organization;
  const router = useRouter();
  const [draft, setDraft] = useState({
    unit: organization.unit,
    contactName: organization.contactName,
    contactPhone: organization.phone,
  });
  const [saving, setSaving] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  const mudou =
    draft.unit !== organization.unit ||
    draft.contactName !== organization.contactName ||
    draft.contactPhone !== organization.phone;

  async function salvar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setAviso(null);
    try {
      const response = await fetch('/api/client/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar.');
      setAviso({ tom: 'ok', texto: 'Dados atualizados.' });
      router.refresh();
    } catch (error) {
      setAviso({ tom: 'erro', texto: error instanceof Error ? error.message : 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  }

  const campo = 'h-12 w-full border border-black/16 bg-white px-3 text-sm outline-none transition focus:border-[#f2ad19] focus:ring-2 focus:ring-[#f2ad19]/20';
  const rotulo = 'mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#555]';

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center gap-4 border-b border-black/8 pb-6">
          <span className="flex size-16 items-center justify-center bg-black text-[#f2ad19]"><Building2 className="size-7" /></span>
          <div><span className="eyebrow text-[#8a6107]">Empresa contratante</span><h2 className="mt-2 text-2xl font-black uppercase tracking-[0.03em]">{organization.displayName}</h2></div>
        </div>

        <form onSubmit={salvar} className="mt-7">
          <span className="eyebrow text-[#8a6107]">Você pode atualizar</span>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={rotulo}>Unidade / cidade</span><input required value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} className={campo} /></label>
            <label><span className={rotulo}>Responsável</span><input required value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} className={campo} /></label>
            <label><span className={rotulo}>Telefone</span><input value={draft.contactPhone} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} placeholder="(11) 90000-0000" className={campo} /></label>
          </div>

          {aviso ? <p role="status" className={`mt-4 border-l-4 p-3 text-sm ${aviso.tom === 'ok' ? 'border-[#17642d] bg-[#daf2df] text-[#17642d]' : 'border-[#b62525] bg-[#f3d4d4] text-[#8f1717]'}`}>{aviso.texto}</p> : null}

          <button type="submit" disabled={!mudou || saving} className="mt-5 inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-6 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[#ff9900] disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>

        <div className="mt-8 border-t border-black/8 pt-6">
          <span className="eyebrow text-[#8a6107]">Só a Space Light altera</span>
          <dl className="mt-3 divide-y divide-black/8">
            {[['Razão social', organization.legalName], ['CNPJ', organization.document], ['E-mail de acesso', organization.email]].map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]"><dt className="text-xs font-bold text-[#777]">{label}</dt><dd className="text-sm font-semibold">{value}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-[#888]">Razão social e CNPJ saem impressos na lista de presença, e o e-mail é o seu login — por isso a mudança passa pela equipe.</p>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="bg-black p-7 text-white">
          <ShieldCheck className="size-8 text-[#f2ad19]" />
          <h2 className="mt-7 text-2xl font-black uppercase tracking-[0.03em]">Como funciona este acesso</h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />A empresa consulta e baixa os materiais liberados.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />Fotos e documentos são publicados pela equipe Space Light.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#f2ad19]" />Participantes e alunos não possuem conta individual.</li>
          </ul>
        </div>
        <div className="border border-black/10 bg-white p-6">
          <span className="eyebrow text-[#8a6107]">Precisa mudar razão social, CNPJ ou e-mail?</span>
          <p className="mt-3 text-sm leading-relaxed text-[#666]">Esses dados são alterados pela equipe Space Light, para manter documentos e acesso consistentes.</p>
          <a href="https://wa.me/5511941318646?text=Ol%C3%A1%2C%20preciso%20atualizar%20um%20dado%20cadastral%20da%20minha%20empresa." target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8a6107] hover:text-black"><Phone className="size-4" /> Falar com a Space Light</a>
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
                return <button key={id} type="button" onClick={() => setSection(id)} className={`flex h-12 w-full items-center gap-3 px-3 text-left text-[11px] font-extrabold uppercase tracking-[0.11em] transition ${active ? 'bg-[#f2ad19] text-black' : 'text-white/62 hover:bg-white/8 hover:text-white'}`}><Icon className="size-4" />{label}<ChevronRight className={`ml-auto size-4 ${active ? 'opacity-100' : 'opacity-20'}`} /></button>;
              })}
            </nav>
            <div className="mt-7 border border-white/10 p-4"><div className="flex items-center gap-3"><UserRound className="size-5 text-[#f2ad19]" /><div className="min-w-0"><strong className="block truncate text-xs">{user.name}</strong><span className="mt-1 block truncate text-[9px] uppercase tracking-[0.12em] text-white/40">{user.email}</span></div></div></div>
          </div>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Navegação móvel da Área do Cliente" className="grid grid-cols-6 overflow-x-auto border-b border-black/10 bg-white lg:hidden">
            {navigation.map(({ id, shortLabel, icon: Icon }) => {
              const active = section === id;
              return <button key={id} type="button" onClick={() => setSection(id)} aria-label={sectionCopy[id].title} className={`flex min-w-[74px] flex-col items-center gap-1.5 border-r border-black/8 px-2 py-3 text-[9px] font-extrabold uppercase tracking-[0.12em] ${active ? 'bg-[#f2ad19] text-black' : 'text-[#666]'}`}><Icon className="size-4" />{shortLabel}</button>;
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
