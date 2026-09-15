import type { Proposta } from '@/lib/site-novo/proposta';

export type LeadInput = Proposta & {
  /** Página de onde veio a solicitação, com os parâmetros da URL. */
  origem: string;
};

export type Result =
  | { ok: true; id: string }
  | { ok: false; erro: 'lead_nao_registrado' };

/**
 * Destino do lead do formulário "Solicitar proposta".
 *
 * ESTE É O ÚNICO LUGAR QUE SABE PARA ONDE O LEAD VAI. O formulário e a Server
 * Action só chamam `submitLead` e olham `ok`. Trocar o destino é editar o
 * corpo desta função — nada mais.
 *
 * Hoje: grava um log estruturado (uma linha JSON por lead) e devolve sucesso.
 * Na hospedagem, a linha aparece nos logs da função, buscando por
 * "lead.solicitar_proposta". O log contém dados pessoais (nome, e-mail,
 * celular, CNPJ): é uma solução de transição, não um arquivo de leads.
 *
 * Quando o destino for decidido, as três opções e o que cada uma exige:
 *
 * 1. E-MAIL (Resend)
 *    - `lib/mailer.ts` já envia e-mail pela Resend no "esqueci minha senha",
 *      com as variáveis RESEND_API_KEY e MAIL_FROM.
 *    - Exige: exportar uma função genérica de envio (hoje `sendEmail` é
 *      interna), criar uma variável com o e-mail comercial de destino e
 *      montar o corpo do e-mail com os campos, escapando o HTML.
 *    - Prós: nada de banco novo. Contras: o histórico fica só na caixa de
 *      entrada.
 *
 * 2. BANCO VIA DRIZZLE
 *    - Exige: tabela de leads em `db/schema.ts`, migração em `drizzle/` e uma
 *      função de gravação no repositório. Schema e migração estão fora do
 *      escopo do site novo e precisam de aprovação à parte.
 *    - Prós: lead consultável e contável, e dá para listar na área da
 *      empresa. Contras: é mudança no banco de produção.
 *
 * 3. WHATSAPP
 *    - Envio automático exige a API oficial do WhatsApp Business: conta
 *      verificada, modelo de mensagem aprovado e custo por conversa.
 *    - Abrir o wa.me no aparelho de quem preenche não registra lead nenhum,
 *      então não serve como destino.
 *
 * Qualquer opção pode somar com a atual: manter o log e acrescentar o destino
 * novo, para não perder lead durante a troca.
 */
export async function submitLead(data: LeadInput): Promise<Result> {
  const id = crypto.randomUUID();
  try {
    console.info(
      JSON.stringify({
        event: 'lead.solicitar_proposta',
        id,
        recebidoEm: new Date().toISOString(),
        lead: data,
      }),
    );
    return { ok: true, id };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'lead.solicitar_proposta.falha',
        id,
        erro: error instanceof Error ? error.message : String(error),
      }),
    );
    return { ok: false, erro: 'lead_nao_registrado' };
  }
}
