import { ArrowDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { botao, linhaDeBotoes } from '@/components/site-novo/botao';
import { Confirmar } from '@/components/site-novo/confirmar';
import { DocSection } from '@/components/site-novo/doc-section';
import { Figura } from '@/components/site-novo/figura';
import { FormularioProposta } from '@/components/site-novo/formulario-proposta';
import { ListaDeItens } from '@/components/site-novo/lista-de-itens';
import { ListaSimples } from '@/components/site-novo/lista-simples';
import { grade, texto } from '@/components/site-novo/texto';
import { WHATSAPP } from '@/lib/site-novo/contato';
import {
  NORMAS,
  OPCOES_DE_TREINAMENTO,
  type NormaComPagina,
  type PaginaDaNorma,
} from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

const legendaDeTabela =
  'caption-top pb-3 text-left font-doc-mono text-xs text-doc-ink-muted';

/**
 * Página de uma norma. Um template só para as sete: o conteúdo vem de
 * `lib/site-novo/normas.ts`. A ordem segue o briefing — cabeçalho, o que a
 * norma exige, para quem é, como a Space aplica, ficha técnica, outras normas
 * e proposta.
 */
export function PaginaDeNorma({ norma }: { norma: NormaComPagina }) {
  const { pagina } = norma;
  const outras = NORMAS.filter((item) => item.slug !== norma.slug);
  const numeroDaFicha = pagina.programa ? 2 : 1;

  // Ao lado das etapas: a grade oficial da Space, quando transcrita, ou o
  // conteúdo mínimo que a própria norma define. Sem nenhum dos dois, as etapas
  // ocupam a largura toda.
  const complemento = pagina.programa ? (
    <TabelaDePrograma programa={pagina.programa} />
  ) : pagina.conteudoMinimo ? (
    <div>
      <p className="pb-3 font-doc-mono text-xs text-doc-ink-muted">
        {pagina.conteudoMinimo.legenda}
      </p>
      <ListaSimples itens={pagina.conteudoMinimo.itens} />
    </div>
  ) : null;

  return (
    <>
      <DocSection numero="01" rotulo="Norma" tom="preto">
        <nav aria-label="Trilha" className={texto.rotulo}>
          <ol className="flex flex-wrap gap-x-2">
            <li>
              <Link
                href={rotas.inicio}
                className="doc-focus hover:text-doc-ink"
              >
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={rotas.treinamentos}
                className="doc-focus hover:text-doc-ink"
              >
                Treinamentos
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-doc-ink">
              {norma.codigo}
            </li>
          </ol>
        </nav>

        <h1 className="mt-8">
          <span className="block font-doc-mono text-[clamp(3.5rem,2.5rem+4vw,6.5rem)] leading-none font-semibold tracking-tight text-doc-mark">
            {norma.codigo}
          </span>
          <span className={cn(texto.tituloSecao, 'mt-4 block')}>
            {norma.nome}
          </span>
        </h1>

        <div className={cn(grade.duas, 'mt-6 lg:mt-10')}>
          <div>
            <p className={texto.apoio}>{pagina.exige}</p>
            <div className={cn(linhaDeBotoes, 'mt-8')}>
              <Link href="#proposta" className={botao({ tamanho: 'lg' })}>
                Solicitar proposta
              </Link>
              <Link
                href="#ficha-tecnica"
                className={botao({ variante: 'contorno', tamanho: 'lg' })}
              >
                Ver ficha técnica
                <ArrowDown className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <Figura
            src={pagina.figura.src}
            alt={pagina.figura.alt}
            legenda={pagina.figura.legenda}
            sizes="(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 100vw"
            prioridade
          />
        </div>
      </DocSection>

      <DocSection id="o-que-exige" numero="02" rotulo="O que exige">
        <h2 className={texto.tituloSecao}>O que a norma exige</h2>
        <div className={cn(grade.duas, 'mt-6 lg:mt-10')}>
          <div className="space-y-4">
            {pagina.exigencias.map((paragrafo) => (
              <p key={paragrafo} className={texto.corpo}>
                {paragrafo}
              </p>
            ))}
          </div>
          <ListaSimples itens={pagina.pontos} />
        </div>
        {pagina.aviso ? (
          <p className="mt-8 max-w-measure border-l-2 border-sl-gold pl-4 text-base leading-relaxed">
            {pagina.aviso}
          </p>
        ) : null}
        <ul className="mt-8 space-y-2">
          {pagina.fontes.map((fonte) => (
            <li key={fonte.url} className={texto.rotulo}>
              Fonte:{' '}
              <a
                href={fonte.url}
                target="_blank"
                rel="noreferrer"
                className="doc-focus text-doc-ink underline decoration-sl-gold decoration-2 underline-offset-4"
              >
                {fonte.rotulo}
              </a>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="para-quem" numero="03" rotulo="Para quem é" tom="folha">
        <h2 className={texto.tituloSecao}>Para quem é</h2>
        <div className={cn(grade.duas, 'mt-8')}>
          <div>
            <h3 className={texto.rotulo}>Funções</h3>
            <ListaSimples className="mt-3" itens={pagina.funcoes} />
          </div>
          <div>
            <h3 className={texto.rotulo}>Situações</h3>
            <ListaSimples className="mt-3" itens={pagina.situacoes} />
          </div>
        </div>
      </DocSection>

      <DocSection
        id="como-aplicamos"
        numero="04"
        rotulo="Como aplicamos"
        tom="grafite"
      >
        <h2 className={texto.tituloSecao}>Como a Space aplica</h2>
        {complemento ? (
          <div className={cn(grade.duas, 'mt-8 lg:items-start')}>
            <ListaDeItens numerada compacta itens={pagina.aplicacao} />
            {complemento}
          </div>
        ) : (
          <ListaDeItens numerada className="mt-8" itens={pagina.aplicacao} />
        )}

        <Link
          href={rotas.comoTrabalhamos}
          className={cn(texto.link, 'mt-10 inline-flex items-center gap-1.5')}
        >
          Conhecer o método completo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </DocSection>

      <DocSection id="ficha-tecnica" numero="05" rotulo="Ficha técnica">
        <h2 className={texto.tituloSecao}>Ficha técnica</h2>
        <table className="mt-8 w-full border-collapse text-left lg:max-w-3xl">
          <caption className={legendaDeTabela}>
            Tabela {numeroDaFicha}. Ficha técnica da {norma.codigo}
          </caption>
          <tbody data-surgir className="border-t border-doc-ink">
            {[
              ['Carga horária', `carga horária da ${norma.codigo}`],
              [
                'Periodicidade de reciclagem',
                `periodicidade de reciclagem da ${norma.codigo}`,
              ],
              ['Modalidade', `modalidades oferecidas para a ${norma.codigo}`],
              ['Tamanho de turma', `tamanho de turma da ${norma.codigo}`],
            ].map(([rotulo, pendencia]) => (
              <tr key={rotulo} className="border-b border-doc-rule-strong">
                <th
                  scope="row"
                  className="w-2/5 py-4 pr-4 align-top text-sm leading-snug font-semibold lg:text-base"
                >
                  {rotulo}
                </th>
                <td className="py-4 align-top">
                  <Confirmar>{pendencia}</Confirmar>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>

      <DocSection
        id="outras-normas"
        numero="06"
        rotulo="Outras normas"
        tom="folha"
      >
        <h2 className={texto.tituloSecao}>Outras normas</h2>
        <ul
          data-surgir
          className="mt-8 border-t border-doc-ink md:grid md:grid-cols-2 md:gap-x-10"
        >
          {outras.map((item) => (
            <li key={item.slug} className="border-b border-doc-rule-strong">
              <Link
                href={rotas.norma(item.slug)}
                className="doc-focus group flex items-center gap-4 py-4"
              >
                <span className="w-16 shrink-0 font-doc-mono text-base font-semibold text-doc-mark">
                  {item.codigo}
                </span>
                <span className="min-w-0 flex-1 font-semibold decoration-sl-gold decoration-2 underline-offset-4 group-hover:underline">
                  {item.nome}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="proposta" numero="07" rotulo="Proposta" tom="folha">
        <h2 className={cn(texto.tituloSecao, 'max-w-[22ch]')}>
          Conte o treinamento que a sua empresa precisa.
        </h2>
        <p className={cn(texto.apoio, 'mt-6')}>
          Preencha o formulário com o essencial e a Space Light retorna com a
          proposta e o caminho recomendado.
        </p>
        <p className={cn(texto.apoio, 'mt-4')}>
          Quer falar agora?{' '}
          <a
            href={WHATSAPP.link}
            target="_blank"
            rel="noreferrer"
            className={texto.link}
          >
            Falar no WhatsApp
          </a>
        </p>
        {/* A norma da página já vem marcada no formulário. */}
        <div className="mt-10 max-w-4xl">
          <FormularioProposta
            treinamentos={OPCOES_DE_TREINAMENTO}
            preSelecionados={[norma.slug]}
            origem={rotas.norma(norma.slug)}
          />
        </div>
      </DocSection>
    </>
  );
}

/** Grade oficial da Space, módulo a módulo, marcando onde há prática. */
function TabelaDePrograma({
  programa,
}: {
  programa: NonNullable<PaginaDaNorma['programa']>;
}) {
  return (
    <div>
      <table className="w-full border-collapse text-left">
        <caption className={legendaDeTabela}>{programa.legenda}</caption>
        <thead>
          <tr className="border-t border-b border-t-doc-ink border-b-doc-rule-strong text-doc-ink-muted">
            <th
              scope="col"
              className="w-10 py-3 font-doc-mono text-xs font-medium"
            >
              Nº
            </th>
            <th
              scope="col"
              className="px-2 py-3 font-doc-mono text-xs font-medium"
            >
              Módulo
            </th>
            <th
              scope="col"
              className="w-16 py-3 text-right font-doc-mono text-xs font-medium"
            >
              Prática
            </th>
          </tr>
        </thead>
        <tbody data-surgir>
          {programa.modulos.map((linha, indice) => (
            <tr key={linha.modulo} className="border-b border-doc-rule-strong">
              <td className="py-3 align-top font-doc-mono text-xs tabular-nums text-doc-ink-muted">
                {String(indice + 1).padStart(2, '0')}
              </td>
              <th
                scope="row"
                className="px-2 py-3 align-top text-sm leading-snug font-semibold"
              >
                {linha.modulo}
              </th>
              <td className="py-3 pr-3 text-right align-top">
                {linha.pratica ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block size-2 bg-sl-gold"
                    />
                    <span className="sr-only">Sim</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true" className="text-doc-ink-muted">
                      —
                    </span>
                    <span className="sr-only">Não</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn(texto.rotulo, 'mt-3')}>{programa.origem}</p>
    </div>
  );
}
