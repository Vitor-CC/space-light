import { texto } from '@/components/site-novo/texto';
import { cn } from '@/lib/utils';

type Item = { readonly titulo: string; readonly texto: string };

/**
 * Itens separados por fio, sem card e sem ícone. `numerada` só quando os itens
 * formam uma sequência (etapas do método, pontos da prática); o número é
 * visual, a ordem já vem do `<ol>`.
 */
export function ListaDeItens({
  itens,
  numerada = false,
  className,
}: {
  itens: readonly Item[];
  numerada?: boolean;
  className?: string;
}) {
  const Lista = numerada ? 'ol' : 'ul';
  return (
    <Lista className={cn('border-t border-doc-ink', className)}>
      {itens.map((item, indice) => (
        <li
          key={item.titulo}
          className={cn(
            'border-b border-doc-rule-strong py-5',
            numerada && 'grid grid-cols-[2.75rem_minmax(0,1fr)]',
          )}
        >
          {numerada ? (
            <span
              aria-hidden="true"
              className="pt-0.5 font-doc-mono text-sm font-semibold tabular-nums text-doc-mark"
            >
              {String(indice + 1).padStart(2, '0')}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className={texto.tituloItem}>{item.titulo}</h3>
            <p className="mt-2 max-w-measure text-base leading-relaxed text-doc-ink-muted">
              {item.texto}
            </p>
          </div>
        </li>
      ))}
    </Lista>
  );
}
