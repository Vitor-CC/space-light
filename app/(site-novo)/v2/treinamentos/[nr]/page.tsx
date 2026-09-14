import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PaginaDeNorma } from '@/components/site-novo/pagina-de-norma';
import { NORMAS, normaComPagina } from '@/lib/site-novo/normas';

// Só vira página a norma que já tem conteúdo escrito; as outras dão 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return NORMAS.filter((norma) => norma.pagina).map((norma) => ({
    nr: norma.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps<'/v2/treinamentos/[nr]'>): Promise<Metadata> {
  const norma = normaComPagina((await params).nr);
  if (!norma) return {};
  return {
    title: `${norma.codigo} — ${norma.nome}`,
    description: norma.pagina.exige,
  };
}

export default async function PaginaDaNormaRota({
  params,
}: PageProps<'/v2/treinamentos/[nr]'>) {
  const norma = normaComPagina((await params).nr);
  if (!norma) notFound();
  return <PaginaDeNorma norma={norma} />;
}
