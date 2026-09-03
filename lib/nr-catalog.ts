// Catálogo de NRs: título oficial + resumo do conteúdo programático padrão.
// A lista de presença puxa estes valores pela NR selecionada no treinamento.
// O conteúdo pode ser sobrescrito por treinamento (campo "Conteúdo programático").

export type NrInfo = { title: string; content: string };

export const NR_CATALOG: Record<string, NrInfo> = {
  'NR 05': {
    title: 'Comissão Interna de Prevenção de Acidentes (CIPA)',
    content:
      'Legislação de segurança e saúde no trabalho; organização, atribuições e funcionamento da CIPA; mapa de riscos; prevenção de acidentes e doenças do trabalho; investigação e análise de acidentes; noções de prevenção e combate a incêndio; noções de primeiros socorros.',
  },
  'NR 06': {
    title: 'Equipamento de Proteção Individual (EPI)',
    content:
      'Tipos de EPI e sua correta utilização; obrigações do empregador e do empregado; higienização, guarda e conservação; Certificado de Aprovação (CA); seleção do EPI adequado ao risco de cada atividade.',
  },
  'NR 10': {
    title: 'Segurança em Instalações e Serviços em Eletricidade',
    content:
      'Riscos elétricos (choque, arco elétrico, campos eletromagnéticos); técnicas de análise de risco; medidas de controle e proteção coletiva e individual; procedimentos e documentação de trabalho; normas técnicas e regulamentadoras; primeiros socorros e combate a incêndio de origem elétrica.',
  },
  'NR 11': {
    title: 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
    content:
      'Transporte, movimentação, armazenagem e manuseio de materiais; operação segura de equipamentos de movimentação; sinalização; empilhamento e estabilidade de cargas; prevenção de acidentes na movimentação de materiais.',
  },
  'NR 12': {
    title: 'Segurança no Trabalho em Máquinas e Equipamentos',
    content:
      'Princípios de segurança em máquinas e equipamentos; dispositivos e sistemas de proteção; procedimentos seguros de operação, manutenção, inspeção e limpeza; medidas de controle de riscos mecânicos.',
  },
  'NR 18': {
    title: 'Segurança na Indústria da Construção',
    content:
      'Condições e meio ambiente de trabalho na indústria da construção; áreas de vivência; proteções coletivas e individuais; medidas de prevenção de quedas e acidentes na obra.',
  },
  'NR 20': {
    title: 'Segurança com Inflamáveis e Combustíveis',
    content:
      'Segurança e saúde no trabalho com inflamáveis e líquidos combustíveis; classificação e propriedades; prevenção e controle de vazamentos e incêndios; procedimentos operacionais e de emergência.',
  },
  'NR 23': {
    title: 'Prevenção e Combate a Incêndio',
    content:
      'Fogo e Incêndio; Elementos essenciais ao fogo; Efeitos do calor; Transferência de Calor; Classe de Incêndio; Processo de Extinção de Incêndios. Utilização dos equipamentos de combate ao incêndio; Procedimentos para evacuação dos locais de trabalho com segurança; dispositivos de alarme existentes. Abandono de área, Pessoas com mobilidade reduzida, Avaliação inicial, Vias aéreas; RCP (reanimação cardiopulmonar); Hemorragias; Riscos específicos da planta; Psicologia de emergências; Sistema de controle de incidentes.',
  },
  'NR 33': {
    title: 'Segurança e Saúde nos Trabalhos em Espaços Confinados',
    content:
      'Reconhecimento, avaliação e controle de riscos em espaços confinados; Permissão de Entrada e Trabalho (PET); monitoramento da atmosfera; ventilação e isolamento; procedimentos de emergência e resgate; atribuições do vigia, do trabalhador autorizado e do supervisor de entrada.',
  },
  'NR 34': {
    title: 'Segurança na Construção e Reparação Naval',
    content:
      'Condições e meio ambiente de trabalho na indústria da construção e reparação naval; trabalho a quente; sinalização e isolamento de áreas; medidas de proteção coletiva e individual.',
  },
  'NR 35': {
    title: 'Trabalho em Altura',
    content:
      'Trabalho em altura acima de 2,00 m; análise de risco e permissão de trabalho; sistemas e equipamentos de proteção contra quedas; seleção, inspeção e uso de EPIs; ancoragem; procedimentos de emergência e resgate em altura.',
  },
};

export function nrInfo(nr: string): NrInfo | undefined {
  const digits = (nr.match(/\d+/)?.[0] ?? '').padStart(2, '0');
  return NR_CATALOG[`NR ${digits}`];
}
