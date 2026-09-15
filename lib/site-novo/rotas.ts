/**
 * Endereços do site novo. Enquanto ele convive com o site atual, tudo vive sob
 * `/v2`; na troca de rota basta `SITE_BASE = ''`.
 */
export const SITE_BASE: string = '/v2';

const inicio = SITE_BASE || '/';

export const rotas = {
  inicio,
  treinamentos: `${inicio}#treinamentos`,
  comoTrabalhamos: `${inicio}#como-trabalhamos`,
  contato: `${SITE_BASE}/contato`,
  /** Proposta já com a norma marcada no formulário (lido na etapa 5). */
  proposta: (slug: string) => `${SITE_BASE}/contato?treinamento=${slug}`,
  norma: (slug: string) => `${SITE_BASE}/treinamentos/${slug}`,
  // Portais: só link, fora do escopo do site novo.
  portal: '/entrar',
  portalCliente: '/cliente/login',
  portalInstrutor: '/instrutor/login',
  portalEmpresa: '/empresa/login',
} as const;
