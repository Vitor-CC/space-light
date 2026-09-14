import { cn } from '@/lib/utils';

type Coluna<Chave extends string> = {
  chave: Chave;
  titulo: string;
  /** A primeira coluna, que identifica a linha. */
  destaque?: boolean;
};

/**
 * Tabela de verdade para dado tabular. No celular, texto longo em três colunas
 * obrigaria a rolar de lado; então cada linha vira um bloco com o título de
 * cada coluna como rótulo. A partir de 768px é uma `<table>` de fato. Só uma
 * das duas fica visível — a outra sai também da árvore de acessibilidade.
 */
export function TabelaDoc<Chave extends string>({
  legenda,
  colunas,
  linhas,
  className,
}: {
  legenda: string;
  colunas: readonly Coluna<Chave>[];
  linhas: readonly Record<Chave, React.ReactNode>[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="md:hidden">
        <p className="pb-3 font-doc-mono text-xs text-doc-ink-muted">
          {legenda}
        </p>
        <ul className="border-t border-doc-ink">
          {linhas.map((linha, indice) => (
            <li key={indice} className="border-b border-doc-rule-strong py-5">
              <dl className="grid gap-4">
                {colunas.map((coluna) => (
                  <div key={coluna.chave}>
                    <dt className="font-doc-mono text-xs text-doc-ink-muted">
                      {coluna.titulo}
                    </dt>
                    <dd
                      className={cn(
                        'mt-1',
                        coluna.destaque
                          ? 'font-heading text-lg leading-tight font-bold'
                          : 'text-base leading-relaxed',
                      )}
                    >
                      {linha[coluna.chave]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left tabular-nums">
          <caption className="caption-top pb-3 text-left font-doc-mono text-xs text-doc-ink-muted">
            {legenda}
          </caption>
          <thead>
            <tr className="border-y border-doc-ink bg-doc-rule">
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  scope="col"
                  className="px-4 py-3 font-doc-mono text-xs font-medium"
                >
                  {coluna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <tr key={indice} className="border-b border-doc-rule-strong">
                {colunas.map((coluna) =>
                  coluna.destaque ? (
                    <th
                      key={coluna.chave}
                      scope="row"
                      className="px-4 py-4 align-top font-heading text-lg leading-tight font-bold"
                    >
                      {linha[coluna.chave]}
                    </th>
                  ) : (
                    <td
                      key={coluna.chave}
                      className="px-4 py-4 align-top text-base leading-relaxed"
                    >
                      {linha[coluna.chave]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
