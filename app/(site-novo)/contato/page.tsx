import { ArrowUpRight, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';

import { Estrelas, Resp, Rotulo } from '@/components/site-novo/blocos';
import { FormularioProposta } from '@/components/site-novo/formulario-proposta';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { PROVA_SOCIAL } from '@/lib/site-novo/home';
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

/** "O que acontece depois", no cartão preto ao lado do formulário. */
const PASSOS = [
  { titulo: 'Você envia o formulário', texto: 'Leva uns 2 minutos.' },
  { titulo: 'A Space Light analisa', texto: 'Retorno em até 1 dia útil, por e-mail ou WhatsApp.' },
  { titulo: 'Você recebe a proposta', texto: 'Com formato, carga horária e o caminho recomendado.' },
] as const;

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
    <FormularioProposta
      treinamentos={OPCOES_DE_TREINAMENTO}
      preSelecionados={preSelecionados}
      origem={origem}
      apoio={<Apoio />}
    />
  );
}

/**
 * Coluna de apoio do Figma: título, próximos passos, WhatsApp e a nota do
 * Google. No celular fica só o título e a linha do WhatsApp, acima do
 * formulário.
 */
function Apoio() {
  return <div className="flex flex-col gap-2.5 px-5 pt-8 pb-5 md:px-10 lg:w-[400px] lg:shrink-0 lg:gap-7 lg:p-0">
    <Rotulo>Solicitar proposta</Rotulo>
    <h1 className="font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]">Conte o treinamento que a sua empresa precisa.</h1>
    <p className="hidden ds-body-m text-ds-texto-2 lg:block">Preencha o essencial. A Space Light retorna com a proposta e o caminho recomendado para a sua operação.</p>
    <div className="hidden flex-col rounded-lg bg-ds-inverso p-6 text-ds-texto-inv lg:flex">
      <p className="ds-caps text-ds-amarelo">O que acontece depois</p>
      <ol className="mt-2">
        {PASSOS.map((passo, i) => <li key={passo.titulo} className={cn('flex items-start gap-3.5 py-3', i < PASSOS.length - 1 && 'border-b border-ds-borda-inv')}>
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ds-amarelo ds-body-s font-medium text-ds-texto">{i + 1}</span>
          <span className="flex flex-col gap-0.5">
            <strong className="ds-body-s font-medium">{passo.titulo}</strong>
            <span className="ds-caption text-ds-texto-inv-2">{passo.texto}</span>
          </span>
        </li>)}
      </ol>
    </div>
    <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className="doc-focus flex items-center gap-2.5 rounded-lg bg-ds-superficie px-3.5 py-2.5 lg:gap-3 lg:px-[18px] lg:py-4">
      <span aria-hidden="true" className="flex shrink-0 lg:rounded-full lg:bg-ds-amarelo lg:p-2"><MessageCircle className="size-[18px]" /></span>
      <span className="flex min-w-0 flex-1 flex-col ds-body-s">
        <span className="font-medium"><Resp curto="Prefere falar agora? WhatsApp" longo="Quer falar agora?" /></span>
        <span className="hidden text-ds-texto-2 lg:block">WhatsApp {WHATSAPP.numero}</span>
      </span>
      <ArrowUpRight className="size-[18px] shrink-0" aria-hidden="true" />
    </a>
    <p className="hidden items-center gap-2.5 ds-body-s font-medium lg:flex"><Estrelas className="text-[14px]" />{PROVA_SOCIAL.nota} no Google · {PROVA_SOCIAL.treinadosMedio}</p>
  </div>;
}
