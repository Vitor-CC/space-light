/**
 * Carro, celular e notebook que o instrutor usa a serviço da Space Light.
 * Ele preenche em "Meus documentos"; a equipe vê na ficha dele. Tudo opcional:
 * não trava a aprovação do cadastro. Fica numa coluna só
 * (`instructors.equipment`, JSON), sem arquivo.
 *
 * Sem `node:` aqui: o arquivo vai também para o navegador.
 */

export type EquipamentosDoInstrutor = {
  carro: { placa: string; modelo: string; cor: string; marca: string };
  celular: { modelo: string; imei: string; marca: string };
  notebook: { serie: string; modelo: string; marca: string };
};

type Grupo = keyof EquipamentosDoInstrutor;
type CampoDoGrupo = { chave: string; rotulo: string; exemplo?: string; ajuda?: string };

/** Ordem e textos dos campos, na tela do instrutor e na ficha da equipe. */
export const GRUPOS_DE_EQUIPAMENTO: { grupo: Grupo; titulo: string; campos: CampoDoGrupo[] }[] = [
  {
    grupo: 'carro',
    titulo: 'Carro',
    campos: [
      { chave: 'placa', rotulo: 'Placa', exemplo: 'ABC1D23' },
      { chave: 'modelo', rotulo: 'Modelo', exemplo: 'Onix' },
      { chave: 'cor', rotulo: 'Cor', exemplo: 'Prata' },
      { chave: 'marca', rotulo: 'Marca', exemplo: 'Chevrolet' },
    ],
  },
  {
    grupo: 'celular',
    titulo: 'Celular',
    campos: [
      { chave: 'modelo', rotulo: 'Modelo', exemplo: 'iPhone 15 Pro' },
      { chave: 'imei', rotulo: 'IMEI', exemplo: '15 números', ajuda: 'Digite *#06# no telefone para ver o número.' },
      { chave: 'marca', rotulo: 'Marca', exemplo: 'Apple' },
    ],
  },
  {
    grupo: 'notebook',
    titulo: 'Notebook',
    campos: [
      { chave: 'serie', rotulo: 'Número de série', ajuda: 'Na etiqueta embaixo do notebook.' },
      { chave: 'modelo', rotulo: 'Modelo', exemplo: 'Inspiron 15' },
      { chave: 'marca', rotulo: 'Marca', exemplo: 'Dell' },
    ],
  },
];

export function equipamentosVazios(): EquipamentosDoInstrutor {
  return {
    carro: { placa: '', modelo: '', cor: '', marca: '' },
    celular: { modelo: '', imei: '', marca: '' },
    notebook: { serie: '', modelo: '', marca: '' },
  };
}

/** Lê o JSON gravado; coluna vazia ou inválida vira tudo em branco. */
export function lerEquipamentos(json: string | null | undefined): EquipamentosDoInstrutor {
  const vazio = equipamentosVazios();
  let bruto: Record<string, Record<string, unknown>> = {};
  try { bruto = json ? JSON.parse(json) : {}; } catch { bruto = {}; }
  for (const { grupo, campos } of GRUPOS_DE_EQUIPAMENTO) {
    for (const { chave } of campos) {
      const valor = bruto?.[grupo]?.[chave];
      (vazio[grupo] as Record<string, string>)[chave] = typeof valor === 'string' ? valor : '';
    }
  }
  return vazio;
}

export function temEquipamento(equipamentos: EquipamentosDoInstrutor) {
  return GRUPOS_DE_EQUIPAMENTO.some(({ grupo, campos }) =>
    campos.some(({ chave }) => (equipamentos[grupo] as Record<string, string>)[chave]));
}

/** Placa antiga (ABC-1234) ou Mercosul (ABC1D23). */
export function normalizarPlaca(placa: string) {
  const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!limpa) return '';
  if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(limpa)) throw new Error('Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
  return /^[A-Z]{3}\d{4}$/.test(limpa) ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
}

/** IMEI tem 15 dígitos, e o último confere os outros (Luhn): pega número digitado errado. */
export function normalizarImei(imei: string) {
  const digitos = imei.replace(/\D/g, '');
  if (!digitos) return '';
  const erro = 'IMEI inválido. Digite *#06# no telefone e copie os 15 números.';
  if (digitos.length !== 15) throw new Error(erro);
  let soma = 0;
  for (let i = 0; i < 15; i += 1) {
    let d = Number(digitos[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    soma += d;
  }
  if (soma % 10 !== 0) throw new Error(erro);
  return digitos;
}

/** Limpa, limita o tamanho e confere placa e IMEI. Lança erro com texto para a tela. */
export function validarEquipamentos(entrada: unknown): EquipamentosDoInstrutor {
  const lido = lerEquipamentos(JSON.stringify(entrada ?? {}));
  for (const { grupo, campos } of GRUPOS_DE_EQUIPAMENTO) {
    for (const { chave } of campos) {
      const alvo = lido[grupo] as Record<string, string>;
      alvo[chave] = alvo[chave].trim().replace(/\s+/g, ' ').slice(0, 80);
    }
  }
  lido.carro.placa = normalizarPlaca(lido.carro.placa);
  lido.celular.imei = normalizarImei(lido.celular.imei);
  return lido;
}
