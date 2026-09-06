import { NextResponse } from 'next/server';

/**
 * Redireciona apenas dentro do próprio site.
 *
 * `new URL(caminho, request.url)` respeita um endereço absoluto: se algum dia
 * um caminho vindo do formulário chegar aqui como "https://outro-site.com", o
 * usuário sairia do site achando que continua nele — é assim que se rouba
 * senha. Hoje todos os caminhos são fixos ou passam por lista branca, então
 * isto é rede de proteção para quem mexer nestas rotas depois.
 */
export function redirectInterno(request: Request, caminho: string, status = 303) {
  const base = new URL(request.url);
  const destino = new URL(caminho, base);
  if (destino.origin !== base.origin) {
    return NextResponse.redirect(new URL('/entrar', base), status);
  }
  return NextResponse.redirect(destino, status);
}
