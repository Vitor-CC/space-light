/**
 * Conteúdo programático da NR 23 (Brigada de Incêndio).
 *
 * A grade é fixa para a norma — o que muda de turma para turma é só a carga
 * horária, que vem do cadastro do treinamento. O texto foi transcrito do
 * documento oficial da Space Light, incluindo a grafia original.
 */

export type ProgramRow = {
  modulo: string;
  assunto: string;
  teorica: string;
  pratica: string;
};

export const NR23_PROGRAM: ProgramRow[] = [
  {
    modulo: 'INTRODUÇÃO',
    assunto: 'OBJETIVO DE CURSOS E O BRIGADISTA',
    teorica: 'CONHECER OS OBJETIVOS GERAIS DO CURSO E COMPORTAMENTO DO BRIGADISTA',
    pratica: '',
  },
  {
    modulo: 'ASPECTOS LEGAIS',
    assunto: 'RESPONSABILIDADE DO BRIGADISTA',
    teorica: 'CONHECER OS ASPECTOS LEGAIS RELACIONADOS A RESPONSABILIDADE DO BRIGADISTA',
    pratica: '',
  },
  {
    modulo: 'TEORIA DO FOGO',
    assunto: 'COMBUSTÃO, SEUS ELEMENTOS E A REAÇÃO EM CADEIA',
    teorica: 'CONHECER A COMBUSTÃO, SEUS ELEMENTOS, FUNÇÕES, TEMPERATURAS DO FOGO (POR EXEMPLO: PONTO DE FULGOR, IGNIÇÃO E COMBUSTÃO) E A REAÇÃO EM CADEIA',
    pratica: '',
  },
  {
    modulo: 'PROPAGAÇÃO DO FOGO',
    assunto: 'CONDUÇÃO, CONVECÇÃO E IRRADIAÇÃO',
    teorica: 'CONHECER AS FORMAS DE PROPAGAÇÃO DO FOGO',
    pratica: '',
  },
  {
    modulo: 'CLASSES DE INCÊNDIO',
    assunto: 'CLASSIFICAÇÃO E CARACTERÍSTICAS',
    teorica: 'IDENTIFICAR AS CLASSES DE INCÊNDIO',
    pratica: 'RECONHECER AS CLASSES DE INCENDIO',
  },
  {
    modulo: 'PREVENÇÃO DE INCÊNDIO',
    assunto: 'TÉCNICAS DE PREVENÇÃO',
    teorica: 'CONHECER AS TECNICAS DE PREVENÇÃO PARA AVALIAÇÃO DOS RISCOS EM POTENCIAL',
    pratica: '',
  },
  {
    modulo: 'MÉTODOS DE EXTINÇÃO',
    assunto: 'ISOLAMENTO, ABAFAMENTO, RESFRIAMENTO E EXTINÇÃO QUÍMICA',
    teorica: 'CONHECER OS MÉTODOS E SUAS APLICAÇÕES',
    pratica: 'APLICAR OS METODOS',
  },
  {
    modulo: 'AGENTES EXTINTORES',
    assunto: 'ÁGUA, PÓS, CO², ESPUMAS E OUTROS',
    teorica: 'CONHECER OS AGENTES, SUAS CARACTERÍSTICAS E APLICAÇÕES',
    pratica: 'APLICAR OS AGENTES',
  },
  {
    modulo: 'EPI (EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL)',
    assunto: 'EPI',
    teorica: 'CONHECER OS EPI NECESSÁRIOS PARA PROTEÇÃO DA CABEÇA, DOS OLHOS, DO TRONCO, DOS MEMBROS SUPERIORES E INFERIORES DO CORPO TODO',
    pratica: 'UTILIZAR O EPI CORRETAMENTE',
  },
  {
    modulo: 'EQUIPAMENTOS DE COMBATE A INCÊNDIO',
    assunto: 'EXTINTORES, MANGUEIRAS E ACESSÓRIOS',
    teorica: 'CONHECER OS EQUIPAMENTOS SUAS APLICAÇÕES, MANUSEIOS E INSPEÇÕES',
    pratica: 'OPERAR OS EQUIPAMENTOS',
  },
  {
    modulo: 'EQUIPAMENTOS DE DETECÇÃO, ALARME, LUZ DE EMERGENCIA E COMUNICAÇÕES',
    assunto: 'TIPOS E FUNCIONAMENTO',
    teorica: 'CONHECER OS MEIOS MAIS COMUNS DE SISTEMAS E MANUSEIOS',
    pratica: 'IDENTIFICAR AS FORMAS DE ACIONAMENTO E DESATIVAÇÃO DOS EQUIPAMENTOS',
  },
  {
    modulo: 'ABANDONO DE ÁREA',
    assunto: 'CONCEITOS',
    teorica: 'CONHECER AS TÉCNICAS DE ABANDONO DE ÁREA, SAÍDA ORGANIZADA, PONTOS DE ENCONTRO E CHAMADA E CONTROLE DE PÂNICO',
    pratica: '',
  },
  {
    modulo: 'PESSOAS COM MOBILIDADE REDUZIDA',
    assunto: 'CONCEITOS',
    teorica: 'DESCREVER AS TÉCNICAS DE ABORDAGEM, CUIDADOS E CONDUÇÃO DE ACORDO COM O PLANO DE EMERGÊNCIA DA PLANTA',
    pratica: '',
  },
  {
    modulo: 'AVALIAÇÃO INICIAL',
    assunto: 'AVALIAÇÃO DO CENÁRIO, MECANISMO DE LESÃO, NÚMEROS DE VÍTIMAS',
    teorica: 'CONHECER OS RISCOS IMENENTES, OS MECANISMOS DE LESÃO, NÚMERO DE VÍTIMAS E O EXAME FÍSICO DESTAS',
    pratica: 'AVALIAR E RECONHECER OS RISCOS IMINENTES, OS MECANISMOS DE LESÃO, O NUMERO DE VITIMAS E O EXAME FISICO DESTAS.',
  },
  {
    modulo: 'VIAS AÉREAS',
    assunto: 'CAUSAS DE OBSTRUÇÃO E LIBERAÇÃO',
    teorica: 'CONHECER OS SINAIS E SINTOMAS DE OBSTRUÇÃO EM ADULTOS, CRIANÇAS E BEBÊS CONSCIENTES E INCONSCIENTES',
    pratica: 'DESCREVER OS SINAIS E SINTOMAS DE OBSTRUÇÃO EM ADULTOS, CRIANÇAS E BEBÊS CONSCIENTES E INCONSCIENTES E PROMOVER A DESOBSTRUÇÃO.',
  },
  {
    modulo: 'RCP (REANIMAÇÃO CARDIOPULMONAR)',
    assunto: 'VENTILAÇÃO ARTIFICIAL E COMPRESSÃO CARDÍACA EXTERNA',
    teorica: 'CONHECER AS TÉCNICAS DE RCP PARA ADULTOS, CRIANÇAS E BEBÊS',
    pratica: 'PRATICAR AS TECNICAS DE RCP',
  },
  {
    modulo: 'HEMORRAGIAS',
    assunto: 'CLASSIFICAÇÃO E TRATAMENTO',
    teorica: 'DESCREVER AS TÉCNICAS DE HEMOSTASIA',
    pratica: 'APLICAR AS TECNICAS DE CONTENÇÃO DE HEMORRAGIAS',
  },
  {
    modulo: 'RISCOS ESPECÍFICOS DA PLANTA',
    assunto: 'CONHECIMENTOS',
    teorica: 'DISCUTIR OS RISCOS ESPECÍFICOS E O PLANO DE EMERGENCIA CONTRA INCÊNDIO DA PLANTA',
    pratica: '',
  },
  {
    modulo: 'PSICOLOGIA DE EMERGÊNCIAS',
    assunto: 'CONCEITOS',
    teorica: 'CONHECER A REAÇÃO DAS PESSOAS EM SITUAÇÕES DE EMERGÊNCIAS',
    pratica: '',
  },
  {
    modulo: 'SISTEMA DE CONTROLE DE INCIDENTES',
    assunto: 'CONCEITOS E PRECEDIMENTOS',
    teorica: 'CONHECER OS CONCEITOS E PROCEDIMENTOS RELACIONADOS AO SISTEMA DE CONTROLE DE INCIDENTES',
    pratica: '',
  },
  {
    modulo: 'EMERGÊNCIAS QUÍMICAS E TECNOLOGICAS',
    assunto: 'CONCEITOS E PROCEDIMENTOS',
    teorica: 'CONHECER AS NORMAS E PROCEDIMENTOS RELACIONADOS AS EMERGÊNCIAS QUÍMICAS E TECNOLÓGICAS',
    pratica: 'APLICAR AS TECNICAS PARA EMERGÊNCIAS QUIMICAS E TECNOLOGICAS',
  },
];

/** Cada norma tem a sua grade; hoje só a NR 23 está transcrita. */
export function programForNr(nr: string): ProgramRow[] | null {
  return nr.trim() === 'NR 23' ? NR23_PROGRAM : null;
}
