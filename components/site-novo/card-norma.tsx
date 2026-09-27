import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import type { Norma } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

/**
 * "Card / Treinamento NR" do Figma: código grande em Archivo, seta no canto,
 * nome, descrição e a linha de meta embaixo. No hover inverte para preto com
 * o código em amarelo; `destaque` deixa o card já invertido (a NR 23 na home).
 */
export function CardNorma({ norma, destaque = false, className }: { norma: Norma; destaque?: boolean; className?: string }) {
  return (
    <Link
      href={rotas.norma(norma.slug)}
      className={cn(
        'doc-focus group flex min-h-[260px] flex-col rounded-md border p-7 transition-colors duration-200 sm:min-h-[323px]',
        destaque
          ? 'border-ds-inverso bg-ds-inverso text-ds-texto-inv'
          : 'border-ds-borda bg-ds-superficie text-ds-texto hover:border-ds-inverso hover:bg-ds-inverso hover:text-ds-texto-inv',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={cn('font-ds-codigo text-5xl leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap transition-colors', destaque ? 'text-ds-amarelo' : 'group-hover:text-ds-amarelo')}>{norma.codigo}</span>
        <ArrowUpRight className={cn('size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5', destaque ? 'text-ds-amarelo' : 'group-hover:text-ds-amarelo')} aria-hidden="true" />
      </div>
      <h3 className="mt-10 ds-h4">{norma.nome}</h3>
      <p className={cn('mt-2 ds-body-s transition-colors', destaque ? 'text-ds-texto-inv-2' : 'text-ds-texto-2 group-hover:text-ds-texto-inv-2')}>{norma.linha}</p>
      <span className={cn('mt-auto block border-t pt-4 ds-caps transition-colors', destaque ? 'border-ds-borda-inv text-ds-texto-inv-2' : 'border-ds-borda text-ds-texto-2 group-hover:border-ds-borda-inv group-hover:text-ds-texto-inv-2')}>{norma.meta}</span>
    </Link>
  );
}
