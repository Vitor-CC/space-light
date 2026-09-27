import { registerSiteLead } from '@/db/company-repository';
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
 * Action só chamam `submitLead` e olham `ok`.
 *
 * O lead é gravado na tabela `site_leads` e aparece nas Solicitações da área
 * da empresa, com a origem "Site". O log fica só com o id. Se o banco falhar,
 * o log recebe o lead inteiro, para não perder o pedido, e a pessoa vê a
 * confirmação normalmente.
 */
export async function submitLead(data: LeadInput): Promise<Result> {
  const id = crypto.randomUUID();
  const recebidoEm = new Date().toISOString();
  try {
    await registerSiteLead({ ...data, id });
    console.info(JSON.stringify({ event: 'lead.solicitar_proposta', id, recebidoEm }));
    return { ok: true, id };
  } catch (error) {
    try {
      console.error(
        JSON.stringify({
          event: 'lead.solicitar_proposta.sem_banco',
          id,
          recebidoEm,
          erro: error instanceof Error ? error.message : String(error),
          lead: data,
        }),
      );
      return { ok: true, id };
    } catch {
      return { ok: false, erro: 'lead_nao_registrado' };
    }
  }
}
