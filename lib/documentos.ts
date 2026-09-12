/**
 * CPF e RG do aluno. Desde 2026-09-12 os dois são obrigatórios e digitados só
 * com números: a pontuação é colocada aqui. Quem não lembra o RG digita o CPF
 * no lugar. Certificado e atestado imprimem o CPF, não o RG.
 */

/** Enquanto o aluno digita o CPF: só números, no máximo 11. */
export function limparDigitacaoCpf(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11);
}

/** Enquanto o aluno digita o RG: números, e o último pode ser X (dígito de SP). */
export function limparDigitacaoRg(valor: string) {
  return valor.toUpperCase().replace(/[^0-9X]/g, '').replace(/X(?=.)/g, '').slice(0, 14);
}

export function cpfValido(valor: string) {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCpf(valor: string) {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11) return valor.trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Mensagem para o aluno, ou null se o CPF está completo e válido. */
export function problemaCpf(valor: string): string | null {
  const d = (valor ?? '').replace(/\D/g, '');
  if (!d) return 'Informe o CPF.';
  if (d.length !== 11) return 'O CPF precisa ter 11 números. Digite completo, só os números.';
  if (!cpfValido(d)) return 'CPF inválido. Confira os números digitados.';
  return null;
}

/** RG sem regra de tamanho (decisão do Vitor): só não pode ficar vazio. */
export function problemaRg(valor: string): string | null {
  const limpo = (valor ?? '').toUpperCase().replace(/[^0-9X]/g, '');
  if (!limpo) return 'Informe o RG. Se não lembrar, digite o seu CPF no campo do RG.';
  if (/X./.test(limpo)) return 'No RG, o X só pode ser o último caractere.';
  return null;
}

/**
 * Pontua o RG: o último caractere vai depois do traço e o resto em grupos de
 * três a partir da direita (123456789 → 12.345.678-9). Se for o próprio CPF do
 * aluno (quem não lembra o RG), sai no formato de CPF.
 */
export function formatarRg(valor: string, cpf: string) {
  const limpo = (valor ?? '').toUpperCase().replace(/[^0-9X]/g, '');
  if (limpo.length === 11 && limpo === (cpf ?? '').replace(/\D/g, '')) return formatarCpf(limpo);
  if (limpo.length < 2) return limpo;
  const corpo = limpo.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${corpo}-${limpo.slice(-1)}`;
}
