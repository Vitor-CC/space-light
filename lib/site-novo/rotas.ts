/**
 * Endereços do site novo. Enquanto ele convive com o site atual, tudo vive sob
 * `/v2`; na troca de rota basta `SITE_BASE = ''`.
 */
export const SITE_BASE = '/v2';

const inicio = SITE_BASE || '/';

export const rotas = {
  inicio,
  treinamentos: `${inicio}#treinamentos`,
  comoTrabalhamos: `${inicio}#como-trabalhamos`,
  contato: `${SITE_BASE}/contato`,
  norma: (slug: string) => `${SITE_BASE}/treinamentos/${slug}`,
  // Portais: só link, fora do escopo do site novo.
  portal: '/entrar',
  portalCliente: '/cliente/login',
  portalInstrutor: '/instrutor/login',
  portalEmpresa: '/empresa/login',
} as const;
