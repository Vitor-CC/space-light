/**
 * Formulário "Solicitar proposta": opções, formatação e validação.
 *
 * O mesmo arquivo roda no navegador, para apontar o erro enquanto a pessoa
 * preenche, e no servidor, onde a validação vale de verdade antes de registrar
 * o lead. As mensagens dizem o que fazer, e não só que o campo está errado.
 */

export const CARGOS = [
  'Téc. Segurança do Trabalho',
  'Eng. Segurança',
  'SESMT',
  'RH',
  'Coordenador',
  'Gerente',
  'Diretor',
  'Comprador',
  'Outro',
] as const;

export const TAMANHOS = ['1–30', '31–100', '101–500', '+500'] as const;

export const MODALIDADES = [
  'In company',
  'Centro de treinamento',
  'A definir',
] as const;

export const PRAZOS = [
  'Este mês',
  'Próximos 3 meses',
  'Ainda planejando',
] as const;

export const UFS = [
  ['AC', 'Acre'],
  ['AL', 'Alagoas'],
  ['AP', 'Amapá'],
  ['AM', 'Amazonas'],
  ['BA', 'Bahia'],
  ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'],
  ['MA', 'Maranhão'],
  ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'],
  ['PA', 'Pará'],
  ['PB', 'Paraíba'],
  ['PR', 'Paraná'],
  ['PE', 'Pernambuco'],
  ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'],
  ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'],
  ['RR', 'Roraima'],
  ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'],
  ['SE', 'Sergipe'],
  ['TO', 'Tocantins'],
] as const;

/** Valor do checkbox "Outro" na lista de treinamentos. */
export const TREINAMENTO_OUTRO = 'outro';

export type Proposta = {
  nome: string;
  email: string;
  celular: string;
  empresa: string;
  cnpj: string;
  cargo: string;
  tamanho: string;
  uf: string;
  participantes: string;
  modalidade: string;
  treinamentos: string[];
  prazo: string;
  mensagem: string;
};

export type CampoDaProposta = keyof Proposta;
export type ErrosDaProposta = Partial<Record<CampoDaProposta, string>>;

/** Ordem em que os campos aparecem: o foco vai para o primeiro com erro. */
export const ORDEM_DOS_CAMPOS: readonly CampoDaProposta[] = [
  'nome',
  'email',
  'celular',
  'empresa',
  'cnpj',
  'cargo',
  'tamanho',
  'uf',
  'treinamentos',
  'participantes',
  'modalidade',
  'prazo',
  'mensagem',
];

export function propostaVazia(treinamentos: string[] = []): Proposta {
  return {
    nome: '',
    email: '',
    celular: '',
    empresa: '',
    cnpj: '',
    cargo: '',
    tamanho: '',
    uf: '',
    participantes: '',
    modalidade: '',
    treinamentos,
    prazo: '',
    mensagem: '',
  };
}

/** Texto de um campo do FormData; arquivo ou campo ausente viram texto vazio. */
export function textoDoFormulario(dados: FormData, nome: string) {
  const valor = dados.get(nome);
  return typeof valor === 'string' ? valor.trim() : '';
}

export function lerProposta(dados: FormData): Proposta {
  const texto = (campo: CampoDaProposta) => textoDoFormulario(dados, campo);
  return {
    nome: texto('nome'),
    email: texto('email'),
    celular: texto('celular'),
    empresa: texto('empresa'),
    cnpj: texto('cnpj'),
    cargo: texto('cargo'),
    tamanho: texto('tamanho'),
    uf: texto('uf'),
    participantes: texto('participantes'),
    modalidade: texto('modalidade'),
    treinamentos: dados
      .getAll('treinamentos')
      .filter((item): item is string => typeof item === 'string'),
    prazo: texto('prazo'),
    mensagem: texto('mensagem'),
  };
}

const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');
const normalizarCnpj = (valor: string) =>
  valor.toUpperCase().replace(/[^0-9A-Z]/g, '');

/** (11) 91234-5678, conforme a pessoa digita. */
export function formatarCelular(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 12.ABC.345/01DE-35 — aceita o CNPJ numérico e o alfanumérico. */
export function formatarCnpj(valor: string) {
  const c = normalizarCnpj(valor).slice(0, 14);
  let formatado = c.slice(0, 2);
  if (c.length > 2) formatado += `.${c.slice(2, 5)}`;
  if (c.length > 5) formatado += `.${c.slice(5, 8)}`;
  if (c.length > 8) formatado += `/${c.slice(8, 12)}`;
  if (c.length > 12) formatado += `-${c.slice(12, 14)}`;
  return formatado;
}

/**
 * Dígitos verificadores do CNPJ. Desde julho de 2026 a Receita Federal emite
 * CNPJ alfanumérico para novas inscrições (IN RFB nº 2.229/2024): as 12
 * primeiras posições podem ter letras e o cálculo continua sendo módulo 11,
 * com cada caractere valendo o seu código ASCII menos 48 (0 = 0, A = 17). Para
 * CNPJ só com números o resultado é o mesmo do cálculo tradicional.
 */
export function digitosVerificadoresCnpj(base12: string) {
  const digito = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base
      .split('')
      .reduce(
        (total, caractere, indice) =>
          total + (caractere.charCodeAt(0) - 48) * pesos[indice],
        0,
      );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(base12);
  const segundo = digito(`${base12}${primeiro}`);
  return `${primeiro}${segundo}`;
}

function erroDoCnpj(valor: string) {
  const c = normalizarCnpj(valor);
  if (!c) return 'Informe o CNPJ da empresa.';
  if (c.length !== 14)
    return 'O CNPJ precisa ter 14 caracteres. Confira se faltou algum.';
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c))
    return 'Os dois últimos caracteres do CNPJ são números. Confira o final.';
  if (/^(.)\1{13}$/.test(c)) return 'Esse CNPJ não existe. Confira o número.';
  if (digitosVerificadoresCnpj(c.slice(0, 12)) !== c.slice(12))
    return 'Os dígitos verificadores não conferem. Confira o CNPJ.';
  return undefined;
}

const incluido = (lista: readonly string[], valor: string) =>
  lista.includes(valor);

/** Frase curta que acompanha o botão quando há campos a corrigir. */
export function resumoDosErros(erros: ErrosDaProposta) {
  const total = Object.keys(erros).length;
  if (total === 0) return '';
  return total === 1
    ? 'Revise o campo marcado acima.'
    : `Revise os ${total} campos marcados acima.`;
}

/**
 * Valida a proposta inteira e devolve um erro por campo. `treinamentosValidos`
 * vem do servidor, que conhece as normas; no navegador basta marcar um.
 */
export function validarProposta(
  proposta: Proposta,
  treinamentosValidos?: readonly string[],
): ErrosDaProposta {
  const erros: ErrosDaProposta = {};

  if (!proposta.nome) erros.nome = 'Informe o seu nome.';
  else if (proposta.nome.length < 3) erros.nome = 'Informe o nome completo.';
  else if (proposta.nome.length > 120)
    erros.nome = 'O nome pode ter até 120 caracteres.';

  if (!proposta.email) erros.email = 'Informe o seu e-mail corporativo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(proposta.email))
    erros.email =
      'Confira o e-mail: ele precisa ter o formato nome@empresa.com.br.';

  const celular = somenteDigitos(proposta.celular);
  if (!celular) erros.celular = 'Informe um celular com DDD.';
  else if (celular.length !== 11 || celular[2] !== '9')
    erros.celular =
      'O celular precisa ter DDD e 9 dígitos, como (11) 91234-5678.';

  if (!proposta.empresa) erros.empresa = 'Informe o nome da empresa.';
  else if (proposta.empresa.length > 160)
    erros.empresa = 'O nome da empresa pode ter até 160 caracteres.';

  const erroCnpj = erroDoCnpj(proposta.cnpj);
  if (erroCnpj) erros.cnpj = erroCnpj;

  if (!incluido(CARGOS, proposta.cargo)) erros.cargo = 'Escolha o seu cargo.';
  if (!incluido(TAMANHOS, proposta.tamanho))
    erros.tamanho = 'Escolha o tamanho da empresa.';
  if (
    !incluido(
      UFS.map(([sigla]) => sigla),
      proposta.uf,
    )
  )
    erros.uf = 'Escolha o estado.';

  if (proposta.treinamentos.length === 0)
    erros.treinamentos = 'Marque pelo menos um treinamento.';
  else if (
    treinamentosValidos &&
    proposta.treinamentos.some((t) => !treinamentosValidos.includes(t))
  )
    erros.treinamentos = 'Marque os treinamentos na lista.';

  if (!proposta.participantes)
    erros.participantes = 'Informe quantas pessoas vão participar.';
  else if (
    !/^\d+$/.test(proposta.participantes) ||
    Number(proposta.participantes) < 1
  )
    erros.participantes =
      'Use só números inteiros, a partir de 1, para o número de participantes.';
  else if (Number(proposta.participantes) > 100000)
    erros.participantes = 'Confira o número de participantes.';

  if (!incluido(MODALIDADES, proposta.modalidade))
    erros.modalidade = 'Escolha a modalidade.';

  if (proposta.prazo && !incluido(PRAZOS, proposta.prazo))
    erros.prazo = 'Escolha um prazo da lista ou deixe em branco.';

  if (proposta.mensagem.length > 2000)
    erros.mensagem = 'A mensagem pode ter até 2.000 caracteres.';

  return erros;
}
