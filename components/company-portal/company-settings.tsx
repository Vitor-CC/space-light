'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import { CompanyAudit } from '@/components/company-portal/company-audit';
import { CompanyTeam } from '@/components/company-portal/company-team';
import { Avatar, Botao, Campo, campoClasses, Cartao, TopoDePagina } from '@/components/ds/base';
import { Abas } from '@/components/ds/interativo';
import type { CompanyDashboardData } from '@/lib/company-types';
import { saveEmployeeJobTitle } from '@/lib/mock-company-database';

type Aba = 'perfil' | 'equipe' | 'atividade';

/** Configurações: o próprio perfil para todos; equipe e atividade só para o dono. */
export function CompanySettings({ data, reload, notify }: { data: CompanyDashboardData; reload: () => Promise<void>; notify: (m: string) => void }) {
  const dono = data.currentUser.isOwner;
  const [aba, setAba] = useState<Aba>('perfil');
  const [cargo, setCargo] = useState(data.currentUser.jobTitle);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    try { await saveEmployeeJobTitle(data.currentUser.id, cargo); notify('Cargo salvo.'); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Erro ao salvar o cargo.'); }
    finally { setSalvando(false); }
  }

  return <div className="flex flex-col gap-6">
    <TopoDePagina titulo="Configurações" subtitulo={dono ? 'Seu perfil, os acessos da equipe e o histórico de atividade.' : 'Seu perfil de acesso à gestão.'} />
    {dono ? <Abas rotulo="Configurações" ativa={aba} onChange={setAba} abas={[{ id: 'perfil', rotulo: 'Meu perfil' }, { id: 'equipe', rotulo: 'Funcionários' }, { id: 'atividade', rotulo: 'Atividade' }]} /> : null}
    {aba === 'perfil' ? <Cartao className="max-w-2xl p-5 sm:p-7">
      <div className="flex items-center gap-4 border-b border-ds-borda pb-5"><Avatar nome={data.currentUser.name} tamanho={48} /><div><h2 className="ds-h4">{data.currentUser.name}</h2><p className="ds-body-s text-ds-texto-2">{data.currentUser.email}{dono ? ' · dono da conta' : ''}</p></div></div>
      <form onSubmit={salvar} className="mt-5 flex flex-col gap-5">
        <Campo rotulo="Cargo" ajuda="Aparece no pé do menu da gestão."><input value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={80} placeholder="Ex.: Diretora administrativa" className={campoClasses} /></Campo>
        <div><Botao type="submit" disabled={salvando || cargo === data.currentUser.jobTitle}>{salvando ? <Loader2 className="animate-spin" /> : <Check />}Salvar</Botao></div>
      </form>
      <p className="mt-6 border-t border-ds-borda pt-4 ds-caption text-ds-texto-2">Para trocar a senha, use “Esqueci minha senha” na tela de login{dono ? '' : ' ou peça ao dono da conta'}.</p>
    </Cartao> : null}
    {dono && aba === 'equipe' ? <CompanyTeam notify={notify} /> : null}
    {dono && aba === 'atividade' ? <CompanyAudit notify={notify} /> : null}
  </div>;
}
