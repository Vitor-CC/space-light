import { ArrowRight, Check, ChevronRight, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { miolo, Rotulo } from '@/components/site-novo/blocos';
import { botao } from '@/components/site-novo/botao';
import { LAUDOS } from '@/lib/site-novo/laudos';
import { rotas } from '@/lib/site-novo/rotas';
import { NOME_DA_EMPRESA, imagemOg, metadadosDaPagina } from '@/lib/site-novo/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = metadadosDaPagina({
  titulo: `Laudos técnicos NR 13, NR 15 e NR 16 | ${NOME_DA_EMPRESA}`,
  descricao:
    'Laudos de caldeiras e vasos de pressão (NR 13), insalubridade (NR 15) e periculosidade (NR 16), com o texto oficial de cada norma.',
  caminho: rotas.laudos,
  imagem: imagemOg('home'),
  alt: 'Space Light Engenharia — laudos técnicos de NR 13, NR 15 e NR 16.',
});

/**
 * Laudos técnicos (NR 13, 15 e 16). Não existe desenho no Figma: a página usa
 * a abertura escura e os cartões das páginas de norma, para parecer parte do site.
 */
export default function PaginaDeLaudos() {
  return <>
    <section aria-labelledby="laudos-titulo" className="bg-ds-inverso text-ds-texto-inv">
      <div className={cn(miolo, 'flex flex-col gap-5 pt-5 pb-12 lg:gap-8 lg:pt-10 lg:pb-20')}>
        <nav aria-label="Trilha" className="ds-body-s text-ds-texto-inv-2">
          <ol className="flex items-center gap-2">
            <li><Link href={rotas.inicio} className="doc-focus hover:text-ds-texto-inv">Início</Link></li>
            <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
            <li aria-current="page" className="font-medium text-ds-texto-inv">Laudos</li>
          </ol>
        </nav>
        <Rotulo escuro>Laudos técnicos</Rotulo>
        <h1 id="laudos-titulo" className="max-w-[900px] font-ds-display text-[40px] leading-[44px] font-extrabold tracking-[-0.025em] lg:text-[56px] lg:leading-[60px] lg:tracking-[-0.03em]">
          Laudos de NR 13, NR 15 e NR 16.
        </h1>
        <p className="max-w-[760px] ds-body-m text-ds-texto-inv-2 lg:font-ds-sans lg:text-xl lg:leading-[30px]">
          Além dos treinamentos, a Space Light elabora os laudos que essas normas pedem: inspeção de caldeiras e vasos de pressão, insalubridade e periculosidade.
        </p>
        <Link href={rotas.contato} className={botao({ tamanho: 'lg', className: 'w-full sm:w-fit' })}>Solicitar proposta<ArrowRight className="size-5" aria-hidden="true" /></Link>
      </div>
    </section>

    <section aria-label="Laudos" className="bg-ds-muted text-ds-texto">
      <ul className={cn(miolo, 'grid gap-5 py-12 lg:grid-cols-3 lg:gap-6 lg:py-24')}>
        {LAUDOS.map((laudo) => <li key={laudo.slug} className="flex flex-col gap-6 rounded-md bg-ds-superficie p-6 lg:p-8">
          <div className="flex flex-col gap-2">
            <span className="font-ds-display text-[40px] leading-[44px] font-extrabold tracking-[-0.025em] text-ds-amarelo-texto">{laudo.codigo}</span>
            <h2 className="ds-h4">{laudo.nome}</h2>
          </div>
          <p className="ds-body-s text-ds-texto-2">{laudo.resumo}</p>
          <ul className="flex flex-col gap-3 border-t border-ds-borda pt-5">
            {laudo.pontos.map((ponto) => <li key={ponto} className="flex gap-3 ds-body-s"><Check className="mt-0.5 size-4 shrink-0 text-ds-amarelo-texto" aria-hidden="true" />{ponto}</li>)}
          </ul>
          <div className="mt-auto flex flex-col gap-4">
            <a href={laudo.fonte.url} target="_blank" rel="noreferrer" className="doc-focus inline-flex items-start gap-2 ds-caption text-ds-texto-2 hover:text-ds-texto hover:underline"><FileText className="mt-px size-3.5 shrink-0" aria-hidden="true" />Fonte: {laudo.fonte.rotulo}</a>
            <Link href={rotas.proposta(laudo.slug)} className={botao({ variante: 'contorno', className: 'w-full' })}>Pedir laudo {laudo.codigo}<ArrowRight className="size-[18px]" aria-hidden="true" /></Link>
          </div>
        </li>)}
      </ul>
    </section>
  </>;
}
