import { cn } from '@/lib/utils';

/** Marcadores curtos em monoespaçada, um por linha de fio. */
export function Marcadores({
  itens,
  className,
}: {
  itens: readonly string[];
  className?: string;
}) {
  return (
    <ul
      className={cn('grid gap-x-4 border-t border-doc-rule-strong', className)}
    >
      {itens.map((item) => (
        <li
          key={item}
          className="flex items-center gap-3 border-b border-doc-rule-strong py-3 font-doc-mono text-xs tracking-[0.06em] text-doc-ink uppercase"
        >
          <span aria-hidden="true" className="size-1.5 shrink-0 bg-sl-gold" />
          {item}
        </li>
      ))}
    </ul>
  );
}
