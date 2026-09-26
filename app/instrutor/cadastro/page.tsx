import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { MolduraAcesso, TituloAcesso } from '@/components/auth/moldura-acesso';
import { botaoClasses, Campo, campoClasses, Faixa } from '@/components/ds/base';

const messages: Record<string, string> = {
  weak: 'Crie uma senha com pelo menos 10 caracteres.',
  mismatch: 'As duas senhas precisam ser iguais.',
  required: 'Preencha todos os campos obrigatórios.',
  exists: 'Já existe um cadastro com este CPF ou e-mail. Fale com a Space Light.',
};

export const dynamic = 'force-dynamic';

export default async function InstructorRegistrationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = status ? messages[status] : '';
  const fields = [
    ['name', 'Nome completo', 'Nome do instrutor', 'text', 'name'],
    ['document', 'CPF', '000.000.000-00', 'text', 'off'],
    ['email', 'E-mail', 'nome@email.com.br', 'email', 'email'],
    ['phone', 'Telefone / WhatsApp', '(11) 99999-9999', 'tel', 'tel'],
    ['professionalRegistry', 'Registro profissional', 'Registro, conselho ou habilitação', 'text', 'off'],
    ['baseCity', 'Cidade base', 'São Paulo/SP', 'text', 'address-level2'],
  ] as const;
  return <MolduraAcesso largura={560} sobretitulo="Área do instrutor" titulo="Registre suas turmas em campo, do QR ao certificado." texto="Depois do cadastro, a Space Light confere seus dados e documentos e libera o acesso às turmas atribuídas a você.">
    <div className="flex flex-col gap-6">
      <TituloAcesso titulo="Cadastro do instrutor" texto="Envie seus dados para análise. Você entra assim que a Space Light aprovar." />
      {message ? <Faixa tom="perigo">{message}</Faixa> : null}
      <form action="/api/auth/register-instructor" method="post" className="grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, placeholder, type, auto]) => <Campo key={name} rotulo={label} className={name === 'name' ? 'sm:col-span-2' : undefined}>
          <input name={name} type={type} required autoComplete={auto} placeholder={placeholder} className={campoClasses} />
        </Campo>)}
        <Campo rotulo="Especialidades / NRs" className="sm:col-span-2"><input name="specialties" required placeholder="Ex.: NR 10, NR 33, NR 35" className={campoClasses} /></Campo>
        <Campo rotulo="Crie uma senha" ajuda="Mínimo de 10 caracteres."><input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <Campo rotulo="Repita a senha"><input name="passwordConfirmation" type="password" minLength={10} required autoComplete="new-password" placeholder="••••••••••" className={campoClasses} /></Campo>
        <button type="submit" className={botaoClasses('primario', 'L', 'w-full sm:col-span-2')}>Enviar para aprovação</button>
      </form>
      <Link href="/instrutor/login" className="inline-flex w-fit items-center gap-2 ds-body-s font-medium text-ds-texto hover:underline underline-offset-4"><ArrowLeft className="size-4" />Voltar para o login</Link>
    </div>
  </MolduraAcesso>;
}
