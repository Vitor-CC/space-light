import Image from 'next/image';
import type { ReactNode } from 'react';

import { miolo } from '@/components/site-novo/blocos';
import { cn } from '@/lib/utils';

/*
 * Telas de erro do Figma ("Erro 404 · Página não encontrada" e "Erro 500 ·
 * Algo deu errado"): fundo preto, texto à esquerda e a ilustração à direita.
 * No celular a ilustração vem primeiro e os botões ficam no pé da tela.
 */

export function TelaDeErro({ selo, titulo, texto, acoes, extra, ilustracao }: { selo: string; titulo: string; texto: ReactNode; acoes: ReactNode; extra?: ReactNode; ilustracao: ReactNode }) {
  return <section aria-labelledby="erro-titulo" className="bg-ds-inverso text-ds-texto-inv">
    <div className={cn(miolo, 'flex min-h-[calc(100dvh-var(--spacing-header))] flex-col gap-5 py-8 lg:min-h-[819px] lg:flex-row lg:items-center lg:gap-20 lg:py-16')}>
      <div className="flex justify-center lg:order-last lg:size-[480px] lg:shrink-0 lg:items-center">{ilustracao}</div>
      <div className="flex flex-1 flex-col gap-4 lg:gap-6">
        <p className="hidden w-fit rounded-full border-[1.2px] border-ds-amarelo px-3 py-1.5 ds-caps text-ds-amarelo lg:block">{selo}</p>
        <h1 id="erro-titulo" className="font-ds-display text-[40px] leading-[44px] font-extrabold tracking-[-0.025em] lg:text-[56px] lg:leading-[60px] lg:tracking-[-0.03em]">{titulo}</h1>
        <p className="ds-body-m text-ds-texto-inv-2 lg:font-ds-sans lg:text-xl lg:leading-[30px]">{texto}</p>
        <div className="mt-auto flex flex-col gap-3.5 pt-6 sm:flex-row sm:flex-wrap lg:mt-0 lg:pt-0">{acoes}</div>
        {extra}
      </div>
    </div>
  </section>;
}

/** Placa de saída com o 404, no degradê da marca. */
export function PlacaDe404() {
  return <div aria-hidden="true" className="w-full rounded-[14px] ds-degrade p-2.5 lg:w-[432px] lg:rounded-[18px] lg:p-3.5">
    <div className="flex h-44 flex-col items-center justify-center gap-5 rounded-lg border-4 border-ds-inverso lg:h-[264px] lg:rounded-[10px]">
      <span className="font-ds-display text-[96px] leading-none font-bold text-ds-texto lg:text-[150px]">404</span>
      <span className="hidden gap-3.5 lg:flex">{Array.from({ length: 10 }, (_, i) => <span key={i} className="size-2.5 rounded-full bg-ds-inverso" />)}</span>
    </div>
  </div>;
}

/** Símbolo da marca apagado dentro de um círculo tracejado. */
export function SeloDeErro() {
  return <div aria-hidden="true" className="flex size-40 items-center justify-center rounded-full border-2 border-dashed border-ds-amarelo lg:size-80">
    <Image src="/images/branding/logo-simbolo.svg" alt="" width={180} height={192} unoptimized className="h-24 w-auto opacity-35 lg:h-48" />
  </div>;
}
