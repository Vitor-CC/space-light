import { ArrowRight, Award, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, FileText, MapPin, MessageCircle, RefreshCw, Star, Users, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Tag } from '@/components/ds/base';
import { Cabecalho, FotoLegendada, Onda, OndaDaAbertura, Resp, Rotulo, miolo, tituloDeSecao } from '@/components/site-novo/blocos';
import { botao } from '@/components/site-novo/botao';
import { CardNorma } from '@/components/site-novo/card-norma';
import { ListaRecolhivel, PublicoDaNorma } from '@/components/site-novo/norma-interativa';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { NORMAS, NORMA_MAIS_APLICADA, type NormaComPagina, type PaginaDaNorma } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

/*
 * Página de uma norma, no modelo do Figma "Norma · NR 23 (modelo)" (Desktop
 * 1440 e Mobile 390). Um template só para as sete: o conteúdo vem de
 * `lib/site-novo/normas.ts`. A seção de conteúdo só aparece quando a norma tem
 * grade transcrita ou conteúdo mínimo, e a numeração das seções acompanha.
 */

type ItemDaFicha = {
  rotulo: string;
  /** Rótulo na faixa da abertura e na ficha do celular. */
  curto?: string;
  valor: string;
  /** Valor na ficha do desktop, quando é mais longo. */
  longo?: string;
  /** Ícone na faixa da abertura; sem ícone, o item fica só na ficha. */
  icone?: LucideIcon;
  /** O Figma do celular corta este item da abertura ou da ficha. */
  semCelular?: 'abertura' | 'ficha';
};

/**
 * Ficha técnica, igual para todas as normas. Carga horária, reciclagem e turma
 * dependem da operação: a página não crava número e deixa para a proposta.
 */
const FICHA: readonly ItemDaFicha[] = [
  { rotulo: 'Carga horária', valor: 'Definida na proposta', icone: Clock },
  { rotulo: 'Periodicidade de reciclagem', curto: 'Reciclagem', valor: 'Conforme a norma', icone: RefreshCw },
  { rotulo: 'Modalidade', valor: 'In company', icone: MapPin },
  { rotulo: 'Tamanho de turma', curto: 'Turma', valor: 'Sob consulta', icone: Users },
  { rotulo: 'Certificado', valor: 'No portal do cliente', longo: 'Emitido pela Space Light e disponível no portal do cliente', icone: Award, semCelular: 'abertura' },
  { rotulo: 'Documentação da turma', valor: 'Lista de presença, fotos da prática e conteúdo programático', semCelular: 'ficha' },
];

/** "NR 23" com espaço que não quebra, para o código não se partir no fim da linha. */
const semQuebra = (codigo: string) => codigo.replace(' ', '\u00a0');

/** Linhas da grade que o celular esconde até tocar em "Ver os N módulos". */
const LINHA_RECOLHIDA = 'max-lg:hidden max-lg:group-data-[aberta]/lista:flex';
const LINHAS_NO_CELULAR = 6;

export function PaginaDeNorma({ norma }: { norma: NormaComPagina }) {
  const { pagina } = norma;
  const temConteudo = Boolean(pagina.programa ?? pagina.conteudoMinimo);
  const secoes = ['exige', 'publico', 'aplicacao', ...(temConteudo ? ['conteudo'] : []), 'ficha', 'outras', 'proposta'];
  const numero = (secao: string) => String(secoes.indexOf(secao) + 1).padStart(2, '0');

  return <>
    <Abertura norma={norma} destinoDoConteudo={temConteudo ? '#conteudo-da-norma' : '#o-que-exige'} />
    <OQueExige pagina={pagina} numero={numero('exige')} />
    <ParaQuem pagina={pagina} numero={numero('publico')} />
    <ComoAplica pagina={pagina} numero={numero('aplicacao')} />
    {temConteudo ? <Conteudo pagina={pagina} numero={numero('conteudo')} /> : null}
    <FichaTecnica norma={norma} numero={numero('ficha')} />
    <OutrasNormas norma={norma} numero={numero('outras')} />
    <Proposta norma={norma} numero={numero('proposta')} />
  </>;
}

// ---------------------------------------------------------------------------
// Abertura
// ---------------------------------------------------------------------------

function Abertura({ norma, destinoDoConteudo }: { norma: NormaComPagina; destinoDoConteudo: string }) {
  const { pagina } = norma;
  const texto = pagina.abertura ?? { curto: pagina.exige, longo: pagina.exige };
  return <section aria-labelledby="norma-titulo" className="bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-5 pb-7 lg:gap-10 lg:pt-10 lg:pb-0')}>
      <nav aria-label="Trilha" className="ds-body-s text-ds-texto-inv-2">
        <Link href={rotas.treinamentos} className="doc-focus flex w-fit items-center gap-1.5 hover:text-ds-texto-inv lg:hidden"><ChevronLeft className="size-3.5" aria-hidden="true" />Treinamentos</Link>
        <ol className="hidden items-center gap-2 lg:flex">
          <li><Link href={rotas.inicio} className="doc-focus hover:text-ds-texto-inv">Início</Link></li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li><Link href={rotas.treinamentos} className="doc-focus hover:text-ds-texto-inv">Treinamentos</Link></li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li aria-current="page" className="font-medium text-ds-texto-inv">{norma.codigo}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col gap-4 lg:flex-1 lg:gap-6">
          {/* O selo de "mais aplicado" só na NR 23; o rótulo da norma só no desktop. */}
          {norma.slug === NORMA_MAIS_APLICADA
            ? <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ds-amarelo px-2.5 py-[5px] ds-caps text-ds-texto"><Star className="size-3" aria-hidden="true" /><Resp curto="Mais aplicado" longo="Treinamento mais aplicado" /></span>
              <p className="hidden ds-caps text-ds-texto-inv-2 lg:block">Norma Regulamentadora</p>
            </div>
            : <p className="hidden ds-caps text-ds-texto-inv-2 lg:block">Norma Regulamentadora</p>}
          <h1 id="norma-titulo" className="flex flex-col gap-4 font-ds-display font-extrabold lg:gap-6">
            <span className="text-[72px] leading-[72px] tracking-[-0.035em] text-ds-amarelo lg:text-[120px] lg:leading-[112px] lg:tracking-[-0.05em]">{norma.codigo}</span>
            <span className="text-[40px] leading-[44px] tracking-[-0.025em] lg:text-[56px] lg:leading-[60px] lg:tracking-[-0.03em]">{norma.nome}</span>
          </h1>
          <p className="ds-body-m text-ds-texto-inv-2 lg:font-ds-sans lg:text-xl lg:leading-[30px]"><Resp {...texto} /></p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link href={rotas.proposta(norma.slug)} className={botao({ tamanho: 'lg' })}><Resp curto="Solicitar proposta" longo={`Solicitar proposta para ${norma.codigo}`} /><ArrowRight className="size-5" aria-hidden="true" /></Link>
            <Link href={destinoDoConteudo} className={botao({ variante: 'inverso', tamanho: 'lg', className: 'hidden lg:inline-flex' })}>Ver conteúdo</Link>
          </div>
        </div>
        {pagina.figura ? <FotoLegendada {...pagina.figura} norma={norma.codigo} prioridade legendaNoCelular={false} sizes="(min-width: 1280px) 520px, (min-width: 1024px) 400px, 100vw" className="h-[220px] w-full lg:h-[560px] lg:w-[400px] lg:shrink-0 xl:w-[520px]" /> : null}
      </div>

      <dl className="grid grid-cols-2 gap-y-3.5 border-t border-ds-borda-inv pt-4 lg:flex lg:pt-7 lg:pb-12">
        {FICHA.filter((item) => item.icone).map((item) => {
          const Icone = item.icone!;
          return <div key={item.rotulo} className={cn('flex items-center gap-3 lg:flex-1', item.semCelular === 'abertura' && 'max-lg:hidden')}>
            <span aria-hidden="true" className="hidden rounded-full border-[1.2px] border-ds-amarelo p-[9px] text-ds-amarelo lg:flex"><Icone className="size-[18px]" /></span>
            <div className="flex flex-col-reverse gap-0.5">
              <dd className="font-ds-sans text-base leading-6 font-semibold">{item.valor}</dd>
              <dt className="ds-caps text-ds-texto-inv-2">{item.curto ?? item.rotulo}</dt>
            </div>
          </div>;
        })}
      </dl>
    </div>
    <OndaDaAbertura />
  </section>;
}

// ---------------------------------------------------------------------------
// O que a norma exige
// ---------------------------------------------------------------------------

function Fontes({ fontes, className }: { fontes: PaginaDaNorma['fontes']; className?: string }) {
  return <ul className={cn('flex flex-col gap-1.5', className)}>
    {fontes.map((fonte) => <li key={fonte.url}>
      <a href={fonte.url} target="_blank" rel="noreferrer" className="doc-focus inline-flex items-start gap-1.5 ds-caption text-ds-texto underline-offset-4 hover:underline lg:gap-2 lg:ds-body-s lg:font-medium">
        <FileText className="mt-px size-3.5 shrink-0 lg:mt-0.5 lg:size-4" aria-hidden="true" />
        <span>Fonte: {fonte.rotulo}</span>
        <ExternalLink className="mt-[3px] hidden size-3.5 shrink-0 lg:block" aria-hidden="true" />
      </a>
    </li>)}
  </ul>;
}

function OQueExige({ pagina, numero }: { pagina: PaginaDaNorma; numero: string }) {
  return <section id="o-que-exige" aria-labelledby="o-que-exige-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-3.5 pt-8 pb-10 lg:flex-row lg:items-start lg:gap-20 lg:pt-[88px] lg:pb-[104px]')}>
      <div className="flex flex-col gap-3.5 lg:w-[480px] lg:shrink-0 lg:gap-5">
        <Rotulo>{numero} — O que a norma exige</Rotulo>
        <h2 id="o-que-exige-titulo" className={tituloDeSecao}>O que a sua empresa precisa cumprir.</h2>
        <p className="ds-body-s text-ds-texto-2 lg:ds-body-m">{pagina.exigencias.join(' ')}</p>
        {pagina.aviso ? <p className="border-l-2 border-ds-amarelo pl-3 ds-body-s font-medium">{pagina.aviso}</p> : null}
        <Fontes fontes={pagina.fontes} className="hidden pt-2 lg:flex" />
      </div>
      <ol className="lg:flex-1">
        {pagina.pontos.map((ponto, i) => <li key={ponto} className={cn('flex items-start gap-3 border-t border-ds-borda py-3 lg:items-center lg:gap-5 lg:border-t-0 lg:border-b lg:py-[22px]', i === 0 && 'lg:border-t-2 lg:border-t-ds-inverso')}>
          <span aria-hidden="true" className="font-ds-sans text-base leading-6 font-semibold text-ds-amarelo-texto lg:font-ds-display lg:text-[26px] lg:leading-8 lg:font-bold lg:tracking-[-0.01em]">{String(i + 1).padStart(2, '0')}</span>
          <span className="flex-1 ds-body-s font-medium lg:font-ds-display lg:text-[19px] lg:leading-[26px] lg:font-semibold lg:tracking-[-0.005em]">{ponto}</span>
          <span aria-hidden="true" className="hidden rounded-sm bg-ds-amarelo p-1 lg:flex"><Check className="size-3.5" /></span>
        </li>)}
      </ol>
      <Fontes fontes={pagina.fontes} className="lg:hidden" />
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Para quem é
// ---------------------------------------------------------------------------

function ParaQuem({ pagina, numero }: { pagina: PaginaDaNorma; numero: string }) {
  return <section id="para-quem" aria-labelledby="para-quem-titulo" className="scroll-mt-header bg-ds-muted text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-3.5 py-10 lg:gap-12 lg:py-[104px]')}>
      <Cabecalho id="para-quem-titulo" rotulo={`${numero} — Para quem é`} titulo={<Resp curto="Quem entra na turma." longo="Quem precisa passar por este treinamento." />} apoio="Use estas listas para decidir quem entra na turma. Na dúvida, a Space Light ajuda a montar a lista no diagnóstico." apoioNoCelular={false} />
      <PublicoDaNorma funcoes={pagina.funcoes} situacoes={pagina.situacoes} />
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Como a Space aplica
// ---------------------------------------------------------------------------

function ComoAplica({ pagina, numero }: { pagina: PaginaDaNorma; numero: string }) {
  return <section id="como-aplicamos" aria-labelledby="como-aplicamos-titulo" className="scroll-mt-header bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex flex-col pt-10 pb-8 lg:gap-14 lg:py-[104px]')}>
      <Cabecalho escuro id="como-aplicamos-titulo" rotulo={`${numero} — Como a Space aplica`} titulo={<Resp curto="Da planta ao certificado." longo="Da planta ao certificado, em cinco etapas." />} apoio="O mesmo método para todas as normas, com o conteúdo ajustado aos riscos da sua operação." apoioNoCelular={false} />
      <ol className="flex flex-col lg:flex-row lg:gap-6">
        {pagina.aplicacao.map((etapa, i) => {
          // A prática é a etapa que a Space põe em evidência, como no Figma.
          const pratica = etapa.titulo === 'Prática supervisionada';
          return <li key={etapa.titulo} className={cn('flex gap-3 border-b border-ds-borda-inv py-3 lg:flex-1 lg:flex-col lg:gap-3.5 lg:border-t-2 lg:border-b-0 lg:py-0 lg:pt-6', pratica && 'lg:border-t-ds-amarelo')}>
            <span aria-hidden="true" className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-full ds-caps lg:size-9', pratica ? 'bg-ds-amarelo text-ds-texto' : 'border-[1.2px] border-ds-amarelo text-ds-amarelo')}>{String(i + 1).padStart(2, '0')}</span>
            <div className="flex flex-col gap-0.5 lg:gap-3.5">
              <strong className="ds-body-m font-semibold lg:ds-h4">{etapa.titulo}</strong>
              <span className="ds-caption text-ds-texto-inv-2 lg:ds-body-s">{etapa.texto}</span>
            </div>
          </li>;
        })}
      </ol>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Conteúdo: a grade da Space (com prática ou teoria) ou o mínimo da norma
// ---------------------------------------------------------------------------

function Conteudo({ pagina, numero }: { pagina: PaginaDaNorma; numero: string }) {
  const { programa, conteudoMinimo } = pagina;
  const base = programa ?? conteudoMinimo;
  if (!base) return null;
  const linhas: { texto: string; pratica?: boolean }[] = programa
    ? programa.modulos.map((m) => ({ texto: m.modulo, pratica: m.pratica }))
    : (conteudoMinimo?.itens ?? []).map((texto) => ({ texto }));
  const comPratica = linhas.filter((linha) => linha.pratica).length;
  const unidade = programa ? 'módulos' : 'itens';
  const metade = Math.ceil(linhas.length / 2);
  const colunas = [linhas.slice(0, metade), linhas.slice(metade)];
  const nota = programa
    ? `${programa.origem} O conteúdo é ajustado aos riscos específicos da sua planta no diagnóstico.`
    : `${base.origem} A Space Light ajusta o conteúdo à operação no diagnóstico.`;

  return <section id="conteudo-da-norma" aria-labelledby="conteudo-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto">
    <div className={cn(miolo, 'flex flex-col pt-10 pb-8 lg:gap-10 lg:pt-28 lg:pb-[104px]')}>
      <div className="flex flex-col gap-2.5 pb-3.5 lg:flex-row lg:items-end lg:gap-16 lg:pb-0">
        <div className="flex flex-col gap-2.5 lg:w-[640px] lg:shrink-0 lg:gap-4">
          <Rotulo>{numero} — Conteúdo</Rotulo>
          <h2 id="conteudo-titulo" className={tituloDeSecao}>
            {programa ? <Resp curto={`${linhas.length} módulos · ${comPratica} com prática`} longo={`${base.titulo}.`} /> : `${base.titulo}.`}
          </h2>
        </div>
        <dl className="hidden gap-6 lg:flex">
          <div className="flex flex-col-reverse gap-0.5"><dt className="ds-body-s text-ds-texto-2">{unidade}</dt><dd className={tituloDeSecao}>{linhas.length}</dd></div>
          {programa ? <div className="flex flex-col-reverse gap-0.5"><dt className="ds-body-s text-ds-texto-2">com prática</dt><dd className={cn(tituloDeSecao, 'text-ds-amarelo-texto')}>{comPratica}</dd></div> : null}
        </dl>
      </div>

      <ListaRecolhivel rotulo={`Ver os ${linhas.length} ${unidade}`}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {colunas.map((coluna, c) => <div key={c}>
            <div aria-hidden="true" className="hidden gap-4 rounded-sm bg-ds-muted px-4 py-2.5 ds-caps text-ds-texto-2 lg:flex">
              <span className="w-7 shrink-0">Nº</span><span className="flex-1">{programa ? 'Módulo' : 'Item'}</span>{programa ? <span>Prática</span> : null}
            </div>
            <ol start={c * metade + 1}>
              {coluna.map((linha, i) => {
                const indice = c * metade + i;
                return <li key={linha.texto} className={cn('flex items-center gap-3 border-b border-ds-borda py-[11px] ds-body-s lg:gap-4 lg:px-4 lg:py-[13px]', indice >= LINHAS_NO_CELULAR && LINHA_RECOLHIDA)}>
                  <span aria-hidden="true" className="w-7 shrink-0 ds-mono text-ds-texto-2 tabular-nums">{String(indice + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-medium">{linha.texto}</span>
                  {linha.pratica === true ? <Tag tom="sinal" className="shrink-0">Prática</Tag> : null}
                  {linha.pratica === false ? <span className="hidden shrink-0 ds-caption text-ds-texto-2 lg:inline">Teoria</span> : null}
                </li>;
              })}
            </ol>
          </div>)}
        </div>
      </ListaRecolhivel>
      <p className="hidden ds-caption text-ds-texto-2 lg:block">{nota}</p>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Ficha técnica
// ---------------------------------------------------------------------------

function FichaTecnica({ norma, numero }: { norma: NormaComPagina; numero: string }) {
  return <section id="ficha-tecnica" aria-labelledby="ficha-tecnica-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto-inv">
    <div className={cn(miolo, 'pb-10 lg:pb-28')}>
      <div className="flex flex-col gap-3 rounded-lg bg-ds-inverso px-5 py-6 lg:flex-row lg:items-start lg:gap-16 lg:px-14 lg:py-12">
        <div className="flex flex-col gap-4 lg:w-[340px] lg:shrink-0">
          <Rotulo escuro>{numero} — Ficha técnica</Rotulo>
          <h2 id="ficha-tecnica-titulo" className={cn(tituloDeSecao, 'max-lg:sr-only')}>Resumo da {semQuebra(norma.codigo)}.</h2>
          <p className="hidden ds-body-s text-ds-texto-inv-2 lg:block">A proposta confirma carga horária, turma e modalidade para a sua operação.</p>
        </div>
        <dl className="lg:flex-1">
          {FICHA.map((item, i) => <div key={item.rotulo} className={cn('flex items-start justify-between gap-4 border-b border-ds-borda-inv py-[11px] lg:justify-start lg:gap-6 lg:border-b-0 lg:py-4', i > 0 && 'lg:border-t', item.semCelular === 'ficha' && 'max-lg:hidden')}>
            <dt className="shrink-0 ds-body-s text-ds-texto-inv-2 lg:w-[220px]"><Resp curto={item.curto ?? item.rotulo} longo={item.rotulo} /></dt>
            <dd className="text-right ds-body-s font-medium lg:flex-1 lg:text-left lg:ds-body-m lg:font-semibold"><Resp curto={item.valor} longo={item.longo ?? item.valor} /></dd>
          </div>)}
        </dl>
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Outras normas
// ---------------------------------------------------------------------------

function OutrasNormas({ norma, numero }: { norma: NormaComPagina; numero: string }) {
  const outras = NORMAS.filter((item) => item.slug !== norma.slug);
  return <section id="outras-normas" aria-labelledby="outras-normas-titulo" className="scroll-mt-header bg-ds-muted text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-3 py-10 lg:gap-10 lg:py-[104px]')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4">
          <Rotulo>{numero} — Outras normas</Rotulo>
          <h2 id="outras-normas-titulo" className={cn(tituloDeSecao, 'max-lg:sr-only')}>Treine a equipe nas outras NRs.</h2>
        </div>
        <Link href={rotas.treinamentos} className="doc-focus hidden items-center gap-2 py-1 ds-botao lg:inline-flex">Ver todos os treinamentos<ArrowRight className="size-[18px]" aria-hidden="true" /></Link>
      </div>
      <ul className="flex flex-col gap-3 lg:hidden">
        {outras.map((item) => <li key={item.slug}><Link href={rotas.norma(item.slug)} className="doc-focus flex items-center gap-3.5 rounded-lg bg-ds-superficie px-4 py-3.5">
          <span className="font-ds-display text-[19px] leading-[26px] font-extrabold whitespace-nowrap">{item.codigo}</span>
          <span className="min-w-0 flex-1 ds-body-s font-medium">{item.curto}</span>
          <ChevronRight className="size-[18px] shrink-0" aria-hidden="true" />
        </Link></li>)}
      </ul>
      <ul data-surgir className="hidden gap-6 lg:grid lg:grid-cols-3">
        {outras.map((item) => <li key={item.slug} className="flex"><CardNorma norma={item} className="w-full sm:min-h-[280px]" /></li>)}
      </ul>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// Proposta
// ---------------------------------------------------------------------------

function Proposta({ norma, numero }: { norma: NormaComPagina; numero: string }) {
  return <section id="proposta" aria-labelledby="proposta-titulo" className="scroll-mt-header text-ds-texto">
    <Onda tipo="cta" fundo="bg-ds-muted" className="h-10 lg:h-24" />
    <div className="ds-degrade">
      <div className={cn(miolo, 'flex items-center gap-16 pt-3 pb-10 lg:pt-10 lg:pb-[104px]')}>
        <div className="flex flex-1 flex-col gap-3.5 lg:gap-5">
          <p className="hidden ds-caps lg:block">{numero} — Proposta</p>
          <h2 id="proposta-titulo" className="font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[56px] lg:leading-[60px] lg:font-extrabold lg:tracking-[-0.03em]">Vamos montar a sua turma de {semQuebra(norma.codigo)}.</h2>
          <p className="ds-body-s lg:font-ds-sans lg:text-xl lg:leading-[30px]"><Resp curto={`O formulário já chega com a ${norma.codigo} marcada.`} longo={`O formulário já chega com a ${norma.codigo} marcada. Conte o número de pessoas e o local — a Space Light retorna com a proposta e o caminho recomendado.`} /></p>
          <div className="flex flex-col gap-3.5 sm:flex-row sm:gap-4">
            <Link href={rotas.proposta(norma.slug)} className={botao({ variante: 'escuro', tamanho: 'lg' })}>Solicitar proposta<ArrowRight className="size-5" aria-hidden="true" /></Link>
            <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={botao({ variante: 'contorno', tamanho: 'lg', className: 'border-ds-inverso text-ds-texto hover:bg-ds-inverso hover:text-ds-texto-inv' })}><Resp curto="WhatsApp" longo="Falar no WhatsApp" /><MessageCircle className="size-5" aria-hidden="true" /></a>
          </div>
        </div>
        <Image src="/images/branding/simbolo-preto.svg" alt="" width={226} height={240} unoptimized className="hidden h-60 w-auto shrink-0 lg:block" />
      </div>
    </div>
  </section>;
}
