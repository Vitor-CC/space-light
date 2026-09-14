import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const variantes = cva(
  'doc-focus inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variante: {
        primario: 'bg-sl-gold text-sl-black hover:bg-sl-orange',
        contorno:
          'border border-doc-ink text-doc-ink hover:bg-doc-ink hover:text-doc-paper',
      },
      tamanho: {
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variante: 'primario', tamanho: 'md' },
  },
);

/**
 * Botão do site novo, aplicado em `<Link>` ou `<button>`. Ouro é ação; o
 * contorno é a ação secundária. Sem sombra e sem raio.
 *
 * Passa por `cn` para que a `className` vença a base quando as duas mexem na
 * mesma propriedade — `hidden lg:inline-flex` precisa derrubar o `inline-flex`.
 */
export function botao({
  className,
  ...opcoes
}: VariantProps<typeof variantes> & { className?: string } = {}) {
  return cn(variantes(opcoes), className);
}
