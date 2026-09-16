import { texto } from '@/components/site-novo/texto';
import { cn } from '@/lib/utils';

type Item = { readonly titulo: string; readonly texto: string };

/**
 * Itens separados por fio, sem card e sem ícone. `numerada` só quando os itens
 * formam uma sequência (etapas do método, pontos da prática); o número é
 * visual, a ordem já vem do `<ol>`.
 *
 * A partir de 1024 cada item vira uma linha de tabela — número, título e texto
 * lado a lado. `compacta` mantém o título sobre o texto, para quando a lista
 * ocupa só uma das duas colunas.
 */
export function ListaDeItens({
  itens,
  numerada = false,
  compacta = false,
  className,
}: {
  itens: readonly Item[];
  numerada?: boolean;
  compacta?: boolean;
  className?: string;
}) {
  const Lista = numerada ? 'ol' : 'ul';
  return (
    <Lista data-surgir className={cn('border-t border-doc-ink', className)}>
      {itens.map((item, indice) => (
        <li
          key={item.titulo}
          className={cn(
            'grid gap-x-3 border-b border-doc-rule-strong py-5',
            numerada ? 'grid-cols-[2.75rem_minmax(0,1fr)]' : 'grid-cols-1',
            !compacta &&
              (numerada
                ? 'lg:grid-cols-[3.5rem_minmax(0,14rem)_minmax(0,1fr)] lg:items-baseline lg:gap-x-6 xl:grid-cols-[3.5rem_minmax(0,18rem)_minmax(0,1fr)]'
                : 'lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-baseline lg:gap-x-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'),
          )}
        >
          {numerada ? (
            <span
              aria-hidden="true"
              className={cn(
                'row-span-2 pt-0.5 font-doc-mono text-sm font-semibold tabular-nums text-doc-mark',
                !compacta && 'lg:row-span-1 lg:pt-0',
              )}
            >
              {String(indice + 1).padStart(2, '0')}
            </span>
          ) : null}
          <h3 className={texto.tituloItem}>{item.titulo}</h3>
          <p
            className={cn(
              'mt-2 max-w-measure text-base leading-relaxed text-doc-ink-muted',
              !compacta && 'lg:mt-0',
            )}
          >
            {item.texto}
          </p>
        </li>
      ))}
    </Lista>
  );
}
