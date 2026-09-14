import { NR23_PROGRAM } from '@/lib/nr23-program';
import { imagemMarca } from '@/lib/site-novo/imagens';

/**
 * As sete normas do site novo. Menu, rodapé e grade da home leem daqui, e a
 * página de cada norma sai de `pagina` — sem ela, a rota da norma dá 404.
 *
 * Mora em `lib/` e não em `data/` porque `data/` está no .gitignore — é onde
 * fica o banco SQLite local — e um arquivo ali nunca seria versionado.
 */
export type PaginaDaNorma = {
  /** Uma linha do que a norma exige, no cabeçalho da página. */
  exige: string;
  /** O que a norma exige: até dois parágrafos curtos. */
  exigencias: readonly string[];
  /** Pontos da norma, em lista, logo abaixo dos parágrafos. */
  pontos: readonly string[];
  fonte: { rotulo: string; url: string };
  funcoes: readonly string[];
  situacoes: readonly string[];
  /** Como a Space aplica a norma, etapa por etapa do método. */
  aplicacao: readonly { titulo: string; texto: string }[];
  /** Grade oficial da Space, quando já transcrita. */
  programa?: {
    legenda: string;
    origem: string;
    modulos: readonly { modulo: string; pratica: boolean }[];
  };
  figura: { src: string; alt: string; legenda: string };
};

export type Norma = {
  slug: `nr-${string}`;
  codigo: string;
  nome: string;
  linha: string;
  pagina?: PaginaDaNorma;
};

export type NormaComPagina = Norma & { pagina: PaginaDaNorma };

/** Nome de exibição dos módulos da grade oficial, que está em caixa alta. */
const MODULOS_NR23: Record<string, string> = {
  INTRODUÇÃO: 'Introdução',
  'ASPECTOS LEGAIS': 'Aspectos legais',
  'TEORIA DO FOGO': 'Teoria do fogo',
  'PROPAGAÇÃO DO FOGO': 'Propagação do fogo',
  'CLASSES DE INCÊNDIO': 'Classes de incêndio',
  'PREVENÇÃO DE INCÊNDIO': 'Prevenção de incêndio',
  'MÉTODOS DE EXTINÇÃO': 'Métodos de extinção',
  'AGENTES EXTINTORES': 'Agentes extintores',
  'EPI (EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL)':
    'Equipamento de proteção individual (EPI)',
  'EQUIPAMENTOS DE COMBATE A INCÊNDIO': 'Equipamentos de combate a incêndio',
  'EQUIPAMENTOS DE DETECÇÃO, ALARME, LUZ DE EMERGENCIA E COMUNICAÇÕES':
    'Detecção, alarme, luz de emergência e comunicações',
  'ABANDONO DE ÁREA': 'Abandono de área',
  'PESSOAS COM MOBILIDADE REDUZIDA': 'Pessoas com mobilidade reduzida',
  'AVALIAÇÃO INICIAL': 'Avaliação inicial',
  'VIAS AÉREAS': 'Vias aéreas',
  'RCP (REANIMAÇÃO CARDIOPULMONAR)': 'Reanimação cardiopulmonar (RCP)',
  HEMORRAGIAS: 'Hemorragias',
  'RISCOS ESPECÍFICOS DA PLANTA': 'Riscos específicos da planta',
  'PSICOLOGIA DE EMERGÊNCIAS': 'Psicologia de emergências',
  'SISTEMA DE CONTROLE DE INCIDENTES': 'Sistema de controle de incidentes',
  'EMERGÊNCIAS QUÍMICAS E TECNOLOGICAS': 'Emergências químicas e tecnológicas',
};

/*
 * NR 23 — texto escrito a partir da redação dada pela Portaria MTP nº
 * 2.769/2022. A norma não fixa carga horária: remete à legislação estadual.
 * Tudo que é específico da Space (carga, turma, modalidade) fica como
 * {{CONFIRMAR}} na ficha técnica.
 */
const PAGINA_NR23: PaginaDaNorma = {
  exige:
    'Medidas de prevenção contra incêndios nos locais de trabalho, conforme a legislação estadual.',
  exigencias: [
    'A NR 23 obriga a empresa a adotar medidas de prevenção contra incêndios nos locais de trabalho, seguindo a legislação estadual.',
    'Todo trabalhador deve receber informações sobre os equipamentos de combate, os procedimentos de emergência e os alarmes.',
  ],
  pontos: [
    'Informação a todos os trabalhadores sobre equipamentos, emergência e alarmes',
    'Saídas em número suficiente para abandonar o local com rapidez e segurança',
    'Saídas e vias de passagem sinalizadas e desobstruídas',
    'Nenhuma saída de emergência trancada durante a jornada',
  ],
  fonte: {
    rotulo: 'NR 23, redação da Portaria MTP nº 2.769/2022',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-23-atualizada-2022.pdf',
  },
  funcoes: [
    'Brigadistas, na formação e na reciclagem da brigada de incêndio',
    'Profissionais do SESMT e integrantes da CIPA que cuidam do plano de emergência',
    'Lideranças de área que conduzem o abandono do local',
    'Trabalhadores que precisam das informações de emergência exigidas pela norma',
  ],
  situacoes: [
    'Formação de uma brigada nova ou ampliação da atual',
    'Reciclagem periódica da brigada',
    'Integração de novos trabalhadores à rotina de emergência',
    'Mudança de layout, processo ou ocupação que altere os riscos de incêndio',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos a operação, os riscos de incêndio da planta e o plano de emergência que já existe.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Ajustamos conteúdo, formato e dinâmica ao público e à realidade da planta.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Teoria do fogo, prevenção, métodos de extinção e primeiros socorros, ligados aos riscos reais do local.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Extintores, mangueiras, EPI, RCP e contenção de hemorragias, com o instrutor acompanhando.',
    },
    {
      titulo: 'Registro',
      texto:
        'Lista de presença, fotos e certificados da turma organizados no portal do cliente.',
    },
  ],
  programa: {
    legenda: 'Tabela 1. Conteúdo programático da formação de brigada',
    origem: 'Grade do documento oficial da Space Light para a NR 23.',
    modulos: NR23_PROGRAM.map((linha) => ({
      modulo: MODULOS_NR23[linha.modulo] ?? linha.modulo,
      pratica: linha.pratica.trim() !== '',
    })),
  },
  figura: {
    src: imagemMarca('services/space-light-service-nr23'),
    alt: 'Participante opera um extintor portátil em fogo controlado, orientada pelo instrutor, com dois colegas de colete observando.',
    legenda: 'Operação de extintor portátil com orientação do instrutor.',
  },
};

export const NORMAS: readonly Norma[] = [
  {
    slug: 'nr-05',
    codigo: 'NR 05',
    nome: 'CIPA',
    linha:
      'Formação para prevenção de acidentes e atuação responsável no ambiente de trabalho.',
  },
  {
    slug: 'nr-06',
    codigo: 'NR 06',
    nome: 'Equipamentos de Proteção Individual',
    linha: 'Seleção, uso, guarda e conservação correta dos EPIs.',
  },
  {
    slug: 'nr-10',
    codigo: 'NR 10',
    nome: 'Segurança em Eletricidade',
    linha: 'Prevenção de riscos em instalações e serviços com eletricidade.',
  },
  {
    slug: 'nr-11',
    codigo: 'NR 11',
    nome: 'Movimentação de Materiais',
    linha: 'Transporte, movimentação, armazenagem e manuseio de materiais.',
  },
  {
    slug: 'nr-23',
    codigo: 'NR 23',
    nome: 'Proteção Contra Incêndios',
    linha:
      'Preparo técnico e prático para prevenção e resposta inicial a emergências.',
    pagina: PAGINA_NR23,
  },
  {
    slug: 'nr-33',
    codigo: 'NR 33',
    nome: 'Espaços Confinados',
    linha: 'Reconhecer, avaliar e controlar riscos em espaços confinados.',
  },
  {
    slug: 'nr-35',
    codigo: 'NR 35',
    nome: 'Trabalho em Altura',
    linha: 'Planejamento, organização e execução segura de trabalho em altura.',
  },
];

export function normaComPagina(slug: string): NormaComPagina | undefined {
  const norma = NORMAS.find((item) => item.slug === slug);
  return norma?.pagina ? { ...norma, pagina: norma.pagina } : undefined;
}
