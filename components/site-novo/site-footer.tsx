import Link from 'next/link';

import { Logo } from '@/components/ds/base';
import { REDES, WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';

const titulo = 'ds-caps text-ds-texto-inv-2';
const lista = 'flex flex-col gap-3.5';
const link = 'doc-focus ds-body-s text-ds-texto-inv decoration-ds-amarelo decoration-2 underline-offset-4 hover:underline';

/** Rodapé do Figma ("Site / Footer"): marca à esquerda, quatro colunas de links e a linha de base. */
export function SiteFooter() {
  return (
    <footer className="dark bg-ds-inverso text-ds-texto-inv">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-16 px-5 pt-16 pb-10 md:px-10 lg:gap-[72px] lg:pt-24 xl:px-[120px]">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="flex max-w-[340px] flex-col gap-5">
            <Logo cor="claro" />
            <p className="ds-body-s text-ds-texto-inv-2">Treinamentos corporativos em Normas Regulamentadoras. Base em São Paulo, atendimento em âmbito nacional.</p>
          </div>

          <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2 xl:flex xl:gap-16">
            <nav aria-label="Páginas" className={lista}>
              <p className={titulo}>Páginas</p>
              <Link href={rotas.inicio} className={link}>Início</Link>
              <Link href={rotas.treinamentos} className={link}>Treinamentos</Link>
              <Link href={rotas.comoTrabalhamos} className={link}>Como trabalhamos</Link>
              <Link href={rotas.portalCliente} className={link}>Portal do cliente</Link>
              <Link href={rotas.contato} className={link}>Solicitar proposta</Link>
            </nav>

            <nav aria-label="Treinamentos" className={lista}>
              <p className={titulo}>Treinamentos</p>
              {NORMAS.map((norma) => <Link key={norma.slug} href={rotas.norma(norma.slug)} className={link}>{norma.codigo} · {norma.nome}</Link>)}
            </nav>

            <nav aria-label="Portais" className={lista}>
              <p className={titulo}>Portais</p>
              <Link href={rotas.portalCliente} className={link}>Área do cliente</Link>
              <Link href={rotas.portalInstrutor} className={link}>Área do instrutor</Link>
              <Link href={rotas.portalEmpresa} className={link}>Área da empresa</Link>
            </nav>

            <div className={lista}>
              <p className={titulo}>Contato</p>
              <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={link}>WhatsApp {WHATSAPP.numero}</a>
              <a href={REDES.instagram} target="_blank" rel="noreferrer" className={link}>Instagram</a>
              <a href={REDES.facebook} target="_blank" rel="noreferrer" className={link}>Facebook</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-ds-borda-inv pt-6 ds-caption text-ds-texto-inv-2 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Space Light Engenharia</p>
          <p>Treinamentos em NR com teoria aplicada e prática supervisionada.</p>
        </div>
      </div>
    </footer>
  );
}
