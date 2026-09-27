import { after } from 'next/server';

import { registerSiteLead } from '@/db/company-repository';
import { isLeadNotificationConfigured, sendNewLeadEmail } from '@/lib/mailer';
import { OPCOES_DE_TREINAMENTO } from '@/lib/site-novo/normas';
import type { Proposta } from '@/lib/site-novo/proposta';
import { SITE_URL } from '@/lib/site-url';

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
 *
 * Com o e-mail configurado (LEADS_EMAIL_TO), a equipe recebe um aviso. Ele sai
 * depois da resposta, então não atrasa nem derruba o envio do formulário, e
 * sai também quando o banco falha: vira a cópia do pedido fora do servidor.
 */
export async function submitLead(data: LeadInput): Promise<Result> {
  const id = crypto.randomUUID();
  const recebidoEm = new Date().toISOString();
  avisarEquipe(data, id);
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

function avisarEquipe(data: LeadInput, id: string) {
  if (!isLeadNotificationConfigured()) return;
  after(async () => {
    const treinamentos = data.treinamentos
      .map((valor) => OPCOES_DE_TREINAMENTO.find((opcao) => opcao.valor === valor)?.rotulo ?? valor)
      .join(' · ');
    try {
      await sendNewLeadEmail({
        nome: data.nome,
        empresa: data.empresa,
        email: data.email,
        campos: [
          ['Nome', data.nome],
          ['Cargo', data.cargo],
          ['E-mail', data.email],
          ['Celular', data.celular],
          ['Empresa', data.empresa],
          ['CNPJ', data.cnpj],
          ['Funcionários', data.tamanho],
          ['UF', data.uf],
          ['Treinamentos', treinamentos],
          ['Participantes', data.participantes],
          ['Modalidade', data.modalidade],
          ['Prazo', data.prazo],
          ['Página', data.origem],
        ],
        mensagem: data.mensagem,
        portalLink: `${(process.env.APP_URL?.trim() || SITE_URL).replace(/\/$/, '')}/empresa`,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'lead.solicitar_proposta.aviso_falhou',
          id,
          erro: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  });
}
