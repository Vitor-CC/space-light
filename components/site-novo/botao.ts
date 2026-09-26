import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const variantes = cva(
  'doc-focus inline-flex shrink-0 items-center justify-center gap-2.5 rounded-md whitespace-nowrap transition-colors',
  {
    variants: {
      variante: {
        primario: 'bg-ds-amarelo text-ds-texto hover:bg-[#eab900]',
        contorno:
          'border-[1.5px] border-doc-ink text-doc-ink hover:bg-doc-ink hover:text-doc-paper',
      },
      tamanho: {
        md: 'min-h-11 px-5 py-3 ds-botao',
        lg: 'min-h-14 px-7 py-[18px] font-ds-sans text-[17px] leading-5 font-semibold',
      },
    },
    defaultVariants: { variante: 'primario', tamanho: 'md' },
  },
);

/**
 * Botão do site, aplicado em `<Link>` ou `<button>`: o "Button" do Design
 * System 2026 (amarelo é a ação principal, contorno a secundária, raio 6).
 *
 * Passa por `cn` para que a `className` vença a base quando as duas mexem na
 * mesma propriedade — `hidden lg:inline-flex` precisa derrubar o `inline-flex`.
 */
/**
 * Par de botões: empilhados no celular, lado a lado a partir de 640px e de
 * novo empilhados em 1024, quando ficam numa coluna estreita demais para os
 * dois.
 */
export const linhaDeBotoes =
  'flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row';

export function botao({
  className,
  ...opcoes
}: VariantProps<typeof variantes> & { className?: string } = {}) {
  return cn(variantes(opcoes), className);
}
