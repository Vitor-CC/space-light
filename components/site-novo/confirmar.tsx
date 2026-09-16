import { cn } from '@/lib/utils';

/**
 * Informação que a Space Light ainda precisa confirmar. Fica visível na tela
 * de propósito e nunca deve ser trocada por um exemplo plausível. O atributo
 * `data-confirmar` permite listar todos os marcadores de uma página.
 */
export function Confirmar({
  children,
  bloco = false,
  className,
}: {
  children: string;
  bloco?: boolean;
  className?: string;
}) {
  const Tag = bloco ? 'p' : 'span';
  return (
    <Tag
      data-confirmar=""
      className={cn(
        'max-w-measure border border-dashed border-doc-mark px-2.5 py-1.5 font-doc-mono text-xs leading-relaxed text-doc-mark',
        bloco ? 'block' : 'inline-block',
        className,
      )}
    >
      {`{{CONFIRMAR: ${children}}}`}
    </Tag>
  );
}
