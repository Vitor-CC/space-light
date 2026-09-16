import { cn } from '@/lib/utils';

/** Lista de pontos curtos, um por linha de fio, com marcador dourado. */
export function ListaSimples({
  itens,
  className,
}: {
  itens: readonly string[];
  className?: string;
}) {
  return (
    <ul className={cn('border-t border-doc-ink', className)}>
      {itens.map((item) => (
        <li
          key={item}
          className="flex gap-3 border-b border-doc-rule-strong py-3.5 text-base leading-snug"
        >
          <span
            aria-hidden="true"
            className="mt-[0.45rem] size-1.5 shrink-0 bg-sl-gold"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
