'use client';

import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

const itemNav =
  'doc-focus inline-flex h-10 items-center gap-1 font-ds-sans text-sm leading-5 font-medium text-ds-texto-inv decoration-ds-amarelo decoration-2 underline-offset-[10px] hover:underline';

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
      <NavigationMenu.List className="flex items-center gap-9">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger
            className={cn(itemNav, 'data-popup-open:underline')}
          >
            Treinamentos
            <NavigationMenu.Icon className="transition-transform duration-150 data-popup-open:rotate-180">
              <ChevronDown className="size-4" aria-hidden="true" />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[27rem] p-2 text-ds-texto">
            <ul>
              {NORMAS.map((norma) => (
                <li
                  key={norma.slug}
                  className="border-b border-doc-rule last:border-b-0"
                >
                  <NavigationMenu.Link
                    closeOnClick
                    render={<Link href={rotas.norma(norma.slug)} />}
                    className="doc-focus flex items-baseline gap-4 rounded-md px-3 py-3 hover:bg-ds-muted"
                  >
                    <span className="w-12 shrink-0 ds-caps text-ds-amarelo-texto">
                      {norma.codigo}
                    </span>
                    <span className="ds-body-s font-medium">{norma.nome}</span>
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
            render={<Link href={rotas.portalCliente} />}
            className={itemNav}
          >
            Portal do cliente
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
        {/* sideOffset: o popup abre logo abaixo do fio inferior do cabeçalho. */}
        <NavigationMenu.Positioner
          side="bottom"
          align="start"
          sideOffset={20}
          className="doc-ui z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)"
        >
          <NavigationMenu.Popup className="relative h-(--popup-height) w-(--popup-width) rounded-lg border border-ds-borda bg-ds-superficie text-ds-texto shadow-xl outline-none">
            <NavigationMenu.Viewport className="relative size-full overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
