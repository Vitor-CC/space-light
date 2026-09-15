'use server';

import { submitLead } from '@/lib/leads';
import { OPCOES_DE_TREINAMENTO } from '@/lib/site-novo/normas';
import {
  lerProposta,
  resumoDosErros,
  textoDoFormulario,
  validarProposta,
  type ErrosDaProposta,
} from '@/lib/site-novo/proposta';

export type EstadoDaProposta =
  | { status: 'inicial' }
  | { status: 'erro'; erros: ErrosDaProposta; mensagem: string }
  | { status: 'sucesso' };

/**
 * Server Action do formulário "Solicitar proposta". É um endpoint público:
 * valida tudo de novo aqui, porque a validação do navegador pode ser pulada,
 * e só então entrega o lead para `submitLead`.
 */
export async function enviarProposta(
  _estadoAnterior: EstadoDaProposta,
  dados: FormData,
): Promise<EstadoDaProposta> {
  // Campo que pessoas não veem: robôs costumam preencher todos os campos.
  // Responde como sucesso para não ensinar o robô a contornar.
  if (textoDoFormulario(dados, 'site')) return { status: 'sucesso' };

  const proposta = lerProposta(dados);
  const erros = validarProposta(
    proposta,
    OPCOES_DE_TREINAMENTO.map((opcao) => opcao.valor),
  );
  if (Object.keys(erros).length > 0) {
    return { status: 'erro', erros, mensagem: resumoDosErros(erros) };
  }

  const resultado = await submitLead({
    ...proposta,
    origem: textoDoFormulario(dados, 'origem').slice(0, 300),
  });
  if (!resultado.ok) {
    return {
      status: 'erro',
      erros: {},
      mensagem:
        'Não conseguimos registrar a solicitação agora. Tente de novo em alguns instantes ou fale com a gente pelo WhatsApp.',
    };
  }
  return { status: 'sucesso' };
}
