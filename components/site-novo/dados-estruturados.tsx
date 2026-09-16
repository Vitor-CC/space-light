/**
 * JSON-LD na página. O `<` vira `<` para que um texto com `</script>`
 * não feche a tag — é a forma recomendada na documentação do Next.
 */
export function DadosEstruturados({ dados }: { dados: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dados).replace(/</g, '\\u003c'),
      }}
    />
  );
}
