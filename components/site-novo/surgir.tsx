'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const GRUPO = '[data-surgir]';
const DESLOCAMENTO = 16;
const DURACAO = 480;
const ESCALONAMENTO = 60;
/** Acima disso os irmãos entram juntos: ninguém espera meio segundo. */
const PASSOS = 6;

/**
 * Os filhos de um `[data-surgir]` são o que entra. Filho que contém outro
 * grupo não entra inteiro: desce até os itens do grupo de dentro, para uma
 * lista dentro de uma grade entrar item a item e não como um bloco.
 */
function alvosDoGrupo(grupo: Element): Element[] {
  return [...grupo.children].flatMap((filho) =>
    filho.matches(GRUPO) || filho.querySelector(GRUPO)
      ? alvosDoGrupo(filho)
      : [filho],
  );
}

/**
 * Movimento do site novo: fade + subida de 16px ao entrar na viewport,
 * escalonado em 60ms entre irmãos.
 *
 * Nada fica parado em `opacity: 0`. O CSS da página não esconde nada — quem
 * abre o link, quem não tem JavaScript e quem imprime vê tudo montado. O que já
 * está na tela (ou acima) ao carregar nunca anima; só o que ainda está abaixo
 * é observado, e a animação existe só durante a entrada (`fill: backwards`),
 * sem estilo residual. Com `prefers-reduced-motion`, não roda.
 */
export function Surgir() {
  const caminho = usePathname();

  useEffect(() => {
    if (
      typeof IntersectionObserver === 'undefined' ||
      typeof Element.prototype.animate !== 'function' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const principal = document.getElementById('conteudo');
    if (!principal) return;

    const grupos = [...principal.querySelectorAll(GRUPO)].filter(
      (grupo) => !grupo.parentElement?.closest(GRUPO),
    );

    const observador = new IntersectionObserver((entradas) => {
      const passos = new Map<Element | null, number>();
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const alvo = entrada.target;
        observador.unobserve(alvo);
        const passo = passos.get(alvo.parentElement) ?? 0;
        passos.set(alvo.parentElement, passo + 1);
        alvo.animate(
          [
            { opacity: 0, transform: `translateY(${DESLOCAMENTO}px)` },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: DURACAO,
            delay: Math.min(passo, PASSOS) * ESCALONAMENTO,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            fill: 'backwards',
          },
        );
      }
    });

    const dobra = window.innerHeight;
    for (const alvo of grupos.flatMap(alvosDoGrupo)) {
      // Escondido (`display: none`) mede zero e fica de fora também.
      if (alvo.getBoundingClientRect().top < dobra) continue;
      observador.observe(alvo);
    }

    return () => observador.disconnect();
  }, [caminho]);

  return null;
}
