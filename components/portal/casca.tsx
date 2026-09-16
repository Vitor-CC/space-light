'use client';

import { LogOut, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { AvisoFlutuante, botaoIcone } from '@/components/portal/kit';
import { cn } from '@/lib/utils';

export type ItemDoMenu<T extends string> = { id: T; rotulo: string };

/**
 * Casca dos três portais: cabeçalho com a área e o usuário, menu principal
 * curto (2 a 4 itens) numa linha só — cabe em 375px sem menu escondido.
 */
export function CascaDoPortal<T extends string>({
  area,
  usuario,
  itens,
  ativo,
  aoNavegar,
  aoAtualizar,
  aviso,
  children,
}: {
  area: string;
  usuario?: string;
  itens: readonly ItemDoMenu<T>[];
  ativo: T;
  aoNavegar: (id: T) => void;
  aoAtualizar?: () => void;
  aviso?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="doc-ui flex min-h-dvh flex-col bg-doc-paper text-doc-ink">
      <a
        href="#conteudo"
        className="doc-focus sr-only bg-sl-gold px-4 py-3 text-sm font-semibold text-sl-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-doc-rule-strong bg-doc-paper">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="Space Light Engenharia — site"
              className="doc-focus shrink-0"
            >
              <Image
                src="/images/branding/space-light-logo-oficial.png"
                alt=""
                width={260}
                height={49}
                className="h-6 w-auto"
              />
            </Link>
            <span className="truncate border-l border-doc-rule-strong pl-4 font-doc-mono text-xs text-doc-ink-muted">
              {area}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {usuario ? (
              <span className="hidden max-w-56 truncate font-doc-mono text-xs text-doc-ink-muted md:block">
                {usuario}
              </span>
            ) : null}
            {aoAtualizar ? (
              <button
                type="button"
                onClick={aoAtualizar}
                aria-label="Atualizar dados"
                className={botaoIcone}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <form action="/api/auth/logout" method="post">
              <button type="submit" aria-label="Sair" className={botaoIcone}>
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        {itens.length > 1 ? (
          <nav
            aria-label="Menu do portal"
            className="mx-auto max-w-[90rem] px-4 md:px-8"
          >
            <ul className="flex gap-6 overflow-x-auto">
              {itens.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => aoNavegar(item.id)}
                    aria-current={ativo === item.id ? 'page' : undefined}
                    className={cn(
                      'doc-focus -mb-px shrink-0 border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
                      ativo === item.id
                        ? 'border-sl-gold text-doc-ink'
                        : 'border-transparent text-doc-ink-muted hover:text-doc-ink',
                    )}
                  >
                    {item.rotulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main
        id="conteudo"
        className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 md:px-8 md:py-10"
      >
        {children}
      </main>
      <AvisoFlutuante texto={aviso ?? ''} />
    </div>
  );
}
