/**
 * As sete normas do site novo. Menu, rodapé e grade da home leem daqui; na
 * etapa 4 cada entrada ganha o conteúdo da sua página.
 *
 * Mora em `lib/` e não em `data/` porque `data/` está no .gitignore — é onde
 * fica o banco SQLite local — e um arquivo ali nunca seria versionado.
 */
export type Norma = {
  slug: `nr-${string}`;
  codigo: string;
  nome: string;
  linha: string;
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
