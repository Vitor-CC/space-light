'use client';

import { Award, Building2, CalendarDays, FileUp, Inbox, LayoutGrid, QrCode, RefreshCw, SlidersHorizontal, UsersRound } from 'lucide-react';
import { useCallback, useState } from 'react';

import { CompanyCertificates } from '@/components/company-portal/company-certificates';
import { CompanyClients } from '@/components/company-portal/company-clients';
import { CompanyDashboard } from '@/components/company-portal/company-dashboard';
import { CompanyFiles } from '@/components/company-portal/company-files';
import { CompanyInstructors } from '@/components/company-portal/company-instructors';
import { CompanyParticipants } from '@/components/company-portal/company-participants';
import { CompanyRequests, solicitacoesAbertas } from '@/components/company-portal/company-requests';
import { CompanySettings } from '@/components/company-portal/company-settings';
import { CompanyTrainings } from '@/components/company-portal/company-trainings';
import type { NovaTurmaPreset } from '@/components/company-portal/company-topo';
import { SectionHeading } from '@/components/company-portal/company-ui';
import type { CompanySection } from '@/components/company-portal/company-ui';
import { BotaoIcone } from '@/components/ds/base';
import { Aviso, PortalShell, useAviso } from '@/components/ds/interativo';
import type { CompanyDashboardData } from '@/lib/company-types';
import { readMockCompanyDatabase } from '@/lib/mock-company-database';

/** Seções que desenham o próprio cabeçalho (as demais usam o SectionHeading). */
const COM_CABECALHO_PROPRIO: CompanySection[] = ['dashboard', 'clients', 'trainings', 'certificates', 'requests', 'settings'];

export function CompanyPortal({ initialData }: { initialData: CompanyDashboardData }) {
  const [section, setSection] = useState<CompanySection>('dashboard');
  const [turmaAlvo, setTurmaAlvo] = useState<string | null>(null);
  const [vistaTurmas, setVistaTurmas] = useState<'agenda' | 'criar' | null>(null);
  const [presetTurma, setPresetTurma] = useState<NovaTurmaPreset | null>(null);
  const [data, setData] = useState<CompanyDashboardData>(initialData);
  const [aviso, setAviso] = useAviso(6000);
  const [atualizando, setAtualizando] = useState(false);

  // Ir para uma seção, opcionalmente já abrindo uma turma. Entrar pelo menu
  // limpa o alvo, senão a turma reabriria na próxima visita à seção.
  const irPara = useCallback((destino: CompanySection, trainingId?: string, vista?: 'agenda' | 'criar', preset?: NovaTurmaPreset) => {
    // Funcionários e Atividade moram em Configurações.
    const alvo = destino === 'team' || destino === 'audit' ? 'settings' : destino;
    setTurmaAlvo(trainingId ?? null);
    setVistaTurmas(vista ?? null);
    setPresetTurma(preset ?? null);
    setSection(alvo);
    window.scrollTo({ top: 0 });
  }, []);

  const reload = useCallback(async () => {
    setAtualizando(true);
    try { setData(await readMockCompanyDatabase()); } finally { setAtualizando(false); }
  }, []);

  const abertas = solicitacoesAbertas(data);
  const aguardando = data.trainings.filter((t) => t.status === 'completed' && !t.certificate_generated_at).length;
  const itens = [
    { id: 'dashboard' as const, rotulo: 'Painel', icone: <LayoutGrid /> },
    { id: 'trainings' as const, rotulo: 'Turmas', icone: <CalendarDays /> },
    { id: 'clients' as const, rotulo: 'Clientes', icone: <Building2 /> },
    { id: 'instructors' as const, rotulo: 'Instrutores', icone: <UsersRound /> },
    { id: 'certificates' as const, rotulo: 'Certificados', icone: <Award />, selo: aguardando || undefined },
    { id: 'files' as const, rotulo: 'Documentação', icone: <FileUp /> },
    { id: 'participants' as const, rotulo: 'QR e participantes', icone: <QrCode /> },
    { id: 'requests' as const, rotulo: 'Solicitações', icone: <Inbox />, selo: abertas || undefined },
    { id: 'settings' as const, rotulo: 'Configurações', icone: <SlidersHorizontal /> },
  ];

  let conteudo: React.ReactNode = null;
  if (section === 'dashboard') conteudo = <CompanyDashboard data={data} navigate={irPara} />;
  else if (section === 'clients') conteudo = <CompanyClients data={data} reload={reload} notify={setAviso} navegar={irPara} />;
  else if (section === 'instructors') conteudo = <CompanyInstructors data={data} reload={reload} notify={setAviso} />;
  else if (section === 'trainings') conteudo = <CompanyTrainings data={data} reload={reload} notify={setAviso} turmaAlvo={turmaAlvo} vistaInicial={vistaTurmas} presetNova={presetTurma} />;
  else if (section === 'certificates') conteudo = <CompanyCertificates data={data} reload={reload} notify={setAviso} abrirDocumentos={() => irPara('files')} />;
  else if (section === 'files') conteudo = <CompanyFiles data={data} reload={reload} notify={setAviso} />;
  else if (section === 'participants') conteudo = <CompanyParticipants data={data} reload={reload} notify={setAviso} />;
  else if (section === 'requests') conteudo = <CompanyRequests data={data} reload={reload} notify={setAviso} novaTurma={() => irPara('trainings')} />;
  else if (section === 'settings') conteudo = <CompanySettings data={data} reload={reload} notify={setAviso} />;

  return <PortalShell area="Equipe Space Light" itens={itens} ativo={section} onNavegar={(id) => irPara(id)} usuario={{ nome: data.currentUser.name, detalhe: data.currentUser.jobTitle || data.currentUser.email }} onUsuario={() => irPara('settings')}>
    <div key={`${section}-${turmaAlvo ?? ''}-${vistaTurmas ?? ''}`} className="flex flex-col gap-7">
      {COM_CABECALHO_PROPRIO.includes(section) ? null : <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><SectionHeading section={section} /></div><BotaoIcone rotulo="Atualizar dados" onClick={() => void reload()} disabled={atualizando}><RefreshCw className={atualizando ? 'animate-spin' : undefined} /></BotaoIcone></div>}
      {conteudo}
    </div>
    <Aviso texto={aviso} onFechar={() => setAviso('')} />
  </PortalShell>;
}
