import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Foto enquadrada por um fio, com a legenda logo abaixo em monoespaçada e
 * negrito. Nunca como fundo atrás de texto.
 */
export function Figura({
  src,
  alt,
  legenda,
  marcador,
  sizes,
  prioridade = false,
  posicao,
  proporcao = 'aspect-[4/3]',
  className,
}: {
  src: string;
  alt: string;
  legenda: string;
  /** Rótulo curto acima da legenda, como o código da norma. */
  marcador?: string;
  sizes: string;
  prioridade?: boolean;
  /** `object-position` da foto dentro do enquadramento. */
  posicao?: string;
  proporcao?: string;
  className?: string;
}) {
  return (
    <figure className={cn('min-w-0', className)}>
      <div
        className={cn(
          'relative overflow-hidden border border-doc-rule-strong bg-doc-sheet',
          proporcao,
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // `priority` está obsoleto no Next 16; a doc recomenda eager + high.
          loading={prioridade ? 'eager' : undefined}
          fetchPriority={prioridade ? 'high' : undefined}
          className="object-cover"
          style={posicao ? { objectPosition: posicao } : undefined}
        />
      </div>
      <figcaption className="mt-2.5 font-doc-mono text-xs leading-snug text-doc-ink-muted">
        {marcador ? (
          <span className="block text-doc-ink">{marcador}</span>
        ) : null}
        <span className={cn('block font-semibold', marcador && 'mt-1')}>
          {legenda}
        </span>
      </figcaption>
    </figure>
  );
}
