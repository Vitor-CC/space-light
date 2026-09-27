'use client';

import { ArrowUpRight, User } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Cabecalho, Estrelas } from '@/components/site-novo/blocos';
import type { AvaliacoesDoGoogle } from '@/lib/site-novo/avaliacoes-google';

type Fixas = { nota: string; total: number; link: string; textos: readonly string[] };
type Cartao = { texto: string; estrelas: number; autor?: string; foto?: string | null; perfil?: string | null; quando?: string; link?: string | null };

const nota = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Seção "Quem passou pelo treinamento" da home. Abre com as avaliações fixas
 * e, quando a seção chega perto da tela, busca as do Google na hora
 * (/api/public/avaliacoes). Se a integração não estiver ligada ou a consulta
 * falhar, as fixas ficam. Com as do Google, cada cartão mostra nome, foto e
 * link de quem avaliou e o link da avaliação no Google Maps, como o Google
 * exige.
 */
export function AvaliacoesDoGoogleNaHome({ fixas }: { fixas: Fixas }) {
  const [aoVivo, setAoVivo] = useState<AvaliacoesDoGoogle | null>(null);
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = area.current;
    if (!alvo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return;
      observador.disconnect();
      fetch('/api/public/avaliacoes', { cache: 'no-store' })
        .then((resposta) => (resposta.status === 200 ? (resposta.json() as Promise<AvaliacoesDoGoogle>) : null))
        .then((dados) => { if (dados && dados.avaliacoes.length > 0) setAoVivo(dados); })
        .catch(() => { /* ficam as fixas */ });
    }, { rootMargin: '300px 0px' });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  const valor = aoVivo ? nota(aoVivo.nota) : fixas.nota;
  const total = aoVivo?.total ?? fixas.total;
  const link = aoVivo?.link ?? fixas.link;
  const estrelas = aoVivo ? Math.round(aoVivo.nota) : 5;
  // "Nota máxima" só enquanto a nota do Google for 5,0.
  const titulo = !aoVivo || aoVivo.nota >= 4.95 ? 'Nota máxima de quem esteve na prática.' : 'O que diz quem esteve na prática.';
  const cartoes: Cartao[] = aoVivo ? aoVivo.avaliacoes.slice(0, 3) : fixas.textos.map((texto) => ({ texto, estrelas: 5 }));

  return <div ref={area} className="flex flex-col gap-4 lg:gap-12">
    <Cabecalho id="avaliacoes-titulo" rotulo="08 — Quem passou pelo treinamento" titulo={titulo} apoio="Avaliações públicas do perfil da Space Light no Google, deixadas por participantes das turmas." largura="lg:w-[720px]" apoioNoCelular={false} />
    {/* Celular: a nota em linha, antes do carrossel. */}
    <div className="flex items-center gap-3 lg:hidden">
      <span className="font-ds-display text-[40px] leading-[46px] font-bold tracking-[-0.02em]">{valor}</span>
      <div className="flex flex-col gap-1"><Estrelas quantidade={estrelas} className="text-base" /><a href={link} target="_blank" rel="noreferrer" className="ds-caption text-ds-texto-2 underline underline-offset-4">média de {total} avaliações{aoVivo ? ' no Google Maps' : ''}</a></div>
    </div>
    <div className="lg:grid lg:grid-cols-4 lg:gap-6">
      <div className="hidden flex-col justify-between gap-6 rounded-md bg-ds-inverso p-8 text-ds-texto-inv lg:flex">
        <div className="flex flex-col gap-3">
          <span className="ds-caps text-ds-texto-inv-2">{aoVivo ? 'Google Maps' : 'Google'}</span>
          <span className="font-ds-display text-[72px] leading-[72px] font-extrabold tracking-[-0.03em]">{valor}</span>
          <Estrelas quantidade={estrelas} className="text-xl" />
          <span className="ds-body-s text-ds-texto-inv-2">média de {total} avaliações</span>
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="doc-focus inline-flex items-center gap-2 ds-body-s font-medium text-ds-amarelo">Ver todas no Google<ArrowUpRight className="size-4" aria-hidden="true" /></a>
      </div>
      <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:-mx-10 md:scroll-px-10 md:px-10 lg:col-span-3 lg:scroll-px-0 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
        {cartoes.map((cartao, i) => <li key={`${i}-${cartao.texto.slice(0, 24)}`} className="w-[290px] shrink-0 snap-start lg:w-auto">
          <figure className="flex h-full flex-col justify-between gap-3 rounded-lg bg-ds-superficie p-5 lg:gap-8 lg:rounded-md lg:border lg:border-ds-borda lg:p-8">
            <div className="flex flex-col gap-3 lg:gap-4">
              <Estrelas quantidade={cartao.estrelas} className="text-xs lg:text-base" />
              <blockquote className="line-clamp-6 ds-body-m font-semibold lg:font-ds-display lg:text-[19px] lg:leading-[26px]">“{cartao.texto}”</blockquote>
            </div>
            {cartao.autor ? <figcaption className="flex items-center gap-3 lg:border-t lg:border-ds-borda lg:pt-5">
              {cartao.foto
                ? <Image src={cartao.foto} alt="" width={36} height={36} unoptimized referrerPolicy="no-referrer" className="size-8 shrink-0 rounded-full object-cover lg:size-9" />
                : <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ds-muted lg:size-9"><User className="size-4" /></span>}
              <span className="flex min-w-0 flex-col">
                {cartao.perfil
                  ? <a href={cartao.perfil} target="_blank" rel="noreferrer" className="doc-focus truncate ds-body-s font-medium hover:underline">{cartao.autor}</a>
                  : <span className="truncate ds-body-s font-medium">{cartao.autor}</span>}
                <span className="ds-caption text-ds-texto-2">
                  {cartao.quando}{cartao.quando && cartao.link ? ' · ' : ''}
                  {cartao.link ? <a href={cartao.link} target="_blank" rel="noreferrer" className="doc-focus underline underline-offset-2">ver no Google</a> : null}
                </span>
              </span>
            </figcaption> : <figcaption className="flex items-center gap-3 lg:border-t lg:border-ds-borda lg:pt-5">
              <span aria-hidden="true" className="hidden size-9 items-center justify-center rounded-full bg-ds-muted lg:flex"><User className="size-[18px]" /></span>
              <span className="ds-caption text-ds-texto-2 lg:ds-body-s">Participante · via Google</span>
            </figcaption>}
          </figure>
        </li>)}
      </ul>
    </div>
  </div>;
}
