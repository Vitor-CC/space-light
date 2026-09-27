import { ArrowRight, ArrowUpRight, Calendar, Check, ChevronRight, Download, MapPin, MessageCircle, Plus, Star, User, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { botao } from '@/components/site-novo/botao';
import { CardNorma } from '@/components/site-novo/card-norma';
import { Tag } from '@/components/ds/base';
import { WHATSAPP } from '@/lib/site-novo/contato';
import {
  AVALIACOES,
  CHECKLIST_DO_PORTAL,
  DIFERENCIAIS,
  FAIXA_DE_PROVAS,
  FOTO_DA_ABERTURA,
  FOTOS_DA_PRATICA,
  LINK_DAS_AVALIACOES,
  MODALIDADES,
  NUMEROS,
  PERGUNTAS,
  PRINCIPIOS,
  PROVA_SOCIAL,
  TEXTOS,
} from '@/lib/site-novo/home';
import { ETAPAS } from '@/lib/site-novo/metodo';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

/*
 * Home do Figma ("02 · Site Desktop" e "03 · Site Mobile"). Uma seção por
 * componente, na ordem da página. Medidas: 1440 com margem de 120, 390 com
 * margem de 20.
 */

const miolo = 'mx-auto w-full max-w-[1440px] px-5 md:px-10 xl:px-[120px]';
const tituloDeSecao =
  'font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]';
/** A NR 23 é a mais aplicada: vem em destaque na grade e primeiro na lista do celular. */
const DESTAQUE = 'nr-23';

/** Texto do celular e do desktop, quando o Figma encurta no celular. */
function Resp({ curto, longo }: { curto: string; longo: string }) {
  if (curto === longo) return <>{longo}</>;
  return <><span className="lg:hidden">{curto}</span><span className="hidden lg:inline">{longo}</span></>;
}

function Estrelas({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center gap-0.5 text-ds-amarelo', className)}>
    <span className="sr-only">5 de 5 estrelas</span>
    {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-[1em] fill-current" aria-hidden="true" />)}
  </span>;
}

function Rotulo({ children, escuro = false, className }: { children: ReactNode; escuro?: boolean; className?: string }) {
  return <p className={cn('ds-caps', escuro ? 'text-ds-amarelo' : 'text-ds-amarelo-texto', className)}>{children}</p>;
}

/** "Cabeçalho da seção": rótulo e título à esquerda, texto de apoio à direita no desktop. */
function Cabecalho({ id, rotulo, titulo, apoio, escuro = false, largura = 'lg:w-[640px]', apoioNoCelular = true }: { id?: string; rotulo: string; titulo: ReactNode; apoio?: ReactNode; escuro?: boolean; largura?: string; apoioNoCelular?: boolean }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
    <div className={cn('flex flex-col gap-4 lg:shrink-0 lg:gap-5', largura)}>
      <Rotulo escuro={escuro}>{rotulo}</Rotulo>
      <h2 id={id} className={cn(tituloDeSecao, escuro ? 'text-ds-texto-inv' : 'text-ds-texto')}>{titulo}</h2>
    </div>
    {apoio ? <p className={cn('ds-body-s lg:flex-1 lg:ds-body-m', escuro ? 'text-ds-texto-inv-2' : 'text-ds-texto-2', !apoioNoCelular && 'hidden lg:block')}>{apoio}</p> : null}
  </div>;
}

/** Foto com o degradê escuro embaixo e a legenda por cima, como os blocos "FOTO · NR" do Figma. */
function FotoLegendada({ src, alt, norma, legenda, sizes, className, prioridade = false }: { src: string; alt: string; norma: string; legenda: string; sizes: string; className?: string; prioridade?: boolean }) {
  return <figure className={cn('relative flex flex-col justify-end overflow-hidden rounded-md bg-[#3b3b3b] p-3.5 lg:p-5', className)}>
    <Image src={src} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,19,21,0)_35%,rgba(17,19,21,0.9)_100%)]" />
    <figcaption className="relative flex flex-col gap-1 lg:gap-1.5">
      <span className="ds-caps text-ds-amarelo">Foto · {norma}</span>
      <span className="ds-body-s text-ds-texto-inv">{legenda}</span>
    </figcaption>
  </figure>;
}

/** As duas ondas da marca, montadas com as três camadas exportadas do Figma. */
function Onda({ tipo }: { tipo: 'divisor' | 'cta' }) {
  const camadas = tipo === 'divisor'
    ? { altura: 'h-14 lg:h-[120px]', degrade: 'inset-[25.62%_0_0_0]', linha: 'inset-[13.95%_0_25.78%_0]', folga: 'inset-[-1.04%_0]' }
    : { altura: 'h-12 lg:h-[120px]', degrade: 'inset-[18.75%_0_0_0]', linha: 'inset-[7.08%_0_38.92%_0]', folga: 'inset-[-1.16%_0]' };
  const base = `/images/branding/onda-${tipo}`;
  return <div aria-hidden="true" className={cn('relative w-full', camadas.altura)}>
    <Image src={`${base}-fundo.svg`} alt="" width={1440} height={120} unoptimized className="absolute inset-0 block size-full" />
    <div className={cn('absolute', camadas.degrade)}><Image src={`${base}-degrade.svg`} alt="" width={1440} height={90} unoptimized className="absolute inset-0 block size-full" /></div>
    <div className={cn('absolute', camadas.linha)}><div className={cn('absolute', camadas.folga)}><Image src={`${base}-linha.svg`} alt="" width={1440} height={72} unoptimized className="block size-full" /></div></div>
  </div>;
}

// ---------------------------------------------------------------------------
// 01 · Abertura
// ---------------------------------------------------------------------------

export function Abertura() {
  return <section aria-labelledby="abertura" className="bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex flex-col gap-12 pt-8 lg:gap-[72px] lg:pt-[88px]')}>
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col gap-6 lg:flex-1 lg:gap-8">
          <p className="flex items-center gap-2.5 ds-caps text-ds-texto-inv-2"><span aria-hidden="true" className="size-2 shrink-0 bg-ds-amarelo" />Engenharia de segurança do trabalho</p>
          <h1 id="abertura" className="font-ds-display text-[40px] leading-[44px] font-extrabold tracking-[-0.035em] lg:text-[80px] lg:leading-[84px]">Segurança que sai do <span className="text-ds-amarelo">papel.</span></h1>
          <p className="ds-body-m text-ds-texto-inv-2 lg:font-ds-sans lg:text-xl lg:leading-[30px]"><Resp {...TEXTOS.abertura} /></p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={rotas.contato} className={botao({ tamanho: 'lg' })}>Solicitar proposta<ArrowRight className="size-5" aria-hidden="true" /></Link>
            <Link href={rotas.treinamentos} className={botao({ variante: 'inverso', tamanho: 'lg', className: 'hidden lg:inline-flex' })}>Ver treinamentos</Link>
            <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={botao({ variante: 'inverso', tamanho: 'lg', className: 'lg:hidden' })}>Falar no WhatsApp<MessageCircle className="size-5" aria-hidden="true" /></a>
          </div>
          <p className="flex flex-wrap items-center gap-3 ds-caption font-medium lg:ds-body-s lg:font-medium"><Estrelas className="text-[14px]" /><span>{PROVA_SOCIAL.nota} no Google · <Resp curto={PROVA_SOCIAL.treinadosCurto} longo={PROVA_SOCIAL.treinados} /></span></p>
        </div>
        <FotoLegendada {...FOTO_DA_ABERTURA} prioridade sizes="(min-width: 1024px) 560px, 100vw" className="h-60 w-full lg:h-[620px] lg:w-[560px] lg:shrink-0" />
      </div>
      <ul className="hidden border-t border-ds-borda-inv pt-8 pb-14 lg:grid lg:grid-cols-4">
        {FAIXA_DE_PROVAS.map((item, i) => <li key={item.titulo} className="flex flex-col gap-2 pr-8">
          <span className="ds-caps text-ds-amarelo">{String(i + 1).padStart(2, '0')}</span>
          <strong className="ds-body-m font-semibold text-ds-texto-inv">{item.titulo}</strong>
          <span className="ds-body-s text-ds-texto-inv-2">{item.texto}</span>
        </li>)}
      </ul>
    </div>
    <div className="pt-7 lg:pt-0"><Onda tipo="divisor" /></div>
  </section>;
}

// ---------------------------------------------------------------------------
// 02 · Números
// ---------------------------------------------------------------------------

export function Numeros() {
  return <section aria-label="A Space Light em números" className="ds-degrade text-ds-texto">
    <dl className={cn(miolo, 'grid grid-cols-2 gap-x-4 gap-y-4 pt-2 pb-12 lg:flex lg:items-end lg:gap-0 lg:pt-6')}>
      {NUMEROS.map((item, i) => <div key={item.valor} className="flex flex-col-reverse gap-0.5 lg:flex-1 lg:gap-1.5 lg:pr-6">
        <dt className="ds-caption lg:ds-body-s"><Resp curto={item.curto} longo={item.rotulo} /></dt>
        <dd className={cn('font-ds-display font-bold lg:whitespace-nowrap', i === 0 ? 'text-[22px] leading-[26px] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]' : 'text-[19px] leading-[26px] lg:text-[26px] lg:leading-8 lg:tracking-[-0.01em]')}>{item.valor}</dd>
      </div>)}
    </dl>
  </section>;
}

// ---------------------------------------------------------------------------
// 03 · Treinamentos
// ---------------------------------------------------------------------------

export function Treinamentos() {
  const listaDoCelular = [...NORMAS].sort((a, b) => Number(b.slug === DESTAQUE) - Number(a.slug === DESTAQUE));
  return <section id="treinamentos" aria-labelledby="treinamentos-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-14 pb-12 lg:gap-14 lg:py-32')}>
      <Cabecalho id="treinamentos-titulo" rotulo="02 — Treinamentos regulamentares" titulo="Conhecimento técnico. Aplicação imediata." apoio="Programas que conectam o requisito da norma à realidade da operação — para que o participante saia sabendo o que fazer, e não apenas o que a norma diz." apoioNoCelular={false} />

      <ul className="flex flex-col gap-2 lg:hidden">
        {listaDoCelular.map((norma) => {
          const destaque = norma.slug === DESTAQUE;
          return <li key={norma.slug}><Link href={rotas.norma(norma.slug)} className={cn('doc-focus flex items-center gap-3.5 rounded-lg p-4', destaque ? 'bg-ds-inverso text-ds-texto-inv' : 'bg-ds-muted text-ds-texto')}>
            <span className={cn('font-ds-display text-[19px] leading-[26px] font-extrabold whitespace-nowrap', destaque && 'text-ds-amarelo')}>{norma.codigo}</span>
            <span className="min-w-0 flex-1 ds-body-s font-medium">{norma.curto}</span>
            <ChevronRight className={cn('size-[18px] shrink-0', destaque && 'text-ds-amarelo')} aria-hidden="true" />
          </Link></li>;
        })}
      </ul>
      <p className="ds-caption text-ds-texto-2 lg:hidden">Atendemos outras NRs — <Link href={rotas.contato} className="underline underline-offset-4">fale com a gente</Link>.</p>

      <ul data-surgir className="hidden gap-6 lg:grid lg:grid-cols-4">
        {NORMAS.map((norma) => <li key={norma.slug} className="flex"><CardNorma norma={norma} destaque={norma.slug === DESTAQUE} className="w-full" /></li>)}
        <li className="flex">
          <div className="flex min-h-[323px] w-full flex-col justify-between rounded-md border border-dashed border-ds-amarelo bg-ds-amarelo-suave p-7">
            <Plus className="size-8" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 className="ds-h4">Sua NR não está na lista?</h3>
              <p className="ds-body-s text-ds-texto-2">Atendemos outras Normas Regulamentadoras. Conte o que a sua operação exige.</p>
            </div>
            <Link href={rotas.contato} className="doc-focus inline-flex w-fit items-center gap-2 py-1 ds-botao">Falar com a Space<ArrowRight className="size-[18px]" aria-hidden="true" /></Link>
          </div>
        </li>
      </ul>
      <p className="hidden items-center gap-2 ds-caption text-ds-texto-2 lg:flex"><span aria-hidden="true" className="size-2.5 bg-ds-inverso" />Em destaque: NR 23, o treinamento mais aplicado pela Space Light.</p>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 04 · A prática
// ---------------------------------------------------------------------------

export function Pratica() {
  return <section id="pratica" aria-labelledby="pratica-titulo" className="scroll-mt-header bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-12 pb-10 lg:gap-[72px] lg:py-32')}>
      <Cabecalho id="pratica-titulo" escuro rotulo="03 — Treinamento em campo" titulo="Onde a prática muda a percepção." apoio={<Resp {...TEXTOS.pratica} />} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-16">
        <div className="order-2 flex flex-col gap-10 lg:order-1 lg:w-[440px] lg:shrink-0">
          <p className="hidden font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:block">A prática supervisionada não é complemento do treinamento — é a parte que faz o resto valer.</p>
          <ol>
            {PRINCIPIOS.map((item, i) => <li key={item.titulo} className="flex gap-3 border-t border-ds-borda-inv py-3 lg:gap-5 lg:py-5">
              <span className="ds-caps text-ds-amarelo">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex flex-col gap-1.5">
                <strong className="ds-body-s font-medium lg:ds-body-m lg:font-semibold">{item.titulo}</strong>
                <span className="hidden ds-body-s text-ds-texto-inv-2 lg:block">{item.texto}</span>
              </div>
            </li>)}
          </ol>
        </div>
        {/* Celular: rolagem lateral de fotos. Desktop: mosaico 2 × 2. */}
        <ul data-surgir className="order-1 -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:-mx-10 md:scroll-px-10 md:px-10 lg:scroll-px-0 lg:order-2 lg:mx-0 lg:grid lg:flex-1 lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {FOTOS_DA_PRATICA.map((foto) => <li key={foto.src} className="shrink-0 snap-start">
            <FotoLegendada {...foto} sizes="(min-width: 1024px) 336px, 280px" className="h-80 w-[280px] lg:h-[300px] lg:w-full" />
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 05 · Como trabalhamos (preto no celular, claro no desktop)
// ---------------------------------------------------------------------------

export function ComoTrabalhamos() {
  return <section id="como-trabalhamos" aria-labelledby="como-trabalhamos-titulo" className="scroll-mt-header bg-ds-inverso text-ds-texto-inv lg:bg-ds-superficie lg:text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-5 pt-6 pb-12 lg:gap-16 lg:pt-32 lg:pb-28')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
        <div className="flex flex-col gap-4 lg:w-[640px] lg:shrink-0 lg:gap-5">
          <p className="ds-caps text-ds-amarelo lg:text-ds-amarelo-texto">04 — Como trabalhamos</p>
          <h2 id="como-trabalhamos-titulo" className={tituloDeSecao}><Resp {...TEXTOS.comoTrabalhamos} /></h2>
        </div>
        <p className="hidden ds-body-m text-ds-texto-2 lg:block lg:flex-1">Da primeira conversa ao registro final, cada etapa existe para tornar o treinamento mais relevante para quem participa — e mais fácil de comprovar para quem gere.</p>
      </div>
      <ol className="flex flex-col lg:flex-row lg:gap-6">
        {ETAPAS.map((etapa, i) => {
          const ultima = i === ETAPAS.length - 1;
          const numero = String(i + 1).padStart(2, '0');
          return <li key={etapa.titulo} className={cn('flex gap-3.5 border-b border-ds-borda-inv py-3.5 lg:flex-1 lg:flex-col lg:gap-4 lg:border-t-2 lg:border-b-0 lg:py-0 lg:pt-6', ultima ? 'lg:border-t-ds-amarelo' : 'lg:border-t-ds-inverso')}>
            <span aria-hidden="true" className={cn('flex size-8 shrink-0 items-center justify-center rounded-full ds-caps lg:hidden', ultima ? 'bg-ds-amarelo text-ds-texto' : 'border-[1.2px] border-ds-amarelo text-ds-amarelo')}>{numero}</span>
            <span className="hidden items-center gap-2.5 ds-caps text-ds-texto-2 lg:flex"><span aria-hidden="true" className={cn('size-2.5', ultima ? 'bg-ds-amarelo' : 'bg-ds-inverso')} />Etapa {numero}</span>
            <div className="flex flex-col gap-0.5 lg:gap-4">
              <strong className="ds-body-m font-semibold lg:ds-h4">{etapa.titulo}</strong>
              <span className="ds-body-s text-ds-texto-inv-2 lg:text-ds-texto-2"><Resp curto={etapa.curto} longo={etapa.texto} /></span>
            </div>
          </li>;
        })}
      </ol>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 06 · Portal do cliente
// ---------------------------------------------------------------------------

/** Ilustração de uma turma no portal (Figma "Mock · Turma no portal"). Dados fictícios. */
function TurmaNoPortal() {
  const pessoas = [
    { nome: 'Ana Souza', funcao: 'Brigadista', ok: true },
    { nome: 'Bruno Lima', funcao: 'Brigadista', ok: true },
    { nome: 'Carla Mendes', funcao: 'Líder de área', ok: true },
    { nome: 'Diego Rocha', funcao: 'Brigadista', ok: false },
  ];
  return <div aria-hidden="true" className="hidden w-[600px] shrink-0 overflow-hidden rounded-[10px] bg-ds-superficie shadow-[0_24px_48px_-8px_rgba(17,19,21,0.12)] lg:block">
    <div className="flex flex-col gap-3 px-6 pt-6">
      <div className="flex items-center justify-between"><span className="ds-caps text-ds-texto-2">Turma 2026-041 · NR 23</span><Tag tom="sucesso">Concluída</Tag></div>
      <p className="font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em]">Formação de brigada de incêndio</p>
      <div className="flex gap-5 ds-body-s text-ds-texto-2 [&_svg]:size-3.5">
        <span className="inline-flex items-center gap-1.5"><Calendar />12 set 2026</span>
        <span className="inline-flex items-center gap-1.5"><MapPin />In company · São Paulo/SP</span>
        <span className="inline-flex items-center gap-1.5"><Users />24 participantes</span>
      </div>
      <div className="flex gap-6 border-b border-ds-borda pt-3 ds-body-s font-medium text-ds-texto-2">
        {['Presença', 'Fotos', 'Documentos'].map((aba) => <span key={aba} className="pb-3">{aba}</span>)}
        <span className="border-b-2 border-ds-amarelo pb-3 text-ds-texto">Certificados</span>
      </div>
    </div>
    <div className="px-6 pb-3">
      {pessoas.map((p) => <div key={p.nome} className="flex items-center gap-4 border-b border-ds-borda py-3.5">
        <div className="flex flex-1 flex-col gap-0.5"><span className="ds-body-s font-medium">{p.nome}</span><span className="ds-caption text-ds-texto-2">{p.funcao}</span></div>
        <Tag tom={p.ok ? 'sucesso' : 'atencao'}>{p.ok ? 'Válido até 09/2027' : 'Pendente de assinatura'}</Tag>
        <Download className="size-[18px]" />
      </div>)}
    </div>
    <div className="flex items-center justify-between px-6 py-4 ds-body-s"><span className="text-ds-texto-2">23 de 24 certificados emitidos</span><span className="inline-flex items-center gap-2 font-medium"><Download className="size-4" />Baixar todos (.zip)</span></div>
  </div>;
}

export function Portal() {
  return <section id="portal" aria-labelledby="portal-titulo" className="scroll-mt-header bg-ds-muted text-ds-texto">
    <div className={cn(miolo, 'flex items-center gap-20 pt-12 pb-12 lg:py-[120px]')}>
      <div className="flex flex-1 flex-col gap-4 lg:gap-7">
        <Rotulo>05 — Portal do cliente</Rotulo>
        <h2 id="portal-titulo" className={tituloDeSecao}>Tudo documentado. Pronto para a auditoria.</h2>
        <p className="hidden ds-body-m text-ds-texto-2 lg:block">O registro de cada turma fica no portal do cliente. Quando a auditoria pedir, está lá — sem caçar arquivo em e-mail ou pasta compartilhada.</p>
        <ul className="flex flex-col gap-4 lg:gap-3.5">
          {CHECKLIST_DO_PORTAL.map((item) => <li key={item} className="flex items-center gap-2.5 lg:gap-3">
            <span aria-hidden="true" className="flex rounded-sm bg-ds-amarelo p-[3px]"><Check className="size-3.5" /></span>
            <span className="ds-body-s font-medium lg:ds-body-m lg:font-semibold">{item}</span>
          </li>)}
        </ul>
        <Link href={rotas.portal} className={botao({ variante: 'escuro', className: 'mt-1 w-full lg:w-fit' })}>Conhecer o portal<ArrowRight className="size-[18px]" aria-hidden="true" /></Link>
      </div>
      <TurmaNoPortal />
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 07 · Modalidades
// ---------------------------------------------------------------------------

export function Modalidades() {
  return <section id="modalidades" aria-labelledby="modalidades-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-12 pb-10 lg:gap-14 lg:py-32')}>
      <Cabecalho id="modalidades-titulo" rotulo="06 — Modalidades" titulo="Na sua planta ou num cenário preparado." apoio="Escolhemos o formato pelo risco a treinar — não pela conveniência de quem aplica." apoioNoCelular={false} />
      <ul className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {MODALIDADES.map((m) => {
          const Icone = m.icone;
          return <li key={m.nome} className="flex flex-col gap-4 rounded-md bg-ds-muted p-5 lg:flex-1 lg:gap-7 lg:p-10">
            <div className="flex items-center gap-3 lg:justify-between">
              <span aria-hidden="true" className="flex rounded-full bg-ds-inverso p-2 text-ds-amarelo lg:p-3"><Icone className="size-5 lg:size-6" /></span>
              <strong className="flex-1 font-ds-display text-[19px] leading-[26px] font-semibold lg:hidden">{m.nome}</strong>
              <Tag tom={m.situacao.tom}>{m.situacao.texto}</Tag>
            </div>
            <div className="hidden flex-col gap-2 lg:flex">
              <span className="ds-caps text-ds-texto-2">Modalidade {m.numero}</span>
              <h3 className="font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em]">{m.nome}</h3>
            </div>
            <div className="flex flex-col gap-1.5 lg:border-t lg:border-ds-borda lg:pt-5">
              <span className="hidden ds-body-s font-medium lg:block">Como funciona</span>
              <p className="ds-body-s lg:ds-body-m lg:text-ds-texto-2">{m.como}</p>
            </div>
            <div className="flex flex-col gap-1.5 lg:border-t lg:border-ds-borda lg:pt-5">
              <span className="hidden ds-body-s font-medium lg:block">Quando faz sentido</span>
              <p className="ds-caption text-ds-texto-2 lg:ds-body-m"><span className="lg:hidden">Quando faz sentido: {m.quandoCurto}</span><span className="hidden lg:inline">{m.quando}</span></p>
            </div>
          </li>;
        })}
      </ul>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 08 · Por que a Space Light
// ---------------------------------------------------------------------------

export function PorQue() {
  return <section id="por-que" aria-labelledby="por-que-titulo" className="scroll-mt-header bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex flex-col gap-6 pt-12 pb-10 lg:gap-14 lg:py-28')}>
      <Cabecalho id="por-que-titulo" escuro rotulo="07 — Por que a Space Light" titulo="Técnica de engenharia, conversa de gente." apoio="O que as equipes de segurança valorizam quando voltam a contratar." apoioNoCelular={false} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
        {DIFERENCIAIS.map((item) => {
          const Icone = item.icone;
          return <li key={item.titulo} className="flex flex-col gap-3 lg:gap-4">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-ds-amarelo text-ds-amarelo lg:size-16"><Icone className="size-5 lg:size-[26px]" /></span>
            <h3 className="font-ds-display text-base leading-6 font-semibold lg:ds-h4">{item.titulo}</h3>
            <p className="ds-caption text-ds-texto-inv-2 lg:ds-body-s"><Resp curto={item.curto} longo={item.texto} /></p>
          </li>;
        })}
      </ul>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 09 · Avaliações no Google
// ---------------------------------------------------------------------------

export function Avaliacoes() {
  return <section id="avaliacoes" aria-labelledby="avaliacoes-titulo" className="scroll-mt-header bg-ds-muted text-ds-texto lg:bg-ds-superficie">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-12 pb-10 lg:gap-12 lg:pt-32 lg:pb-16')}>
      <Cabecalho id="avaliacoes-titulo" rotulo="08 — Quem passou pelo treinamento" titulo="Nota máxima de quem esteve na prática." apoio="Avaliações públicas do perfil da Space Light no Google, deixadas por participantes das turmas." largura="lg:w-[720px]" apoioNoCelular={false} />
      {/* Celular: a nota em linha, antes do carrossel. */}
      <div className="flex items-center gap-3 lg:hidden">
        <span className="font-ds-display text-[40px] leading-[46px] font-bold tracking-[-0.02em]">{PROVA_SOCIAL.nota}</span>
        <div className="flex flex-col gap-1"><Estrelas className="text-base" /><a href={LINK_DAS_AVALIACOES} target="_blank" rel="noreferrer" className="ds-caption text-ds-texto-2 underline underline-offset-4">média de {PROVA_SOCIAL.avaliacoes} avaliações</a></div>
      </div>
      <div className="lg:grid lg:grid-cols-4 lg:gap-6">
        <div className="hidden flex-col justify-between gap-6 rounded-md bg-ds-inverso p-8 text-ds-texto-inv lg:flex">
          <div className="flex flex-col gap-3">
            <span className="ds-caps text-ds-texto-inv-2">Google</span>
            <span className="font-ds-display text-[72px] leading-[72px] font-extrabold tracking-[-0.03em]">{PROVA_SOCIAL.nota}</span>
            <Estrelas className="text-xl" />
            <span className="ds-body-s text-ds-texto-inv-2">média de {PROVA_SOCIAL.avaliacoes} avaliações</span>
          </div>
          <a href={LINK_DAS_AVALIACOES} target="_blank" rel="noreferrer" className="doc-focus inline-flex items-center gap-2 ds-body-s font-medium text-ds-amarelo">Ver todas no Google<ArrowUpRight className="size-4" aria-hidden="true" /></a>
        </div>
        <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:-mx-10 md:scroll-px-10 md:px-10 lg:col-span-3 lg:scroll-px-0 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {AVALIACOES.map((texto) => <li key={texto} className="w-[290px] shrink-0 snap-start lg:w-auto">
            <figure className="flex h-full flex-col justify-between gap-3 rounded-lg bg-ds-superficie p-5 lg:gap-8 lg:rounded-md lg:border lg:border-ds-borda lg:p-8">
              <div className="flex flex-col gap-3 lg:gap-4">
                <Estrelas className="text-xs lg:text-base" />
                <blockquote className="ds-body-m font-semibold lg:font-ds-display lg:text-[19px] lg:leading-[26px]">“{texto}”</blockquote>
              </div>
              <figcaption className="flex items-center gap-3 lg:border-t lg:border-ds-borda lg:pt-5">
                <span aria-hidden="true" className="hidden size-9 items-center justify-center rounded-full bg-ds-muted lg:flex"><User className="size-[18px]" /></span>
                <span className="ds-caption text-ds-texto-2 lg:ds-body-s">Participante · via Google</span>
              </figcaption>
            </figure>
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 10 · Perguntas frequentes
// ---------------------------------------------------------------------------

export function Perguntas() {
  return <section id="perguntas" aria-labelledby="perguntas-titulo" className="scroll-mt-header bg-ds-superficie text-ds-texto">
    <div className={cn(miolo, 'flex flex-col gap-4 pt-12 pb-10 lg:flex-row lg:gap-24 lg:pt-16 lg:pb-32')}>
      <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">
        <Rotulo>09 — Perguntas frequentes</Rotulo>
        <h2 id="perguntas-titulo" className={tituloDeSecao}>Antes de pedir a proposta.</h2>
        <p className="hidden ds-body-s text-ds-texto-2 lg:block">Não achou sua dúvida? Fale no <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className="underline underline-offset-4">WhatsApp: {WHATSAPP.numero}</a>.</p>
      </div>
      <div className="flex-1 border-t border-ds-inverso lg:border-t-0">
        {PERGUNTAS.map((item, i) => <details key={item.pergunta} open={i === 0} className="group border-b border-ds-borda open:border-ds-inverso">
          <summary className="doc-focus flex cursor-pointer list-none items-center gap-4 py-5 lg:py-6 [&::-webkit-details-marker]:hidden">
            <span className="flex-1 ds-body-m font-semibold lg:font-ds-display lg:text-[19px] lg:leading-[26px]">{item.pergunta}</span>
            <span aria-hidden="true" className="flex rounded-full bg-ds-muted p-1.5 group-open:bg-ds-amarelo">
              <Plus className="size-[18px] group-open:hidden" />
              <X className="hidden size-[18px] group-open:block" />
            </span>
          </summary>
          <p className="-mt-2 pb-5 ds-body-s text-ds-texto-2 lg:-mt-3 lg:pb-6 lg:ds-body-m">{item.resposta}</p>
        </details>)}
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// 11 · Chamada final
// ---------------------------------------------------------------------------

export function ChamadaFinal() {
  return <section id="proposta" aria-labelledby="proposta-titulo" className="scroll-mt-header text-ds-texto">
    <Onda tipo="cta" />
    <div className="ds-degrade">
      <div className={cn(miolo, 'flex items-center gap-16 pt-4 pb-12 lg:pt-12 lg:pb-28')}>
        <div className="flex flex-1 flex-col gap-4 lg:gap-6">
          <p className="hidden ds-caps lg:block">10 — Proposta</p>
          <h2 id="proposta-titulo" className="font-ds-display text-[26px] leading-8 font-extrabold tracking-[-0.01em] lg:text-[56px] lg:leading-[60px] lg:tracking-[-0.03em]">Conte o treinamento que a sua empresa precisa.</h2>
          <p className="ds-body-s lg:font-ds-sans lg:text-xl lg:leading-[30px]"><Resp {...TEXTOS.proposta} /></p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href={rotas.contato} className={botao({ variante: 'escuro', tamanho: 'lg' })}>Solicitar proposta<ArrowRight className="size-5" aria-hidden="true" /></Link>
            <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={botao({ variante: 'contorno', tamanho: 'lg', className: 'border-ds-inverso text-ds-texto hover:bg-ds-inverso hover:text-ds-texto-inv' })}>Falar no WhatsApp<MessageCircle className="size-5" aria-hidden="true" /></a>
          </div>
        </div>
        <Image src="/images/branding/simbolo-preto.svg" alt="" width={226} height={240} unoptimized className="hidden h-60 w-auto shrink-0 lg:block" />
      </div>
    </div>
  </section>;
}
