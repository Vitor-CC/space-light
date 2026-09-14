'use client';

import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

const itemNav =
  'doc-focus inline-flex h-10 items-center gap-1.5 px-3 text-sm font-semibold text-doc-ink decoration-sl-gold decoration-2 underline-offset-[10px] hover:underline';

/**
 * Navegação a partir de 1024. "Treinamentos" abre o índice das normas, que
 * pende do fio inferior do cabeçalho como uma folha: fio de 1px, sem sombra.
 * Montado direto nas partes do Base UI porque o `navigation-menu` do kit fixa
 * sombra no popup.
 */
export function DesktopNav() {
  return (
    <NavigationMenu.Root
      aria-label="Navegação principal"
      className="hidden lg:block"
    >
      <NavigationMenu.List className="flex items-center">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger
            className={cn(itemNav, 'data-popup-open:underline')}
          >
            Treinamentos
            <NavigationMenu.Icon className="transition-transform duration-150 data-popup-open:rotate-180">
              <ChevronDown className="size-4" aria-hidden="true" />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[27rem] p-2">
            <ul>
              {NORMAS.map((norma) => (
                <li
                  key={norma.slug}
                  className="border-b border-doc-rule last:border-b-0"
                >
                  <NavigationMenu.Link
                    closeOnClick
                    render={<Link href={rotas.norma(norma.slug)} />}
                    className="doc-focus flex items-baseline gap-4 px-3 py-3 hover:bg-doc-paper"
                  >
                    <span className="w-12 shrink-0 font-doc-mono text-sm font-semibold text-doc-mark">
                      {norma.codigo}
                    </span>
                    <span className="text-sm font-semibold">{norma.nome}</span>
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link href={rotas.comoTrabalhamos} />}
            className={itemNav}
          >
            Como trabalhamos
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link href={rotas.contato} />}
            className={itemNav}
          >
            Contato
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        {/* sideOffset 17: o topo do popup encosta no fio inferior do cabeçalho
            (72px de altura, gatilho de 40px centralizado, + 1px de fio). */}
        <NavigationMenu.Positioner
          side="bottom"
          align="start"
          sideOffset={17}
          className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)"
        >
          <NavigationMenu.Popup className="relative h-(--popup-height) w-(--popup-width) border border-t-0 border-doc-rule-strong bg-doc-sheet text-doc-ink outline-none">
            <NavigationMenu.Viewport className="relative size-full overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
