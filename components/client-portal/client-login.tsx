import Image from 'next/image';
import Link from 'next/link';

import { botao, botaoTexto, campo, rotulo } from '@/components/portal/kit';

export type LoginPortal = 'client' | 'instructor' | 'company';

const messages: Record<string, string> = {
  invalid: 'E-mail ou senha incorretos. Confira e tente de novo.',
  pending: 'Seu cadastro aguarda aprovação da Space Light.',
  registered:
    'Cadastro enviado. A Space Light aprova antes do primeiro acesso.',
  login: 'Entre para continuar.',
  session: 'Sua sessão expirou. Entre de novo.',
  logout: 'Você saiu.',
};

/** Na porta da empresa o login é o nome de usuário, não o e-mail. */
const usernameMessages: Record<string, string> = {
  invalid: 'Nome de usuário ou senha incorretos. Confira e tente de novo.',
};

type PortalCopy = {
  loginPath: string;
  forgotKey: string;
  area: string;
  emailLabel: string;
  register: { href: string; label: string } | null;
  /** A empresa entra pelo nome de usuário criado pela Space. */
  usernameLogin?: boolean;
};

const portals: Record<LoginPortal, PortalCopy> = {
  client: {
    loginPath: '/cliente/login',
    forgotKey: 'cliente',
    area: 'Portal do cliente',
    emailLabel: 'Nome de usuário',
    register: null,
    usernameLogin: true,
  },
  instructor: {
    loginPath: '/instrutor/login',
    forgotKey: 'instrutor',
    area: 'Área do instrutor',
    emailLabel: 'E-mail',
    register: {
      href: '/instrutor/cadastro',
      label: 'Quero me cadastrar como instrutor',
    },
  },
  company: {
    loginPath: '/empresa/login',
    forgotKey: 'empresa',
    area: 'Equipe Space Light',
    emailLabel: 'E-mail',
    register: null,
  },
};

export function ClientLogin({
  status,
  portal = 'client',
}: {
  status?: string;
  portal?: LoginPortal;
}) {
  const copy = portals[portal];
  const message =
    copy.usernameLogin && status === 'invalid'
      ? usernameMessages.invalid
      : status
        ? messages[status]
        : '';
  return (
    <main className="doc-ui flex min-h-dvh flex-col bg-doc-paper text-doc-ink">
      <header className="border-b border-doc-rule-strong">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-4 md:px-8">
          <Link
            href="/"
            aria-label="Space Light Engenharia — site"
            className="doc-focus"
          >
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt=""
              width={260}
              height={49}
              className="h-6 w-auto"
            />
          </Link>
          <Link href="/entrar" className={botaoTexto}>
            Outra área
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-12 md:items-center">
        <div className="w-full max-w-md">
          <p className="font-doc-mono text-xs text-doc-mark">{copy.area}</p>
          <h1 className="mt-2 font-heading text-4xl leading-none font-extrabold uppercase">
            Entrar
          </h1>
          {message ? (
            <output className="mt-6 block border-l-4 border-sl-gold py-1 pl-4 text-sm font-semibold">
              {message}
            </output>
          ) : null}
          <form
            action="/api/auth/login"
            method="post"
            className="mt-8 space-y-5"
          >
            <input type="hidden" name="loginPath" value={copy.loginPath} />
            <label className="block">
              <span className={rotulo}>{copy.emailLabel}</span>
              <input
                name="login"
                type={copy.usernameLogin ? 'text' : 'email'}
                autoComplete={copy.usernameLogin ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
                required
                className={campo}
              />
            </label>
            <label className="block">
              <span className={rotulo}>Senha</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={campo}
              />
            </label>
            <button
              type="submit"
              className={botao({ tamanho: 'lg', className: 'w-full' })}
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 flex flex-col items-start gap-3">
            <Link
              href={`/esqueci-senha?portal=${copy.forgotKey}`}
              className={botaoTexto}
            >
              Esqueci minha senha
            </Link>
            {copy.register ? (
              <Link href={copy.register.href} className={botaoTexto}>
                {copy.register.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
