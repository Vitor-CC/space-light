import type { Metadata } from 'next';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import Link from 'next/link';

import { MolduraAcesso, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';
import { isMailerConfigured } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Esqueci minha senha | Space Light Engenharia',
  description: 'Recupere o acesso ao portal da Space Light Engenharia.',
  robots: { index: false, follow: false },
};

const WHATSAPP = 'https://wa.me/5511941318646?text=Ol%C3%A1%2C%20esqueci%20a%20senha%20do%20Portal%20Space%20Light.%20Meu%20e-mail%20de%20acesso%20%C3%A9%3A%20';

const loginPaths: Record<string, string> = {
  instrutor: '/instrutor/login',
  empresa: '/empresa/login',
  cliente: '/cliente/login',
};

const notices: Record<string, { tom: 'sucesso' | 'perigo'; texto: string }> = {
  sent: { tom: 'sucesso', texto: 'Se existir uma conta com esse e-mail, o link para criar uma nova senha acabou de ser enviado. Veja também o spam: o link vale por 60 minutos.' },
  invalid: { tom: 'perigo', texto: 'Informe o e-mail que você usa para entrar no portal.' },
  expired: { tom: 'perigo', texto: 'Aquele link expirou ou já tinha sido usado. Peça um novo abaixo.' },
  unavailable: { tom: 'perigo', texto: 'O envio automático está indisponível no momento. Fale com a Space Light pelo WhatsApp que a equipe redefine sua senha.' },
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ portal?: string; status?: string }> }) {
  const { portal, status } = await searchParams;
  const loginPath = loginPaths[portal ?? ''] ?? '/cliente/login';
  const notice = status ? notices[status] : undefined;
  const selfService = isMailerConfigured();

  return <MolduraAcesso sobretitulo="Recuperação de acesso" titulo="Sua senha nova em poucos minutos." texto="Clientes, instrutores e equipe recuperam o acesso pelo e-mail cadastrado ou falando direto com a Space Light.">
    <div className="flex flex-col gap-6">
      <TituloAcesso titulo="Esqueceu a senha?" texto={selfService ? 'Informe o e-mail que você usa para entrar. Enviamos um link para você criar uma senha nova.' : 'Fale com a equipe da Space Light: ela gera uma senha temporária na hora, e você cria a sua no primeiro acesso.'} />
      {notice ? <Faixa tom={notice.tom}>{notice.texto}</Faixa> : null}

      {selfService ? <form action="/api/auth/forgot-password" method="post" className="flex flex-col gap-6">
        {portal ? <input type="hidden" name="portal" value={portal} /> : null}
        <Campo rotulo="E-mail de acesso" ajuda="Por segurança, a mesma mensagem aparece exista ou não uma conta com esse e-mail.">
          <input name="email" type="email" autoComplete="email" required placeholder="nome@empresa.com.br" className={campoClasses} />
        </Campo>
        <button type="submit" className={botaoClasses('primario', 'L', 'w-full')}>Enviar link</button>
      </form> : null}

      <div className="flex flex-col gap-2.5">
        {selfService ? <span className="ds-caps text-ds-texto-2">Se preferir falar com alguém</span> : null}
        <a href={WHATSAPP} target="_blank" rel="noreferrer" className={botaoClasses(selfService ? 'secundario' : 'primario', 'M', 'w-full justify-start')}><MessageCircle />Falar no WhatsApp</a>
        <a href="tel:+5511941318646" className={botaoClasses('fantasma', 'M', 'w-full justify-start')}><Phone />+55 11 94131-8646</a>
      </div>

      <p className="ds-caption text-ds-texto-2">É da equipe da Space Light? O dono da conta também redefine seu acesso em Configurações, na parte de funcionários.</p>
      <Link href={loginPath} className="inline-flex w-fit items-center gap-2 ds-body-s font-medium text-ds-texto hover:underline underline-offset-4"><ArrowLeft className="size-4" />Voltar para o login</Link>
    </div>
  </MolduraAcesso>;
}
