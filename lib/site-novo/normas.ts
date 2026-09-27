import { NR23_PROGRAM } from '@/lib/nr23-program';
import { imagemMarca } from '@/lib/site-novo/imagens';
import { TREINAMENTO_OUTRO } from '@/lib/site-novo/proposta';

/**
 * As sete normas do site novo. Menu, rodapé e grade da home leem daqui, e a
 * página de cada norma sai de `pagina` — sem ela, a rota da norma dá 404.
 *
 * O conteúdo de cada página foi escrito a partir do texto oficial da norma
 * publicado no gov.br (links em `fontes`). O que é específico da Space —
 * carga horária, turma, modalidade — a ficha técnica deixa para a proposta.
 *
 * Mora em `lib/` e não em `data/` porque `data/` está no .gitignore — é onde
 * fica o banco SQLite local — e um arquivo ali nunca seria versionado.
 */
export type PaginaDaNorma = {
  /** Uma linha do que a norma exige, no cabeçalho da página. */
  exige: string;
  /** Texto da abertura, quando é mais que `exige` (Figma: longo no desktop, curto no celular). */
  abertura?: { curto: string; longo: string };
  /** O que a norma exige: até dois parágrafos curtos. */
  exigencias: readonly string[];
  /** Pontos da norma, em lista, ao lado dos parágrafos. */
  pontos: readonly string[];
  /** Nota curta sobre mudança de redação da norma, quando houver. */
  aviso?: string;
  fontes: readonly { rotulo: string; url: string }[];
  funcoes: readonly string[];
  situacoes: readonly string[];
  /** Como a Space aplica a norma, etapa por etapa do método. */
  aplicacao: readonly { titulo: string; texto: string }[];
  /** Grade oficial da Space, quando já transcrita. */
  programa?: {
    titulo: string;
    origem: string;
    modulos: readonly { modulo: string; pratica: boolean }[];
  };
  /** Conteúdo mínimo que a própria norma define, quando define. */
  conteudoMinimo?: { titulo: string; origem: string; itens: readonly string[] };
  figura: { src: string; alt: string; legenda: string };
};

export type Norma = {
  slug: `nr-${string}`;
  codigo: string;
  nome: string;
  linha: string;
  /** Linha curta no pé do card de NR (Figma "Card / Treinamento NR"). */
  meta: string;
  /** Nome na lista de normas da home no celular. */
  curto: string;
  /** Nome mínimo, no rodapé e no menu do celular ("NR 06 · EPI"). */
  rotulo: string;
  pagina?: PaginaDaNorma;
};

export type NormaComPagina = Norma & { pagina: PaginaDaNorma };

const GOV_CTPP =
  'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente';
const NRS_VIGENTES = `${GOV_CTPP}/normas-regulamentadora/normas-regulamentadoras-vigentes`;
const ARQUIVOS_NRS = `${GOV_CTPP}/arquivos/normas-regulamentadoras`;

const REGISTRO = {
  titulo: 'Registro',
  texto:
    'Lista de presença, fotos e certificados da turma organizados no portal do cliente.',
};

/*
 * NR 05 — Portaria MTP nº 422/2021, alterada pela Portaria MTP nº 4.219/2022
 * (que incluiu a prevenção ao assédio). Treinamento: itens 5.7.1 a 5.7.4.
 */
const PAGINA_NR05: PaginaDaNorma = {
  exige:
    'Constituição da CIPA e treinamento dos seus membros e do representante nomeado antes da posse.',
  exigencias: [
    'A NR 05 obriga quem tem empregados CLT a manter a CIPA, dimensionada por número de empregados e grau de risco.',
    'Os membros da CIPA, titulares e suplentes, e o representante nomeado devem ser treinados antes da posse.',
  ],
  pontos: [
    'Treinamento antes da posse, com prazo próprio no primeiro mandato',
    'Conteúdo mínimo definido pela norma, incluindo a prevenção ao assédio',
    'Carga horária mínima conforme o grau de risco do estabelecimento',
    'Registro da percepção de riscos dos trabalhadores, como no mapa de riscos',
  ],
  fontes: [
    {
      rotulo: 'NR 05, alterada pela Portaria MTP nº 4.219/2022',
      url: `${NRS_VIGENTES}/nr-05-atualizada-2023.pdf`,
    },
  ],
  funcoes: [
    'Membros eleitos e indicados da CIPA, titulares e suplentes',
    'Representante nomeado, quando a norma não exige CIPA no estabelecimento',
    'Presidente e vice-presidente, que coordenam a comissão',
    'Prestadoras de serviço que precisam de CIPA própria no estabelecimento da contratante',
  ],
  situacoes: [
    'Posse de uma nova gestão da CIPA',
    'Designação do representante nomeado',
    'Primeiro mandato da comissão no estabelecimento',
    'Membro vindo de outra empresa, cujo treinamento não pode ser aproveitado',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos o estabelecimento, o grau de risco e os riscos que a comissão vai acompanhar.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Organizamos o conteúdo mínimo da norma sobre a realidade da empresa e o formato da turma.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Atribuições da CIPA, investigação de acidentes, legislação e prevenção ao assédio.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Mapa de riscos e análise de casos feitos pela turma, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  conteudoMinimo: {
    titulo: 'Conteúdo mínimo do treinamento',
    origem: 'Conforme o item 5.7.2 da NR 05.',
    itens: [
      'Ambiente e condições de trabalho e riscos do processo produtivo',
      'Acidentes e doenças relacionados ao trabalho e sua prevenção',
      'Metodologia de investigação e análise de acidentes e doenças',
      'Princípios de higiene do trabalho e de prevenção de riscos',
      'Legislação trabalhista e previdenciária de segurança e saúde',
      'Inclusão de pessoas com deficiência e reabilitados no trabalho',
      'Organização da CIPA e exercício das suas atribuições',
      'Prevenção e combate ao assédio sexual e a outras formas de violência',
    ],
  },
  figura: {
    src: imagemMarca('services/space-light-service-nr05'),
    alt: 'Quatro trabalhadores debruçados sobre a planta de um setor posicionam marcadores coloridos, montando um mapa de riscos.',
    legenda: 'Montagem de mapa de riscos em grupo.',
  },
};

/*
 * NR 06 — redação da Portaria MTP nº 2.175/2022, alterada até a Portaria MTE
 * nº 57/2025. Responsabilidades: itens 6.5 e 6.6; informações: item 6.7.2.
 */
const PAGINA_NR06: PaginaDaNorma = {
  exige:
    'Seleção, fornecimento, treinamento e uso correto dos Equipamentos de Proteção Individual.',
  exigencias: [
    'A NR 06 obriga a organização a fornecer, de graça, EPI adequado ao risco e com Certificado de Aprovação, e a exigir seu uso.',
    'O trabalhador deve ser orientado e treinado sobre uso, ajuste, limitações, guarda e conservação do equipamento.',
  ],
  pontos: [
    'Seleção do EPI registrada, a partir dos riscos avaliados',
    'Registro da entrega em ficha, livro ou sistema eletrônico',
    'Higienização e manutenção periódica, quando aplicáveis',
    'Substituição imediata do EPI danificado ou extraviado',
  ],
  fontes: [
    {
      rotulo:
        'NR 06, redação da Portaria MTP nº 2.175/2022, alterada até a Portaria MTE nº 57/2025',
      url: `${NRS_VIGENTES}/nr-06-atualizada-2025-ii.pdf`,
    },
  ],
  funcoes: [
    'Trabalhadores que usam EPI na rotina da operação',
    'Lideranças que exigem e acompanham o uso em campo',
    'Responsáveis pela entrega e pelo registro dos EPI',
    'SESMT e CIPA, que participam da seleção dos equipamentos',
  ],
  situacoes: [
    'Integração de novos trabalhadores',
    'Troca de modelo ou de fornecedor de EPI',
    'Revisão da seleção depois de mudança nos riscos avaliados',
    'Uso incorreto ou abandono do EPI percebido em campo',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos as atividades, os riscos avaliados e os EPI que a operação já usa.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Ajustamos o conteúdo aos equipamentos da empresa e às funções da turma.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Função de cada EPI, Certificado de Aprovação, limitações de proteção e responsabilidades.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Ajuste, inspeção, higienização e guarda dos equipamentos, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  conteudoMinimo: {
    titulo: 'Informações obrigatórias na entrega do EPI',
    origem: 'Conforme o item 6.7.2 da NR 06.',
    itens: [
      'Descrição do equipamento e dos seus componentes',
      'Risco contra o qual o EPI protege',
      'Restrições e limitações de proteção',
      'Forma adequada de uso e ajuste',
      'Manutenção e substituição',
      'Limpeza, higienização, guarda e conservação',
    ],
  },
  figura: {
    src: imagemMarca('services/space-light-service-nr06'),
    alt: 'Instrutor ajusta a jugular do capacete de um participante; na bancada, protetores auriculares, óculos, luvas e capacete.',
    legenda: 'Ajuste de capacete e demonstração de EPIs.',
  },
};

/*
 * NR 10 — em vigor: redação da Portaria MTE nº 598/2004, alterada até a
 * Portaria SEPRT nº 915/2019 (vigente até 31/05/2027). Nova redação: Portaria
 * MTE nº 737/2026, com vigência a partir de 1º/06/2027. Treinamento: itens
 * 10.8.8 a 10.8.9 e Anexo III da redação em vigor.
 */
const PAGINA_NR10: PaginaDaNorma = {
  exige:
    'Segurança de quem trabalha em instalações elétricas, em serviços com eletricidade ou perto deles.',
  exigencias: [
    'A NR 10 exige medidas de controle para quem interage com instalações elétricas, da geração ao consumo.',
    'Só trabalhadores qualificados, habilitados ou capacitados, e autorizados pela empresa, podem intervir nessas instalações.',
  ],
  pontos: [
    'Treinamento específico, com avaliação, para quem é autorizado a intervir',
    'Reciclagem bienal e também após troca de função, longo afastamento ou mudança nas instalações',
    'Curso complementar para quem atua no Sistema Elétrico de Potência',
    'Instrução formal para quem trabalha perto das instalações sem intervir nelas',
  ],
  aviso:
    'A nova NR 10 (Portaria MTE nº 737/2026) passa a valer em 1º de junho de 2027. Até lá, vale a redação atual.',
  fontes: [
    {
      rotulo: 'NR 10 em vigor, alterada até a Portaria SEPRT nº 915/2019',
      url: `${ARQUIVOS_NRS}/nr-10-atualizada-2019-1.pdf`,
    },
    {
      rotulo: 'Nova NR 10, Portaria MTE nº 737/2026',
      url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2026-1/portaria-mte-no-737-nova-nr-10.pdf',
    },
  ],
  funcoes: [
    'Eletricistas e técnicos autorizados a intervir em instalações elétricas',
    'Equipes de manutenção que trabalham em instalações elétricas ou perto delas',
    'Profissionais que atuam no Sistema Elétrico de Potência',
    'Trabalhadores de outras áreas que atuam na vizinhança de instalações energizadas',
  ],
  situacoes: [
    'Autorização de novos trabalhadores para serviços com eletricidade',
    'Reciclagem bienal da equipe',
    'Troca de função, retorno de afastamento ou mudança nas instalações',
    'Preparação da equipe para a nova redação da NR 10',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos as instalações, as tarefas da equipe e os procedimentos já adotados.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Organizamos o conteúdo conforme o público e as instalações em que a turma trabalha.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Riscos elétricos, análise de risco, medidas de controle e proteção coletiva e individual.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Desenergização, bloqueio, sinalização e primeiros socorros, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  conteudoMinimo: {
    titulo: 'Programação mínima do curso básico',
    origem: 'Conforme o Anexo III da NR 10 em vigor.',
    itens: [
      'Introdução à segurança com eletricidade',
      'Choque elétrico, arco elétrico e campos eletromagnéticos',
      'Técnicas de análise de risco',
      'Medidas de controle, como desenergização, aterramento e bloqueios',
      'Normas técnicas da ABNT e regulamentações do Ministério do Trabalho',
      'Equipamentos de proteção coletiva e individual',
      'Rotinas e procedimentos de trabalho',
      'Documentação de instalações elétricas',
      'Riscos adicionais, como altura e áreas classificadas',
      'Proteção e combate a incêndios',
      'Acidentes de origem elétrica',
      'Primeiros socorros',
      'Responsabilidades',
    ],
  },
  figura: {
    src: imagemMarca('services/space-light-service-nr10'),
    alt: 'Dois trabalhadores diante de um painel elétrico: um aponta o bloqueio de um disjuntor e outra, de protetor facial, faz a medição com multímetro.',
    legenda: 'Bloqueio de disjuntor e medição em painel elétrico.',
  },
};

/*
 * NR 11 — texto com alterações até a Portaria MTPS nº 505/2016. A norma não
 * define conteúdo de treinamento; exige treinamento específico do operador
 * (item 11.1.5) e cartão de identificação (itens 11.1.6 e 11.1.6.1).
 */
const PAGINA_NR11: PaginaDaNorma = {
  exige:
    'Segurança no transporte, na movimentação, na armazenagem e no manuseio de materiais.',
  exigencias: [
    'A NR 11 exige equipamentos de movimentação resistentes, inspecionados e com a carga máxima indicada.',
    'Quem opera equipamento de transporte com força motriz própria precisa de treinamento específico dado pela empresa.',
  ],
  pontos: [
    'Treinamento específico para operadores de equipamentos motorizados',
    'Cartão de identificação do operador, com nome e foto, revalidado com exame de saúde',
    'Inspeção permanente de cabos, correntes, roldanas e ganchos',
    'Material armazenado sem obstruir portas, equipamentos de incêndio e saídas',
  ],
  fontes: [
    {
      rotulo: 'NR 11, com alterações até a Portaria MTPS nº 505/2016',
      url: `${NRS_VIGENTES}/nr-11-atualizada-2016.pdf`,
    },
  ],
  funcoes: [
    'Operadores de empilhadeira e de outros equipamentos motorizados de transporte',
    'Equipes de armazém e expedição que movimentam e empilham materiais',
    'Lideranças de logística que organizam o fluxo e a armazenagem',
    'Responsáveis pela inspeção dos equipamentos de movimentação',
  ],
  situacoes: [
    'Contratação ou promoção de operadores de empilhadeira',
    'Revalidação do cartão de identificação do operador',
    'Chegada de equipamento novo ou mudança de layout do armazém',
    'Incidentes com movimentação ou queda de carga',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos o armazém, os equipamentos e o fluxo de materiais da operação.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Organizamos o conteúdo pelos equipamentos e pelas cargas que a turma movimenta.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Estabilidade de carga, inspeção do equipamento, sinalização e circulação segura.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Inspeção antes do uso e operação do equipamento, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  figura: {
    src: imagemMarca('services/space-light-service-nr11'),
    alt: 'Operador conduz uma empilhadeira com carga paletizada no armazém, enquanto um colega acompanha a manobra.',
    legenda: 'Operação de empilhadeira acompanhada em armazém.',
  },
};

/*
 * NR 33 — redação da Portaria MTP nº 1.690/2022. Caracterização: item 33.2.2;
 * responsabilidades: 33.3; capacitação por função: 33.6 e Anexo III.
 */
const PAGINA_NR33: PaginaDaNorma = {
  exige:
    'Identificação dos espaços confinados e controle dos riscos de quem entra e trabalha neles.',
  exigencias: [
    'Espaço confinado é o ambiente não feito para ocupação contínua, com entrada limitada e atmosfera que pode ser perigosa.',
    'A NR 33 exige Permissão de Entrada e Trabalho, vigia e capacitação de cada função envolvida.',
  ],
  pontos: [
    'Cadastro dos espaços confinados feito por responsável técnico',
    'Permissão de Entrada e Trabalho emitida antes de cada atividade',
    'Avaliação da atmosfera antes da entrada e monitoramento contínuo',
    'Plano de resgate e simulado anual de salvamento',
  ],
  fontes: [
    {
      rotulo: 'NR 33, redação da Portaria MTP nº 1.690/2022',
      url: `${ARQUIVOS_NRS}/nr-33-atualizada-2022-_retificada.pdf`,
    },
  ],
  funcoes: [
    'Supervisores de entrada, que emitem e encerram a Permissão de Entrada e Trabalho',
    'Vigias, que controlam a entrada e acompanham a atividade',
    'Trabalhadores autorizados a entrar e trabalhar no espaço confinado',
    'Equipes de emergência e salvamento',
  ],
  situacoes: [
    'Limpeza, inspeção ou manutenção em tanques, silos, galerias e poços',
    'Designação de novos vigias ou supervisores de entrada',
    'Capacitação periódica de cada função',
    'Mudança no tipo de espaço confinado ou na atividade realizada',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos os espaços confinados da operação, as atividades e o papel de cada participante.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Separamos o conteúdo por função, do supervisor de entrada à equipe de salvamento.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Atmosfera perigosa, Permissão de Entrada e Trabalho, monitoramento e plano de resgate.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Acesso, monitoramento e simulação de resgate, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  figura: {
    src: imagemMarca('services/space-light-service-nr33'),
    alt: 'Participante desce por uma abertura no piso preso a um tripé de ancoragem; um colega opera o equipamento e outro acompanha com um detector.',
    legenda: 'Entrada em espaço confinado com tripé e monitoramento.',
  },
};

/*
 * NR 35 — redação da Portaria MTP nº 4.218/2022, alterada até a Portaria MTE
 * nº 1.259/2026 (que tornou o treinamento presencial, item 35.4.5).
 * Capacitação: itens 35.4.1 a 35.4.4.
 */
const PAGINA_NR35: PaginaDaNorma = {
  exige:
    'Planejamento, organização e execução seguros de toda atividade acima de 2 metros com risco de queda.',
  exigencias: [
    'A NR 35 vale para toda atividade com diferença de nível acima de 2 metros em que haja risco de queda.',
    'Só pode trabalhar em altura quem foi capacitado, teve a saúde avaliada e recebeu autorização formal da empresa.',
  ],
  pontos: [
    'Análise de Risco antes de todo trabalho em altura',
    'Treinamento teórico e prático, inicial e periódico, sempre presencial',
    'Aptidão para trabalho em altura registrada no atestado de saúde ocupacional',
    'Evitar a altura, eliminar o risco de queda ou reduzir suas consequências, nessa ordem',
  ],
  fontes: [
    {
      rotulo:
        'NR 35, redação da Portaria MTP nº 4.218/2022, alterada até a Portaria MTE nº 1.259/2026',
      url: `${NRS_VIGENTES}/nr-35-atualizada-2025-1.pdf`,
    },
  ],
  funcoes: [
    'Trabalhadores que executam atividades acima de 2 metros',
    'Equipes de manutenção e montagem em estruturas, telhados e plataformas',
    'Supervisores que acompanham o trabalho em altura',
    'Quem usa escada de uso individual como acesso ou posto de trabalho',
  ],
  situacoes: [
    'Autorização de novos trabalhadores para trabalho em altura',
    'Treinamento periódico da equipe',
    'Exigência de treinamento presencial, incluída na norma em 2026',
    'Uso de escadas de uso individual, com capacitação específica',
  ],
  aplicacao: [
    {
      titulo: 'Diagnóstico',
      texto:
        'Entendemos as atividades em altura, os pontos de ancoragem e os procedimentos da operação.',
    },
    {
      titulo: 'Planejamento',
      texto:
        'Organizamos o conteúdo pelas tarefas da turma e pelos equipamentos que ela usa.',
    },
    {
      titulo: 'Teoria aplicada',
      texto:
        'Análise de Risco, condições impeditivas, proteção contra quedas e acidentes típicos.',
    },
    {
      titulo: 'Prática supervisionada',
      texto:
        'Inspeção do cinturão, ancoragem e noções de resgate, com o instrutor acompanhando.',
    },
    REGISTRO,
  ],
  conteudoMinimo: {
    titulo: 'Conteúdo mínimo do treinamento inicial',
    origem: 'Conforme o item 35.4.2.1 da NR 35.',
    itens: [
      'Normas e regulamentos aplicáveis ao trabalho em altura',
      'Análise de Risco e condições impeditivas',
      'Riscos do trabalho em altura e medidas de prevenção e controle',
      'Sistemas, equipamentos e procedimentos de proteção coletiva',
      'EPI para trabalho em altura: seleção, inspeção, conservação e limitação de uso',
      'Acidentes típicos em trabalhos em altura',
      'Condutas em emergência, com noções de resgate e primeiros socorros',
    ],
  },
  figura: {
    src: imagemMarca('services/space-light-service-nr35'),
    alt: 'Participante de cinturão conecta o talabarte a um ponto de ancoragem na viga, observado por um instrutor na plataforma.',
    legenda: 'Conexão do talabarte à ancoragem, com instrutor.',
  },
};

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
 */
const PAGINA_NR23: PaginaDaNorma = {
  exige:
    'Medidas de prevenção contra incêndios nos locais de trabalho, conforme a legislação estadual.',
  abertura: {
    curto:
      'Prevenção contra incêndios conforme a legislação estadual, com formação e reciclagem de brigada e prática com fogo controlado.',
    longo:
      'Medidas de prevenção contra incêndios nos locais de trabalho, conforme a legislação estadual — com formação e reciclagem de brigada, teoria aplicada e prática com fogo controlado.',
  },
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
  fontes: [
    {
      rotulo: 'NR 23, redação da Portaria MTP nº 2.769/2022',
      url: `${ARQUIVOS_NRS}/nr-23-atualizada-2022.pdf`,
    },
  ],
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
    REGISTRO,
  ],
  programa: {
    titulo: 'Conteúdo programático da formação de brigada',
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

/** A NR 23 é a mais aplicada pela Space: vem em destaque na home e ganha o selo na página dela. */
export const NORMA_MAIS_APLICADA = 'nr-23';

export const NORMAS: readonly Norma[] = [
  {
    slug: 'nr-05',
    codigo: 'NR 05',
    nome: 'CIPA',
    meta: 'Comissão · Formação',
    curto: 'CIPA',
    rotulo: 'CIPA',
    linha:
      'Formação para prevenção de acidentes e atuação responsável no ambiente de trabalho.',
    pagina: PAGINA_NR05,
  },
  {
    slug: 'nr-06',
    codigo: 'NR 06',
    nome: 'Equipamentos de Proteção Individual',
    meta: 'Uso e conservação',
    curto: 'EPI',
    rotulo: 'EPI',
    linha: 'Seleção, uso, guarda e conservação correta dos EPIs.',
    pagina: PAGINA_NR06,
  },
  {
    slug: 'nr-10',
    codigo: 'NR 10',
    nome: 'Segurança em Eletricidade',
    meta: 'Instalações e serviços',
    curto: 'Segurança em eletricidade',
    rotulo: 'Eletricidade',
    linha: 'Prevenção de riscos em instalações e serviços com eletricidade.',
    pagina: PAGINA_NR10,
  },
  {
    slug: 'nr-11',
    codigo: 'NR 11',
    nome: 'Movimentação de Materiais',
    meta: 'Operação e armazenagem',
    curto: 'Movimentação de materiais',
    rotulo: 'Movimentação',
    linha: 'Transporte, movimentação, armazenagem e manuseio de materiais.',
    pagina: PAGINA_NR11,
  },
  {
    slug: 'nr-23',
    codigo: 'NR 23',
    nome: 'Proteção Contra Incêndios',
    meta: 'Brigada de incêndio',
    curto: 'Proteção contra incêndios',
    rotulo: 'Incêndio',
    linha:
      'Preparo técnico e prático para prevenção e resposta inicial a emergências.',
    pagina: PAGINA_NR23,
  },
  {
    slug: 'nr-33',
    codigo: 'NR 33',
    nome: 'Espaços Confinados',
    meta: 'Riscos e resgate',
    curto: 'Espaços confinados',
    rotulo: 'Espaço confinado',
    linha: 'Reconhecer, avaliar e controlar riscos em espaços confinados.',
    pagina: PAGINA_NR33,
  },
  {
    slug: 'nr-35',
    codigo: 'NR 35',
    nome: 'Trabalho em Altura',
    meta: 'Planejamento e execução',
    curto: 'Trabalho em altura',
    rotulo: 'Altura',
    linha: 'Planejamento, organização e execução segura de trabalho em altura.',
    pagina: PAGINA_NR35,
  },
];

export function normaComPagina(slug: string): NormaComPagina | undefined {
  const norma = NORMAS.find((item) => item.slug === slug);
  return norma?.pagina ? { ...norma, pagina: norma.pagina } : undefined;
}

/** Opções de treinamento do formulário de proposta: as sete normas e "Outro". */
export const OPCOES_DE_TREINAMENTO: readonly {
  valor: string;
  rotulo: string;
}[] = [
  ...NORMAS.map((norma) => ({ valor: norma.slug, rotulo: norma.codigo })),
  { valor: TREINAMENTO_OUTRO, rotulo: 'Outro' },
];
