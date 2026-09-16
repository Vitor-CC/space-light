import Image from 'next/image';
import Link from 'next/link';

import { REDES, WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';

const titulo = 'pb-3 font-doc-mono text-xs text-doc-ink-muted';
const lista = 'grid gap-2.5';
const link =
  'doc-focus text-sm decoration-sl-gold decoration-2 underline-offset-4 hover:underline';

/** Rodapé na mesma grade do documento: a linha da margem desce até o fim. */
export function SiteFooter() {
  return (
    <footer className="bg-doc-paper text-doc-ink">
      <div className="doc-shell">
        <div className="doc-grid border-t border-doc-rule-strong">
          <div className="pt-10 lg:pt-12 lg:pr-8">
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt="Space Light Engenharia"
              width={260}
              height={49}
              className="h-7 w-auto"
            />
          </div>

          <div className="min-w-0 pt-6 pb-10 lg:border-l lg:border-doc-rule-strong lg:pt-12 lg:pl-12">
            <p className="max-w-measure text-sm leading-relaxed text-doc-ink-muted">
              Treinamentos corporativos em Normas Regulamentadoras. Base em São
              Paulo, atendimento em âmbito nacional.
            </p>

            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
              <nav aria-label="Páginas">
                <p className={titulo}>Páginas</p>
                <ul className={lista}>
                  <li>
                    <Link href={rotas.inicio} className={link}>
                      Início
                    </Link>
                  </li>
                  <li>
                    <Link href={rotas.comoTrabalhamos} className={link}>
                      Como trabalhamos
                    </Link>
                  </li>
                  <li>
                    <Link href={rotas.contato} className={link}>
                      Solicitar proposta
                    </Link>
                  </li>
                </ul>
              </nav>

              <nav aria-label="Treinamentos">
                <p className={titulo}>Treinamentos</p>
                <ul className={lista}>
                  {NORMAS.map((norma) => (
                    <li key={norma.slug}>
                      <Link
                        href={rotas.norma(norma.slug)}
                        className="doc-focus group flex items-baseline gap-3 text-sm"
                      >
                        <span className="w-12 shrink-0 font-doc-mono text-xs font-semibold text-doc-mark">
                          {norma.codigo}
                        </span>
                        <span className="decoration-sl-gold decoration-2 underline-offset-4 group-hover:underline">
                          {norma.nome}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label="Portais">
                <p className={titulo}>Portais</p>
                <ul className={lista}>
                  <li>
                    <Link href={rotas.portalCliente} className={link}>
                      Área do cliente
                    </Link>
                  </li>
                  <li>
                    <Link href={rotas.portalInstrutor} className={link}>
                      Área do instrutor
                    </Link>
                  </li>
                  <li>
                    <Link href={rotas.portalEmpresa} className={link}>
                      Área da empresa
                    </Link>
                  </li>
                </ul>
              </nav>

              <div>
                <p className={titulo}>Contato</p>
                <ul className={lista}>
                  <li>
                    <a
                      href={WHATSAPP.link}
                      target="_blank"
                      rel="noreferrer"
                      className={link}
                    >
                      WhatsApp{' '}
                      <span className="font-doc-mono text-xs tabular-nums">
                        {WHATSAPP.numero}
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={REDES.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className={link}
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href={REDES.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className={link}
                    >
                      Facebook
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-12 border-t border-doc-rule-strong pt-5 font-doc-mono text-xs text-doc-ink-muted">
              © Space Light Engenharia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
