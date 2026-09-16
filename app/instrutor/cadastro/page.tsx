import Image from 'next/image';
import Link from 'next/link';

import { botao, botaoTexto, campo, rotulo } from '@/components/portal/estilos';

const messages: Record<string, string> = {
  weak: 'Crie uma senha com pelo menos 10 caracteres.',
  mismatch: 'As duas senhas precisam ser iguais.',
  required: 'Preencha todos os campos obrigatórios.',
  exists:
    'Já existe um cadastro com este CPF ou e-mail. Fale com a Space Light.',
};

export const dynamic = 'force-dynamic';

export default async function InstructorRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = status ? messages[status] : '';
  const fields = [
    ['name', 'Nome completo', 'text', 'name'],
    ['document', 'CPF', 'text', 'off'],
    ['email', 'E-mail', 'email', 'email'],
    ['phone', 'Telefone / WhatsApp', 'tel', 'tel'],
    ['professionalRegistry', 'Registro profissional', 'text', 'off'],
    ['baseCity', 'Cidade base', 'text', 'address-level2'],
  ] as const;

  return (
    <main className="doc-ui min-h-dvh bg-doc-paper text-doc-ink">
      <header className="border-b border-doc-rule-strong">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
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
          <Link href="/instrutor/login" className={botaoTexto}>
            Voltar ao login
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-doc-mono text-xs text-doc-mark">Área do instrutor</p>
        <h1 className="mt-2 font-heading text-4xl leading-none font-extrabold uppercase">
          Cadastro de instrutor
        </h1>
        <p className="mt-3 max-w-measure text-doc-ink-muted">
          A Space Light confere os dados e aprova o acesso antes de liberar as
          turmas.
        </p>
        {message ? (
          <p
            role="alert"
            className="mt-6 border-l-4 border-doc-error py-1 pl-4 font-semibold"
          >
            {message}
          </p>
        ) : null}
        <form
          action="/api/auth/register-instructor"
          method="post"
          className="mt-8 grid gap-5 border-t border-doc-ink pt-6 sm:grid-cols-2"
        >
          {fields.map(([name, label, type, autoComplete]) => (
            <label key={name}>
              <span className={rotulo}>{label}</span>
              <input
                name={name}
                type={type}
                required
                autoComplete={autoComplete}
                className={campo}
              />
            </label>
          ))}
          <label className="sm:col-span-2">
            <span className={rotulo}>Especialidades / NRs</span>
            <input
              name="specialties"
              required
              placeholder="Ex.: NR 10, NR 33, NR 35"
              className={campo}
            />
          </label>
          <label>
            <span className={rotulo}>Crie uma senha</span>
            <input
              name="password"
              type="password"
              minLength={10}
              required
              autoComplete="new-password"
              aria-describedby="senha-regra"
              className={campo}
            />
            <span
              id="senha-regra"
              className="mt-1.5 block text-sm text-doc-ink-muted"
            >
              10 caracteres ou mais.
            </span>
          </label>
          <label>
            <span className={rotulo}>Repita a senha</span>
            <input
              name="passwordConfirmation"
              type="password"
              minLength={10}
              required
              autoComplete="new-password"
              className={campo}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={botao({
                tamanho: 'lg',
                className: 'w-full sm:w-auto',
              })}
            >
              Enviar para aprovação
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
