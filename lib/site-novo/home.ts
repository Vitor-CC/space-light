import { Building2, FileText, MapPin, ShieldCheck, SlidersHorizontal, Users, type LucideIcon } from 'lucide-react';

import { imagemMarca } from '@/lib/site-novo/imagens';

/*
 * Textos da home, como estão no Figma (página "02 · Site Desktop", frame
 * "Home · Desktop 1440"). Os números e as avaliações são os do Figma; as
 * avaliações ficam sem o nome de quem avaliou até a Space confirmar cada um.
 */

export const PROVA_SOCIAL = {
  nota: '5,0',
  avaliacoes: 33,
  treinados: 'mais de 26 mil profissionais treinados',
  treinadosCurto: '+26 mil treinados',
} as const;

/**
 * Textos que o Figma encurta no celular ("03 · Site Mobile"): `curto` vale
 * abaixo de 1024 px, `longo` a partir dele.
 */
export const TEXTOS = {
  abertura: {
    curto: 'Treinamentos de NR com teoria aplicada, prática supervisionada e toda a documentação da turma pronta para a auditoria.',
    longo: 'Treinamentos de Normas Regulamentadoras com teoria aplicada, prática supervisionada e toda a documentação da turma organizada para a auditoria.',
  },
  pratica: {
    curto: 'O que muda comportamento é o momento em que a pessoa executa, erra com supervisão e entende o porquê.',
    longo: 'Conteúdo técnico em sala responde à norma. O que muda comportamento é o momento em que a pessoa executa, erra com supervisão e entende o porquê.',
  },
  comoTrabalhamos: {
    curto: 'Da conversa ao certificado.',
    longo: 'Um processo que transforma conteúdo em conduta.',
  },
  proposta: {
    curto: 'A Space Light retorna com a proposta e o caminho recomendado.',
    longo: 'Preencha o formulário com o essencial e a Space Light retorna com a proposta e o caminho recomendado.',
  },
} as const;

export const FAIXA_DE_PROVAS = [
  { titulo: 'Teoria + prática', texto: 'Conteúdo da norma aplicado ao cenário real.' },
  { titulo: 'Sob medida', texto: 'Programa ajustado à operação e ao público.' },
  { titulo: 'Instrutores especializados', texto: 'Condução técnica, próxima da equipe.' },
  { titulo: 'Registro no portal', texto: 'Presença, fotos e certificados em um lugar.' },
] as const;

export const NUMEROS = [
  { valor: '+26 mil', rotulo: 'profissionais treinados', curto: 'profissionais treinados' },
  { valor: '5 anos', rotulo: 'de mercado em segurança do trabalho', curto: 'de mercado' },
  { valor: 'Nacional', rotulo: 'base em São Paulo, turmas em todo o Brasil', curto: 'base em SP' },
  { valor: 'Médio e grande porte', rotulo: 'logística, indústria e varejo', curto: 'logística, indústria, varejo' },
] as const;

export const FOTO_DA_ABERTURA = {
  src: imagemMarca('heroes/space-light-hero-01'),
  norma: 'NR 23',
  legenda: 'Exercício com extintor portátil em fogo controlado, sob supervisão do instrutor.',
  alt: 'Participante usa um extintor portátil num fogo controlado, observada por um instrutor e por colegas de colete refletivo.',
} as const;

export const PRINCIPIOS = [
  { titulo: 'Prática supervisionada', texto: 'O participante executa o procedimento com o instrutor acompanhando cada etapa.' },
  { titulo: 'Aprendizado coletivo', texto: 'A turma observa, comenta e corrige junto — é assim que o conhecimento fixa.' },
  { titulo: 'Reconhecimento de risco', texto: 'Identificar o risco no próprio ambiente, não em foto de slide.' },
  { titulo: 'Cultura de segurança', texto: 'A conversa continua depois do treinamento, dentro da rotina da equipe.' },
] as const;

export const FOTOS_DA_PRATICA = [
  {
    src: imagemMarca('cases/space-light-case-01'),
    norma: 'NR 23',
    legenda: 'Combate a princípio de incêndio com extintor.',
    alt: 'Participante aplica o jato de um extintor em fogo controlado enquanto a turma, de colete refletivo, observa ao lado do instrutor.',
  },
  {
    src: imagemMarca('cases/space-light-case-02'),
    norma: 'NR 35',
    legenda: 'Exercício em estrutura elevada, com ancoragem.',
    alt: 'Dois participantes suspensos por cordas numa estrutura metálica, acompanhados por um instrutor na plataforma.',
  },
  {
    src: imagemMarca('cases/space-light-case-03'),
    norma: 'NR 10',
    legenda: 'Demonstração em painel elétrico.',
    alt: 'Participante usa um instrumento de medição num painel elétrico aberto enquanto colegas de capacete e luvas observam em fila.',
  },
  {
    src: imagemMarca('cases/space-light-case-04'),
    norma: 'NR 33',
    legenda: 'Resgate com tripé de ancoragem.',
    alt: 'Tripé de ancoragem sobre uma abertura no piso, isolada por correntes, com um participante suspenso e a equipe acompanhando.',
  },
] as const;

export const CHECKLIST_DO_PORTAL = [
  'Lista de presença da turma',
  'Fotos da prática',
  'Documentos do treinamento',
  'Certificado de cada participante',
] as const;

export type Modalidade = {
  numero: string;
  nome: string;
  icone: LucideIcon;
  situacao: { tom: 'sucesso' | 'atencao'; texto: string };
  como: string;
  quando: string;
  quandoCurto: string;
};

export const MODALIDADES: readonly Modalidade[] = [
  {
    numero: '01',
    nome: 'In company',
    icone: Building2,
    situacao: { tom: 'sucesso', texto: 'Disponível' },
    como: 'A Space leva o treinamento até a sua planta, no seu equipamento e no seu cenário.',
    quando: 'Quando o risco a treinar é o da própria operação e deslocar a equipe é caro.',
    quandoCurto: 'Quando o risco é o da própria operação.',
  },
  {
    numero: '02',
    nome: 'Centro de treinamento',
    icone: MapPin,
    // A Space ainda não confirmou se o centro já opera (pergunta do Figma).
    situacao: { tom: 'atencao', texto: 'A confirmar' },
    como: 'A turma vai até uma estrutura preparada para a prática.',
    quando: 'Quando o exercício exige estrutura que a planta não tem.',
    quandoCurto: 'Quando o exercício exige estrutura que a planta não tem.',
  },
];

export const DIFERENCIAIS: readonly { titulo: string; texto: string; curto: string; icone: LucideIcon }[] = [
  { titulo: 'Didática', texto: 'Conteúdo técnico traduzido em experiência clara e participativa.', curto: 'Técnico traduzido em experiência clara.', icone: FileText },
  { titulo: 'Personalização', texto: 'Estrutura adaptada ao contexto, ao público e à operação da empresa.', curto: 'Adaptado à operação e ao público.', icone: SlidersHorizontal },
  { titulo: 'Profissionalismo', texto: 'Condução cuidadosa, organização e compromisso em todas as etapas.', curto: 'Organização e compromisso em cada etapa.', icone: ShieldCheck },
  { titulo: 'Proximidade', texto: 'Escuta ativa para construir treinamentos que façam sentido para aquela equipe.', curto: 'Escuta ativa com a equipe.', icone: Users },
];

/** Reproduzidas como estão no Google (inclusive a grafia). */
export const AVALIACOES = [
  'Excelente, ótimos professores e treinamento de excelencia',
  'Foi maravilhoso! Pessoas e treinadores incríveis.',
  'Ótima, ótimos profissionais e ótimos treinamentos, espero voltar mais vezes',
] as const;

/** Até a Space mandar o link do perfil de Embu das Artes, a busca leva até ele. */
export const LINK_DAS_AVALIACOES = 'https://www.google.com/search?q=Space+Light+Engenharia+Embu+das+Artes';

export const PERGUNTAS = [
  {
    pergunta: 'Vocês atendem fora de São Paulo?',
    resposta: 'Sim. A base é em São Paulo e o atendimento é nacional — levamos a turma até a sua planta.',
  },
  {
    pergunta: 'O treinamento pode ser adaptado à nossa operação?',
    resposta:
      'Sim. Conteúdo, formato e dinâmica são organizados de acordo com a realidade da empresa, a partir do que entendemos da operação, do público e dos riscos da rotina.',
  },
  {
    pergunta: 'Como recebo a documentação da turma?',
    resposta:
      'Pelo portal do cliente: lista de presença, fotos da prática, documentos do treinamento e o certificado de cada participante ficam organizados por turma, prontos para baixar.',
  },
  {
    pergunta: 'Com que frequência preciso reciclar?',
    resposta:
      'Depende da norma: cada uma define a sua periodicidade. Quando a validade fica registrada na turma, o portal do cliente mostra as reciclagens que estão chegando.',
  },
  {
    pergunta: 'Quantas pessoas cabem em uma turma?',
    resposta: 'Depende do treinamento e da parte prática. A proposta confirma o tamanho da turma para a sua operação.',
  },
] as const;
