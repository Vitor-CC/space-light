/**
 * Conteúdo programático dos cursos que não são a NR 23.
 *
 * A NR 23 tem grade de quatro colunas (módulo/assunto/teórica/prática) e vive
 * em `nr23-program.ts`. Estes aqui são listas de tópicos, às vezes divididas em
 * seções — foi assim que o certificador entregou, e é assim que saem impressos.
 *
 * Texto transcrito dos documentos recebidos em 18/09/2026. A carga horária é a
 * padrão do curso: só sugere o campo no cadastro da turma, e o que sai no
 * documento é sempre a carga horária que a turma tiver.
 */

export type SecaoDePrograma = { titulo?: string; itens: string[] };
export type ProgramaDeCurso = { cargaHoraria: string; secoes: SecaoDePrograma[] };

export const PROGRAMAS: Record<string, ProgramaDeCurso> = {
  'NR 05': {
    cargaHoraria: '20 horas',
    secoes: [{
      itens: [
        'Estudo do ambiente, das condições de trabalho, bem como dos riscos originados do processo produtivo;',
        'Noções sobre acidentes e doenças relacionadas ao trabalho decorrentes das condições de trabalho e da exposição aos riscos existentes no estabelecimento e suas medidas de prevenção;',
        'Metodologia de investigação e análise de acidentes e doenças relacionadas ao trabalho;',
        'Princípios gerais de higiene do trabalho e de medidas de prevenção dos riscos;',
        'Noções sobre as legislações trabalhista e previdenciária relativas à segurança e saúde no trabalho;',
        'Noções sobre a inclusão de pessoas com deficiência e reabilitados nos processos de trabalho; e',
        'Organização da CIPA e outros assuntos necessários ao exercício das atribuições da comissão;',
        'Assédio moral.',
      ],
    }],
  },

  'NR 10': {
    cargaHoraria: '40 horas',
    secoes: [{
      titulo: 'Curso básico — Segurança em instalações e serviços com eletricidade (trabalhadores autorizados)',
      itens: [
        '1. Introdução à segurança com eletricidade.',
        '2. Riscos em instalações e serviços com eletricidade: a) o choque elétrico, mecanismos e efeitos; b) arcos elétricos, queimaduras e quedas; c) campos eletromagnéticos.',
        '3. Técnicas de análise de risco.',
        '4. Medidas de controle do risco elétrico: a) desenergização; b) aterramento funcional (TN / TT / IT), de proteção e temporário; c) equipotencialização; d) seccionamento automático da alimentação; e) dispositivos a corrente de fuga; f) extrabaixa tensão; g) barreiras e invólucros; h) bloqueios e impedimentos; i) obstáculos e anteparos; j) isolamento das partes vivas; k) isolação dupla ou reforçada; l) colocação fora de alcance; m) separação elétrica.',
        '5. Normas Técnicas Brasileiras — NBR da ABNT: NBR 5410, NBR 14039 e outras.',
        '6. Regulamentações do MTE: a) NRs; b) NR 10 (Segurança em Instalações e Serviços com Eletricidade); c) qualificação, habilitação, capacitação e autorização.',
        '7. Equipamentos de proteção coletiva.',
        '8. Equipamentos de proteção individual.',
        '9. Rotinas de trabalho — procedimentos: a) instalações desenergizadas; b) liberação para serviços; c) sinalização; d) inspeções de áreas, serviços, ferramental e equipamento.',
        '10. Documentação de instalações elétricas.',
        '11. Riscos adicionais: a) altura; b) ambientes confinados; c) áreas classificadas; d) umidade; e) condições atmosféricas.',
        '12. Proteção e combate a incêndios: a) noções básicas; b) medidas preventivas; c) métodos de extinção; d) prática.',
        '13. Acidentes de origem elétrica: a) causas diretas e indiretas; b) discussão de casos.',
        '14. Primeiros socorros: a) noções sobre lesões; b) priorização do atendimento; c) aplicação de respiração artificial; d) massagem cardíaca; e) técnicas para remoção e transporte de acidentados; f) práticas.',
      ],
    }],
  },

  'NR 10 SEP': {
    cargaHoraria: '40 horas',
    secoes: [{
      titulo: 'Curso complementar — Segurança no Sistema Elétrico de Potência (SEP) e em suas proximidades',
      itens: [
        '1. Organização do Sistema Elétrico de Potência — SEP.',
        '2. Organização do trabalho: a) programação e planejamento dos serviços; b) trabalho em equipe; c) prontuário e cadastro das instalações; d) métodos de trabalho; e e) comunicação.',
        '3. Aspectos comportamentais.',
        '4. Condições impeditivas para serviços.',
        '5. Riscos típicos no SEP e sua prevenção: a) proximidade e contatos com partes energizadas; b) indução; c) descargas atmosféricas; d) estática; e) campos elétricos e magnéticos; f) comunicação e identificação; e g) trabalhos em altura, máquinas e equipamentos especiais.',
        '6. Técnicas de análise de risco no SEP.',
        '7. Procedimentos de trabalho — análise e discussão.',
        '8. Técnicas de trabalho sob tensão: a) em linha viva; b) ao potencial; c) em áreas internas; d) trabalho a distância; e) trabalhos noturnos; e f) ambientes subterrâneos.',
        '9. Equipamentos e ferramentas de trabalho (escolha, uso, conservação, verificação, ensaios).',
        '10. Sistemas de proteção coletiva.',
        '11. Equipamentos de proteção individual.',
        '12. Posturas e vestuários de trabalho.',
        '13. Segurança com veículos e transporte de pessoas, materiais e equipamentos.',
        '14. Sinalização e isolamento de áreas de trabalho.',
        '15. Liberação de instalação para serviço e para operação e uso.',
        '16. Treinamento em técnicas de remoção, atendimento e transporte de acidentados.',
        '17. Acidentes típicos — análise, discussão e medidas de proteção.',
        '18. Responsabilidades.',
      ],
    }],
  },

  'NR 11': {
    cargaHoraria: '16 horas',
    secoes: [{
      titulo: 'Formação de operador de transpaleteira',
      itens: [
        'Objetivo do curso;',
        'Direção segura;',
        'Causas dos acidentes;',
        'Características dos instrumentos do painel;',
        'Como evitar colisões em curvas;',
        'Sono e fadiga;',
        'Álcool e condições adversas do condutor;',
        'Condições adversas de tempo e luz;',
        'Relacionamento interpessoal;',
        'Movimentação e operação de produtos perigosos;',
        'Tipos e modelos de transpaleteira;',
        'Ponto de equilíbrio;',
        'Estabilidade: centro de gravidade e base;',
        'Centro de carga;',
        'Inspeção preventiva;',
        'Regras de operação;',
        'Regras básicas de operação: operações diversas sem carga, com carga e com cargas especiais;',
        'Regras básicas de segurança;',
        'Sinalização de segurança;',
        'Equipamento de proteção individual;',
        'Exercícios práticos.',
      ],
    }],
  },

  'NR 12': {
    cargaHoraria: '8 horas',
    secoes: [{
      itens: [
        'Descrição e identificação dos riscos associados com cada máquina e equipamento e as proteções específicas contra cada um deles;',
        'Funcionamento das proteções: como e por que devem ser usadas;',
        'Como e em que circunstâncias uma proteção pode ser removida, e por quem — sendo, na maioria dos casos, somente o pessoal de inspeção ou manutenção;',
        'O que fazer, por exemplo contatar o supervisor, se uma proteção foi danificada ou se perdeu sua função, deixando de garantir uma segurança adequada;',
        'Os princípios de segurança na utilização da máquina ou equipamento;',
        'Segurança para riscos mecânicos, elétricos e outros relevantes;',
        'Método de trabalho seguro;',
        'Permissão de trabalho e sistema de bloqueio de funcionamento da máquina e equipamento durante operações de inspeção, limpeza, lubrificação e manutenção;',
        'Prevenção e combate a incêndio;',
        'Noções de primeiros socorros.',
      ],
    }],
  },

  'NR 18': {
    cargaHoraria: '4 horas',
    secoes: [{
      itens: [
        'I. Acidentes típicos nos trabalhos de impermeabilização;',
        'II. Riscos potenciais inerentes ao trabalho e medidas de prevenção;',
        'III. Operação do equipamento para aquecimento com segurança;',
        'IV. Condutas em situações de emergência, incluindo noções de técnicas de resgate e primeiros socorros (principalmente no caso de queimaduras);',
        'V. Isolamento da área e sinalização de advertência.',
      ],
    }],
  },

  'NR 20': {
    cargaHoraria: '4 horas',
    secoes: [
      {
        titulo: 'Conteúdo programático teórico',
        itens: [
          '1. Inflamáveis: características, propriedades, perigos e riscos;',
          '2. Controles coletivo e individual para trabalhos com inflamáveis;',
          '3. Fontes de ignição e seu controle;',
          '4. Proteção contra incêndio com inflamáveis;',
          '5. Procedimentos em emergências com inflamáveis;',
          '6. Estudo da Norma Regulamentadora n.º 20;',
          '7. Análise preliminar de perigos/riscos: conceitos e exercícios práticos;',
          '8. Permissão para trabalho com inflamáveis.',
        ],
      },
      {
        titulo: 'Conteúdo programático prático',
        itens: ['1. Conhecimentos e utilização dos sistemas de segurança contra incêndio com inflamáveis.'],
      },
    ],
  },

  'NR 31': {
    cargaHoraria: '4 horas',
    secoes: [{
      titulo: 'Prevenção e segurança no manejo com animais peçonhentos',
      itens: [
        'Identificação dos principais animais peçonhentos da região (serpentes, aranhas, escorpiões);',
        'Hábitos e habitats dos animais;',
        'Medidas preventivas no ambiente de trabalho rural;',
        'Uso correto de Equipamentos de Proteção Individual (EPIs);',
        'Uso de equipamentos para captura;',
        'Procedimentos de primeiros socorros em caso de acidentes;',
        'O que NÃO fazer em caso de picadas ou mordeduras;',
        'Fluxo de atendimento médico e soroterapia.',
      ],
    }],
  },

  'NR 33': {
    cargaHoraria: '8 horas',
    secoes: [
      {
        titulo: 'Para o supervisor de entrada',
        itens: [
          'I. Definições;',
          'II. Identificação dos espaços confinados;',
          'III. Reconhecimento, avaliação e controle de riscos;',
          'IV. Funcionamento de equipamentos utilizados;',
          'V. Procedimentos e utilização da PET;',
          'VI. Critérios de indicação e uso de equipamentos para controle de riscos;',
          'VII. Conhecimento sobre práticas seguras em espaços confinados;',
          'VIII. Legislação de segurança e saúde no trabalho;',
          'IX. Programa de Proteção Respiratória;',
          'X. Área classificada;',
          'XI. Noções de resgate e primeiros socorros; e',
          'XII. Operações de salvamento.',
        ],
      },
      {
        titulo: 'Para o vigia e o trabalhador autorizado',
        itens: [
          'a) Definições;',
          'b) Reconhecimento, avaliação e controle de riscos;',
          'c) Funcionamento de equipamentos utilizados;',
          'd) Procedimentos e utilização da PET; e',
          'e) Noções de resgate e primeiros socorros.',
        ],
      },
      {
        titulo: 'Para a equipe de emergência e salvamento',
        itens: [
          'Temas estabelecidos em normas técnicas nacionais vigentes que tratam de resgate técnico em espaços confinados e, na sua ausência, em normas técnicas internacionais.',
        ],
      },
    ],
  },

  'NR 35': {
    cargaHoraria: '8 horas',
    secoes: [{
      titulo: 'Formação — trabalho em altura',
      itens: [
        'Normas e regulamentos aplicáveis ao trabalho em altura;',
        'Análise de risco e condições impeditivas;',
        'Riscos potenciais inerentes ao trabalho em altura e medidas de prevenção e controle;',
        'Sistemas, equipamentos e procedimentos de proteção coletiva;',
        'EPIs — Equipamentos de Proteção Individual para trabalho em altura: seleção, inspeção, conservação e limitação de uso;',
        'Acidentes típicos em trabalhos em altura;',
        'Condutas em emergências, incluindo noções de técnicas de resgate e de primeiros socorros.',
      ],
    }],
  },

  'EMERGÊNCIAS QUÍMICAS': {
    cargaHoraria: '8 horas',
    secoes: [
      {
        titulo: 'Conceitos e legislação',
        itens: [
          'Conceitos básicos de emergências químicas e perigos;',
          'Aspectos legais e legislação pertinente (ex.: NR 6, NR 15, NR 20, ANTT 5232);',
          'Riscos associados a diferentes classes de produtos perigosos;',
          'Ficha de Dados de Segurança (FDS).',
        ],
      },
      {
        titulo: 'Identificação e avaliação',
        itens: [
          'Identificação de produtos químicos e suas propriedades (ex.: rotulagem, GHS, Diamante de Hommel);',
          'Avaliação inicial do cenário e riscos;',
          'Fontes de informação e ferramentas de apoio para emergências.',
        ],
      },
      {
        titulo: 'Resposta e ação',
        itens: [
          'Equipamentos de Proteção Individual (EPIs) e vestimentas especiais (níveis A, B, C e D);',
          'Procedimentos de resposta e ações ofensivas/defensivas;',
          'Técnicas de contenção de vazamentos;',
          'Controle ambiental e mitigação de impactos;',
          'Isolamento de área (zonas quente, morna e fria);',
          'Estação de descontaminação.',
        ],
      },
      {
        titulo: 'Gerenciamento e finalização',
        itens: [
          'Gerenciamento de resíduos químicos;',
          'Término de emergências;',
          'Primeiros socorros em emergências químicas.',
        ],
      },
      {
        titulo: 'Prática',
        itens: [
          'Discussão de casos práticos;',
          'Planejamento e execução de exercícios simulados.',
        ],
      },
    ],
  },
};

export function programaDoCurso(nr: string): ProgramaDeCurso | null {
  return PROGRAMAS[nr.trim()] ?? null;
}

/** Carga horária padrão do curso, para sugerir no cadastro da turma. */
export function cargaHorariaPadrao(nr: string) {
  return programaDoCurso(nr)?.cargaHoraria ?? '8 horas';
}
