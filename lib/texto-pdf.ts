/**
 * Os PDFs usam a Helvetica padrão do pdf-lib, que só conhece a codificação
 * WinAnsi (o Windows-1252). Um caractere fora dela num cadastro — o "2⁰ Ten"
 * digitado com zero sobrescrito no lugar do "º" — derrubava a geração inteira
 * com "WinAnsi cannot encode". Todo texto que vem do banco passa por aqui antes
 * de chegar ao documento.
 */

/** Os 27 caracteres que o Windows-1252 põe na faixa 0x80–0x9F. */
const EXTRAS_WIN_ANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

function cabeNaWinAnsi(caractere: string) {
  const codigo = caractere.codePointAt(0) ?? 0;
  return (
    caractere === '\n' ||
    (codigo >= 0x20 && codigo <= 0x7e) ||
    (codigo >= 0xa0 && codigo <= 0xff) ||
    EXTRAS_WIN_ANSI.has(caractere)
  );
}

/** Parecidos que têm equivalente na WinAnsi e mudariam o sentido se sumissem. */
const SUBSTITUTOS: Record<string, string> = {
  '⁰': 'º',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  'ⁿ': 'n',
  '′': "'",
  '″': '"',
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '−': '-',
  '\t': ' ',
};

export function textoParaPdf(texto: string) {
  let saida = '';
  for (const caractere of texto.normalize('NFC')) {
    if (cabeNaWinAnsi(caractere)) {
      saida += caractere;
      continue;
    }
    const substituto = SUBSTITUTOS[caractere];
    if (substituto !== undefined) {
      saida += substituto;
      continue;
    }
    if (/\s/u.test(caractere)) {
      saida += ' ';
      continue;
    }
    // Letra com acento que a WinAnsi não tem ("ș", "ő"): fica a letra base.
    // O que nem assim cabe (emoji, símbolo) sai do texto.
    const base = caractere.normalize('NFKD').replace(/\p{M}/gu, '');
    if (base && Array.from(base).every(cabeNaWinAnsi)) saida += base;
  }
  return saida;
}

/** Aplica `textoParaPdf` em todo texto de um objeto vindo do banco. */
export function textosParaPdf<T>(valor: T): T {
  if (typeof valor === 'string') return textoParaPdf(valor) as T;
  if (Array.isArray(valor)) return valor.map(textosParaPdf) as T;
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, textosParaPdf(item)])) as T;
  }
  return valor;
}
