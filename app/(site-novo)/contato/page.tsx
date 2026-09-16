import type { Metadata } from 'next';

import { DocSection } from '@/components/site-novo/doc-section';
import { FormularioProposta } from '@/components/site-novo/formulario-proposta';
import { texto } from '@/components/site-novo/texto';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { OPCOES_DE_TREINAMENTO } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import {
  NOME_DA_EMPRESA,
  imagemOg,
  metadadosDaPagina,
} from '@/lib/site-novo/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = metadadosDaPagina({
  titulo: `Solicitar proposta de treinamento | ${NOME_DA_EMPRESA}`,
  descricao:
    'Preencha o formulário com o essencial e a Space Light retorna com a proposta e o caminho recomendado.',
  // A consulta (?treinamento=, utm_*) fica fora do canônico.
  caminho: rotas.contato,
  imagem: imagemOg('home'),
  alt: 'Participante usa um extintor portátil num fogo controlado, observada por um instrutor e por colegas de colete refletivo.',
});

export default async function PaginaDeContato({
  searchParams,
}: PageProps<'/contato'>) {
  const parametros = await searchParams;

  // `?treinamento=nr-23` chega das páginas de norma e já marca a norma.
  const pedido = parametros.treinamento;
  const preSelecionados = OPCOES_DE_TREINAMENTO.some(
    (opcao) => opcao.valor === pedido,
  )
    ? [String(pedido)]
    : [];

  // A origem registrada com o lead guarda a página e os parâmetros da URL
  // (campanha, norma), para saber de onde veio a solicitação.
  const consulta = new URLSearchParams(
    Object.entries(parametros).flatMap(([chave, valor]) =>
      (Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]).map(
        (item): [string, string] => [chave, item],
      ),
    ),
  ).toString();
  const origem = consulta ? `${rotas.contato}?${consulta}` : rotas.contato;

  return (
    <>
      <DocSection numero="01" rotulo="Proposta" tom="preto">
        <p className={texto.eyebrow}>Solicitar proposta</p>
        <h1 className={cn(texto.tituloPagina, 'mt-5 max-w-[16ch]')}>
          Conte o treinamento que a sua empresa precisa.
        </h1>
        <p className={cn(texto.apoio, 'mt-6')}>
          Preencha o formulário com o essencial e a Space Light retorna com a
          proposta e o caminho recomendado.
        </p>
        <p className={cn(texto.apoio, 'mt-4')}>
          Quer falar agora?{' '}
          <a
            href={WHATSAPP.link}
            target="_blank"
            rel="noreferrer"
            className={texto.link}
          >
            Falar no WhatsApp
          </a>{' '}
          <span className="font-doc-mono text-sm whitespace-nowrap tabular-nums">
            {WHATSAPP.numero}
          </span>
        </p>
      </DocSection>

      <DocSection id="formulario" numero="02" rotulo="Formulário" tom="folha">
        <h2 className={texto.tituloSecao}>Formulário de proposta</h2>
        <div className="mt-8 max-w-4xl">
          <FormularioProposta
            treinamentos={OPCOES_DE_TREINAMENTO}
            preSelecionados={preSelecionados}
            origem={origem}
          />
        </div>
      </DocSection>
    </>
  );
}
