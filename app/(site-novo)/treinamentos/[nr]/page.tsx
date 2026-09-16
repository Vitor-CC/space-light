import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DadosEstruturados } from '@/components/site-novo/dados-estruturados';
import { PaginaDeNorma } from '@/components/site-novo/pagina-de-norma';
import { NORMAS, normaComPagina } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import {
  NOME_DA_EMPRESA,
  dadosDaNorma,
  imagemOg,
  metadadosDaPagina,
} from '@/lib/site-novo/seo';

// Só vira página a norma que já tem conteúdo escrito; as outras dão 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return NORMAS.filter((norma) => norma.pagina).map((norma) => ({
    nr: norma.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps<'/treinamentos/[nr]'>): Promise<Metadata> {
  const norma = normaComPagina((await params).nr);
  if (!norma) return {};
  return metadadosDaPagina({
    titulo: `Treinamento ${norma.codigo} — ${norma.nome} | ${NOME_DA_EMPRESA}`,
    descricao: norma.pagina.exige,
    caminho: rotas.norma(norma.slug),
    imagem: imagemOg(norma.slug),
    alt: norma.pagina.figura.alt,
  });
}

export default async function PaginaDaNormaRota({
  params,
}: PageProps<'/treinamentos/[nr]'>) {
  const norma = normaComPagina((await params).nr);
  if (!norma) notFound();
  return (
    <>
      <DadosEstruturados dados={dadosDaNorma(norma)} />
      <PaginaDeNorma norma={norma} />
    </>
  );
}
