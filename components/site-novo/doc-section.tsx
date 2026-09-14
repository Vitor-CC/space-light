import { cn } from '@/lib/utils';

/**
 * Seção de documento: o fio de abertura com a régua dourada, a coluna de
 * margem (número + rótulo em monoespaçada) e o conteúdo.
 *
 * No celular a margem vira uma linha acima do conteúdo. A partir de 1024 ela é
 * uma coluna própria, separada do conteúdo por um fio vertical que, seção após
 * seção, forma uma linha contínua na página; o número acompanha a leitura
 * enquanto a seção está na tela.
 */
const tons = {
  papel: 'bg-doc-paper text-doc-ink',
  folha: 'bg-doc-sheet text-doc-ink',
  preto: 'dark bg-sl-black text-doc-ink',
  grafite: 'dark bg-sl-graphite text-doc-ink',
} as const;

export type TomDaSecao = keyof typeof tons;

export function DocSection({
  id,
  numero,
  rotulo,
  tom = 'papel',
  className,
  children,
}: {
  id?: string;
  numero: string;
  rotulo: string;
  tom?: TomDaSecao;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-header', tons[tom], className)}>
      <div className="doc-shell">
        <div className="doc-grid border-t border-doc-rule-strong">
          <div className="relative pt-6 lg:pt-12 lg:pr-8">
            <span
              aria-hidden="true"
              className="absolute -top-px left-0 h-[3px] w-10 bg-sl-gold"
            />
            <p className="flex items-baseline gap-3 lg:sticky lg:top-[calc(var(--doc-header-height)+1.5rem)] lg:flex-col lg:gap-1.5">
              <span className="font-doc-mono text-sm font-semibold tabular-nums text-doc-mark">
                {numero}
              </span>
              <span className="font-doc-mono text-xs leading-snug text-doc-ink-muted">
                {rotulo}
              </span>
            </p>
          </div>
          <div className="min-w-0 pt-6 pb-section lg:border-l lg:border-doc-rule-strong lg:pt-12 lg:pl-12">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
