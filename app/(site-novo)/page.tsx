import type { Metadata } from 'next';

import { DadosEstruturados } from '@/components/site-novo/dados-estruturados';
import {
  Abertura,
  Avaliacoes,
  ChamadaFinal,
  ComoTrabalhamos,
  Modalidades,
  Numeros,
  Perguntas,
  PorQue,
  Portal,
  Pratica,
  Treinamentos,
} from '@/components/site-novo/home';
import { FOTO_DA_ABERTURA } from '@/lib/site-novo/home';
import { rotas } from '@/lib/site-novo/rotas';
import {
  NOME_DA_EMPRESA,
  dadosDaOrganizacao,
  imagemOg,
  metadadosDaPagina,
} from '@/lib/site-novo/seo';

/* Home do Figma: 11 seções, na ordem do frame "Home · Desktop 1440". */

export const metadata: Metadata = metadadosDaPagina({
  titulo: `${NOME_DA_EMPRESA} | Treinamentos em Normas Regulamentadoras`,
  descricao:
    'Treinamentos de Normas Regulamentadoras com teoria aplicada, prática supervisionada e a documentação da turma organizada para a auditoria.',
  caminho: rotas.inicio,
  imagem: imagemOg('home'),
  alt: FOTO_DA_ABERTURA.alt,
});

export default function HomeSiteNovo() {
  return (
    <>
      <DadosEstruturados dados={dadosDaOrganizacao()} />
      <Abertura />
      <Numeros />
      <Treinamentos />
      <Pratica />
      <ComoTrabalhamos />
      <Portal />
      <Modalidades />
      <PorQue />
      <Avaliacoes />
      <Perguntas />
      <ChamadaFinal />
    </>
  );
}
