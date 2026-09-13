/**
 * Nome de usuário da empresa: é o único login do portal do cliente desde
 * 2026-09-12. Só a equipe Space cria. Letras minúsculas e números, para ser
 * fácil de ditar por telefone e não depender de acento ou maiúscula.
 */
export const USUARIO_REGRA = 'Use de 3 a 40 letras minúsculas ou números, sem espaço nem acento (ex.: empresaexemplo1).';

export function normalizarUsuario(valor: string) {
  return (valor ?? '').trim().toLowerCase();
}

export function usuarioValido(valor: string) {
  return /^[a-z0-9]{3,40}$/.test(normalizarUsuario(valor));
}

/** Enquanto a equipe digita: descarta o que não cabe num nome de usuário. */
export function limparDigitacaoUsuario(valor: string) {
  return valor.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
}
