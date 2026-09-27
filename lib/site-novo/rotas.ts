/**
 * Endereços do site. Ele viveu em `/v2` enquanto convivia com o site antigo;
 * desde a troca (set/2026) está na raiz, com `SITE_BASE = ''`.
 */
export const SITE_BASE: string = '';

const inicio = SITE_BASE || '/';

export const rotas = {
  inicio,
  treinamentos: `${inicio}#treinamentos`,
  comoTrabalhamos: `${inicio}#como-trabalhamos`,
  contato: `${SITE_BASE}/contato`,
  laudos: `${SITE_BASE}/laudos`,
  /** Formulário de proposta com a norma já marcada. */
  proposta: (slug: string) => `${SITE_BASE}/contato?treinamento=${slug}`,
  norma: (slug: string) => `${SITE_BASE}/treinamentos/${slug}`,
  // Portais: só link, fora do escopo do site novo.
  portal: '/entrar',
  portalCliente: '/cliente/login',
  portalInstrutor: '/instrutor/login',
  portalEmpresa: '/empresa/login',
} as const;
