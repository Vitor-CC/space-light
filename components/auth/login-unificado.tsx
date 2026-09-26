'use client';

import { ArrowRight, Building2, ClipboardCheck, MessageCircle, ShieldCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { WHATSAPP_ACESSO, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';
import { Segmentado } from '@/components/ds/interativo';

export type LoginPortal = 'client' | 'instructor' | 'company';

type Perfil = {
  rotulo: string;
  curto?: string;
  icone: React.ReactNode;
  loginPath: string;
  esqueciChave: string;
  campo: string;
  placeholder: string;
  /** Cliente entra com o nome de usuário criado pela Space, não com e-mail. */
  porUsuario?: boolean;
};

const perfis: Record<LoginPortal, Perfil> = {
  client: { rotulo: 'Cliente', icone: <Building2 />, loginPath: '/cliente/login', esqueciChave: 'cliente', campo: 'Nome de usuário', placeholder: 'ex.: empresaexemplo1', porUsuario: true },
  instructor: { rotulo: 'Instrutor', icone: <ClipboardCheck />, loginPath: '/instrutor/login', esqueciChave: 'instrutor', campo: 'E-mail', placeholder: 'nome@email.com.br' },
  company: { rotulo: 'Equipe Space', curto: 'Equipe', icone: <ShieldCheck />, loginPath: '/empresa/login', esqueciChave: 'empresa', campo: 'E-mail', placeholder: 'voce@spacelightengenharia.com.br' },
};

const mensagens: Record<string, { tom: 'perigo' | 'sinal' | 'sucesso'; texto: string }> = {
  invalid: { tom: 'perigo', texto: 'E-mail ou senha incorretos. Confira os dados e tente de novo.' },
  pending: { tom: 'sinal', texto: 'Seu cadastro aguarda a aprovação da Space Light.' },
  registered: { tom: 'sucesso', texto: 'Cadastro enviado. A Space Light aprova antes do primeiro acesso.' },
  login: { tom: 'sinal', texto: 'Entre com seus dados para continuar.' },
  session: { tom: 'sinal', texto: 'Sua sessão expirou. Entre de novo para continuar.' },
  logout: { tom: 'sucesso', texto: 'Você saiu do portal.' },
  'password-updated': { tom: 'sucesso', texto: 'Senha alterada. Entre com a nova senha.' },
};

export function LoginUnificado({ portal, status }: { portal: LoginPortal; status?: string }) {
  const [ativo, setAtivo] = useState<LoginPortal>(portal);
  const [manter, setManter] = useState(false);
  const perfil = perfis[ativo];
  // A mensagem é da tentativa anterior, feita no perfil em que a página abriu.
  const base = status && ativo === portal ? mensagens[status] : undefined;
  const aviso = base && status === 'invalid' && perfil.porUsuario
    ? { ...base, texto: 'Nome de usuário ou senha incorretos. Confira os dados e tente de novo.' }
    : base;

  return <div className="flex flex-col gap-6">
    <TituloAcesso titulo="Acesse sua área" texto={`Escolha seu perfil e entre com o ${perfil.porUsuario ? 'nome de usuário' : 'e-mail'} cadastrado.`} />
    <Segmentado rotulo="Perfil de acesso" ativa={ativo} onChange={setAtivo} opcoes={(Object.keys(perfis) as LoginPortal[]).map((id) => ({ id, rotulo: perfis[id].rotulo, curto: perfis[id].curto, icone: perfis[id].icone }))} />
    {aviso ? <Faixa tom={aviso.tom}>{aviso.texto}</Faixa> : null}
    <form action="/api/auth/login" method="post" className="flex flex-col gap-6">
      <input type="hidden" name="loginPath" value={perfil.loginPath} />
      <Campo rotulo={perfil.campo}>
        <input key={ativo} name="login" type={perfil.porUsuario ? 'text' : 'email'} autoComplete={perfil.porUsuario ? 'username' : 'email'} autoCapitalize="none" spellCheck={false} required placeholder={perfil.placeholder} className={campoClasses} />
      </Campo>
      <Campo rotulo="Senha">
        <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className={campoClasses} />
      </Campo>
      <div className="flex items-center justify-between gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 ds-body-s text-ds-texto-2">
          <input type="checkbox" name="manter" value="1" checked={manter} onChange={(e) => setManter(e.target.checked)} className="size-4 accent-ds-inverso" />
          Manter conectado
        </label>
        <Link href={`/esqueci-senha?portal=${perfil.esqueciChave}`} className="ds-body-s font-medium text-ds-amarelo-texto hover:underline underline-offset-4">Esqueci minha senha</Link>
      </div>
      <button type="submit" className={botaoClasses('primario', 'L', 'w-full')}>Entrar <ArrowRight /></button>
    </form>
    {ativo === 'instructor' ? <Link href="/instrutor/cadastro" className="flex items-center gap-3 rounded-lg border border-ds-borda p-4 transition-colors hover:border-ds-borda-forte">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ds-amarelo-suave"><UserPlus className="size-4" /></span>
      <span className="min-w-0 flex-1"><strong className="block ds-body-s font-semibold">Ainda não tem acesso?</strong><span className="block ds-caption text-ds-texto-2">Cadastre-se como instrutor para análise da Space Light.</span></span>
      <ArrowRight className="size-4 shrink-0" />
    </Link> : null}
    <a href={WHATSAPP_ACESSO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 ds-caption text-ds-texto-2 hover:text-ds-texto">
      <MessageCircle className="size-4" /> Problemas para entrar? Fale com a Space pelo WhatsApp.
    </a>
  </div>;
}
