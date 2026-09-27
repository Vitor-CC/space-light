import { Star } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/*
 * Peças que a home e as páginas de norma repetem, tiradas do Figma ("02 · Site
 * Desktop" e "03 · Site Mobile"). Medidas: 1440 com margem de 120, 390 com
 * margem de 20.
 */

export const miolo = 'mx-auto w-full max-w-[1440px] px-5 md:px-10 xl:px-[120px]';

export const tituloDeSecao =
  'font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]';

/** Texto do celular e do desktop, quando o Figma encurta no celular. */
export function Resp({ curto, longo }: { curto: string; longo: string }) {
  if (curto === longo) return <>{longo}</>;
  return <><span className="lg:hidden">{curto}</span><span className="hidden lg:inline">{longo}</span></>;
}

/** Cinco estrelas da nota do Google; o número vem sempre em texto ao lado. */
export function Estrelas({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center gap-0.5 text-ds-amarelo', className)}>
    <span className="sr-only">5 de 5 estrelas</span>
    {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-[1em] fill-current" aria-hidden="true" />)}
  </span>;
}

export function Rotulo({ children, escuro = false, className }: { children: ReactNode; escuro?: boolean; className?: string }) {
  return <p className={cn('ds-caps', escuro ? 'text-ds-amarelo' : 'text-ds-amarelo-texto', className)}>{children}</p>;
}

/** "Cabeçalho da seção": rótulo e título à esquerda, texto de apoio à direita no desktop. */
export function Cabecalho({ id, rotulo, titulo, apoio, escuro = false, largura = 'lg:w-[640px]', apoioNoCelular = true }: { id?: string; rotulo: string; titulo: ReactNode; apoio?: ReactNode; escuro?: boolean; largura?: string; apoioNoCelular?: boolean }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
    <div className={cn('flex flex-col gap-4 lg:shrink-0 lg:gap-5', largura)}>
      <Rotulo escuro={escuro}>{rotulo}</Rotulo>
      <h2 id={id} className={cn(tituloDeSecao, escuro ? 'text-ds-texto-inv' : 'text-ds-texto')}>{titulo}</h2>
    </div>
    {apoio ? <p className={cn('ds-body-s lg:flex-1 lg:ds-body-m', escuro ? 'text-ds-texto-inv-2' : 'text-ds-texto-2', !apoioNoCelular && 'hidden lg:block')}>{apoio}</p> : null}
  </div>;
}

/** Foto com o degradê escuro embaixo e a legenda por cima, como os blocos "FOTO · NR" do Figma. */
export function FotoLegendada({ src, alt, norma, legenda, sizes, className, prioridade = false, legendaNoCelular = true }: { src: string; alt: string; norma: string; legenda: string; sizes: string; className?: string; prioridade?: boolean; legendaNoCelular?: boolean }) {
  return <figure className={cn('relative flex flex-col justify-end overflow-hidden rounded-md bg-[#3b3b3b] p-3.5 lg:p-5', className)}>
    <Image src={src} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,19,21,0)_35%,rgba(17,19,21,0.9)_100%)]" />
    <figcaption className="relative flex flex-col gap-1 lg:gap-1.5">
      <span className="ds-caps text-ds-amarelo">Foto · {norma}</span>
      <span className={cn('ds-body-s text-ds-texto-inv', !legendaNoCelular && 'hidden lg:block')}>{legenda}</span>
    </figcaption>
  </figure>;
}

/**
 * As ondas da marca, montadas com as camadas exportadas do Figma. O fundo de
 * cada uma é a cor da seção de cima: `divisor` sai do preto para o degradê e
 * `cta` sai do fundo da seção (branco, ou o cinza de "Outras normas") para o
 * degradê da chamada final.
 */
export function Onda({ tipo, fundo, className }: { tipo: 'divisor' | 'cta'; fundo?: string; className?: string }) {
  const camadas = tipo === 'divisor'
    ? { altura: 'h-14 lg:h-[120px]', fundo: 'bg-ds-inverso', degrade: 'inset-[25.62%_0_0_0]', linha: 'inset-[13.95%_0_25.78%_0]', folga: 'inset-[-1.04%_0]' }
    : { altura: 'h-12 lg:h-[120px]', fundo: 'bg-ds-superficie', degrade: 'inset-[18.75%_0_0_0]', linha: 'inset-[7.08%_0_38.92%_0]', folga: 'inset-[-1.16%_0]' };
  const base = `/images/branding/onda-${tipo}`;
  return <div aria-hidden="true" className={cn('relative w-full', camadas.altura, fundo ?? camadas.fundo, className)}>
    <div className={cn('absolute', camadas.degrade)}><Image src={`${base}-degrade.svg`} alt="" width={1440} height={90} unoptimized className="absolute inset-0 block size-full" /></div>
    <div className={cn('absolute', camadas.linha)}><div className={cn('absolute', camadas.folga)}><Image src={`${base}-linha.svg`} alt="" width={1440} height={72} unoptimized className="block size-full" /></div></div>
  </div>;
}

/**
 * Onda das páginas de norma ("Onda", 80 px no desktop e 40 no celular): o preto
 * da abertura desce em curva sobre o branco, com um fio em degradê na borda.
 * As curvas são as do Figma, uma para cada largura.
 */
export function OndaDaAbertura({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('bg-ds-superficie', className)}>
    <svg viewBox="0 0 390 40" preserveAspectRatio="none" className="block h-10 w-full lg:hidden">
      <defs><linearGradient id="onda-abertura-celular" x1="0" x2="390" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#fac600" /><stop offset="1" stopColor="#eb9336" /></linearGradient></defs>
      <path d="M0 0H390V14C330 2 280 6 210 22C140 38 70 40 0 22V0Z" fill="#000" />
      <path d="M0 22C70 40 140 38 210 22C280 6 330 2 390 14" fill="none" stroke="url(#onda-abertura-celular)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="hidden h-20 w-full lg:block">
      <defs><linearGradient id="onda-abertura-desktop" x1="0" x2="1440" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#fac600" /><stop offset="1" stopColor="#eb9336" /></linearGradient></defs>
      <path d="M0 0H1440V30C1250 6 1040 16 780 48C520 80 260 86 0 44V0Z" fill="#000" />
      <path d="M0 44C260 86 520 80 780 48C1040 16 1250 6 1440 30" fill="none" stroke="url(#onda-abertura-desktop)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
    </svg>
  </div>;
}
