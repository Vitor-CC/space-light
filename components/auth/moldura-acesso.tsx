import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/ds/base';

/**
 * Moldura das telas de acesso (Figma "Portal · Entrar"): painel preto da marca
 * à esquerda, com a onda em degradê no pé, e o formulário à direita. No
 * celular o painel some e o logo escuro vai para o topo do formulário.
 */
export function MolduraAcesso({ children, largura = 420, sobretitulo = 'Portais Space Light', titulo = 'Cada turma registrada, do primeiro dia ao certificado.', texto = 'Clientes acompanham presença, fotos, documentos e certificados. Instrutores registram a turma em campo. A equipe Space Light gere tudo em um só lugar.' }: { children: ReactNode; largura?: number; sobretitulo?: string; titulo?: string; texto?: string }) {
  return <main className="flex min-h-screen bg-ds-superficie text-ds-texto">
    <section className="relative hidden w-[min(620px,43vw)] shrink-0 flex-col justify-between overflow-hidden bg-ds-inverso px-16 pt-16 pb-[230px] lg:flex">
      <Link href="/" aria-label="Space Light Engenharia — voltar ao site" className="relative z-10 w-fit"><Logo cor="claro" prioridade /></Link>
      <div className="relative z-10 flex flex-col gap-5">
        <span className="ds-caps text-ds-amarelo">{sobretitulo}</span>
        <p className="ds-h2 text-ds-texto-inv">{titulo}</p>
        <p className="ds-body-m text-ds-texto-inv-2">{texto}</p>
      </div>
      <Image src="/images/branding/portal-onda.svg" alt="" width={620} height={200} unoptimized className="absolute bottom-0 left-0 h-[200px] w-full" />
    </section>
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-ds-borda px-5 py-4 lg:hidden">
        <Link href="/" aria-label="Space Light Engenharia — voltar ao site"><Logo cor="escuro" className="h-9" prioridade /></Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full" style={{ maxWidth: largura }}>{children}</div>
      </div>
    </section>
  </main>;
}

/** Título e apoio do formulário ("Acesse sua área"). */
export function TituloAcesso({ titulo, texto }: { titulo: string; texto?: ReactNode }) {
  return <div className="flex flex-col gap-2">
    <h1 className="ds-h3 text-ds-texto">{titulo}</h1>
    {texto ? <p className="ds-body-s text-ds-texto-2">{texto}</p> : null}
  </div>;
}

export const WHATSAPP_ACESSO = 'https://wa.me/5511941318646?text=Ol%C3%A1%2C%20estou%20com%20problema%20para%20entrar%20no%20portal%20da%20Space%20Light.';
