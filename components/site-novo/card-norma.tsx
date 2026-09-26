import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import type { Norma } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';

/**
 * "Card / Treinamento NR" do Figma: código grande em Archivo, seta no canto,
 * nome, descrição e a linha de meta embaixo. No hover inverte para preto com
 * o código em amarelo.
 */
export function CardNorma({ norma, meta = 'Ver treinamento' }: { norma: Norma; meta?: string }) {
  return (
    <Link href={rotas.norma(norma.slug)} className="doc-focus group flex min-h-[260px] flex-col rounded-md sm:min-h-[323px] border border-ds-borda bg-ds-superficie p-7 text-ds-texto transition-colors duration-200 hover:border-ds-inverso hover:bg-ds-inverso hover:text-ds-texto-inv">
      <div className="flex items-start justify-between gap-4">
        <span className="font-ds-codigo text-5xl leading-none font-extrabold tracking-[-0.03em] transition-colors group-hover:text-ds-amarelo">{norma.codigo}</span>
        <ArrowUpRight className="size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ds-amarelo" aria-hidden="true" />
      </div>
      <h3 className="mt-10 ds-h4">{norma.nome}</h3>
      <p className="mt-2 ds-body-s text-ds-texto-2 transition-colors group-hover:text-ds-texto-inv-2">{norma.linha}</p>
      <span className="mt-auto block border-t border-ds-borda pt-4 ds-caps text-ds-texto-2 transition-colors group-hover:border-ds-borda-inv group-hover:text-ds-texto-inv-2">{meta}</span>
    </Link>
  );
}
