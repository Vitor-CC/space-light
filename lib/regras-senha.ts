/**
 * Regra de senha dos portais, decidida em 26/09/2026: pelo menos 8
 * caracteres, com um número e um caractere especial. Vale para senha nova;
 * as já cadastradas continuam entrando.
 */
export const REGRAS_DE_SENHA = [
  { id: 'tamanho', texto: 'Pelo menos 8 caracteres', ok: (senha: string) => senha.length >= 8 },
  { id: 'numero', texto: 'Um número', ok: (senha: string) => /\p{N}/u.test(senha) },
  // Letra acentuada é letra: "é" não conta como caractere especial.
  {
    id: 'especial',
    texto: 'Um caractere especial, como ! @ # $ %',
    ok: (senha: string) => /[^\p{L}\p{N}\s]/u.test(senha),
  },
] as const;

export function senhaValida(senha: string) {
  return REGRAS_DE_SENHA.every((regra) => regra.ok(senha));
}

export const AVISO_SENHA =
  'Use pelo menos 8 caracteres, com um número e um caractere especial, e repita a mesma senha nos dois campos.';

export const AJUDA_SENHA = 'Mínimo de 8 caracteres, com número e caractere especial.';
