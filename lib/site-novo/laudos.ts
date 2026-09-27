/**
 * Laudos técnicos que a Space faz (decisão de 27/09/2026): NR 13, 15 e 16.
 * Não são treinamentos — não entram no portal para gerar turma. O texto de
 * cada um saiu do PDF oficial da norma no gov.br (link em `fonte`).
 */

const NRS_VIGENTES =
  'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes';

export type Laudo = {
  /** Valor no formulário de proposta (`?treinamento=laudo-nr-15`). */
  slug: `laudo-nr-${string}`;
  codigo: string;
  nome: string;
  resumo: string;
  pontos: readonly string[];
  fonte: { rotulo: string; url: string };
};

export const LAUDOS: readonly Laudo[] = [
  {
    slug: 'laudo-nr-13',
    codigo: 'NR 13',
    nome: 'Caldeiras, vasos de pressão, tubulações e tanques',
    resumo:
      'A NR 13 trata da integridade estrutural de caldeiras, vasos de pressão, suas tubulações e tanques metálicos, na instalação, inspeção, operação e manutenção.',
    pontos: [
      'Inspeção de segurança inicial, antes de o equipamento entrar em operação',
      'Inspeção de segurança periódica, nos prazos da norma',
      'Responsabilidade do empregador também pelos equipamentos de terceiros no estabelecimento',
    ],
    fonte: { rotulo: 'NR 13, texto consolidado no gov.br (atualização 2023)', url: `${NRS_VIGENTES}/nr-13-atualizada-2023-b.pdf` },
  },
  {
    slug: 'laudo-nr-15',
    codigo: 'NR 15',
    nome: 'Insalubridade',
    resumo:
      'A NR 15 define as atividades e operações insalubres e o adicional de 10%, 20% ou 40% conforme o grau mínimo, médio ou máximo.',
    pontos: [
      'Caracterização pelos limites de tolerância e pelos anexos da norma',
      'Eliminação ou neutralização comprovada por avaliação pericial',
      'Laudo disponível aos trabalhadores, aos sindicatos e à inspeção do trabalho',
    ],
    fonte: { rotulo: 'NR 15, texto consolidado no gov.br (atualização 2025)', url: `${NRS_VIGENTES}/nr-15-atualizada-2025.pdf` },
  },
  {
    slug: 'laudo-nr-16',
    codigo: 'NR 16',
    nome: 'Periculosidade',
    resumo:
      'A NR 16 lista as atividades e operações perigosas, que garantem ao trabalhador o adicional de 30% sobre o salário.',
    pontos: [
      'Caracterização ou descaracterização por laudo técnico (item 16.3)',
      'Laudo elaborado por Médico do Trabalho ou Engenheiro de Segurança do Trabalho',
      'Laudo disponível aos trabalhadores, aos sindicatos e à inspeção do trabalho',
    ],
    fonte: { rotulo: 'NR 16, texto consolidado no gov.br (atualização 2025)', url: `${NRS_VIGENTES}/nr-16-atualizada-2025-ii.pdf` },
  },
];
