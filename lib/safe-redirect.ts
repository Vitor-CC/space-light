import { NextResponse } from 'next/server';

/**
 * Endereço público do pedido.
 *
 * Atrás de proxy reverso, `request.url` traz o endereço INTERNO
 * (`localhost:3000`), porque é nele que o proxy conecta — e redirecionar para
 * lá joga o usuário num endereço que só existe dentro do servidor. O endereço
 * que a pessoa realmente digitou chega nos cabeçalhos que o proxy acrescenta.
 *
 * Confiar nesses cabeçalhos só é seguro porque o app escuta em 127.0.0.1 e a
 * porta 3000 está fechada no firewall: quem chega aqui passou pelo proxy
 * obrigatoriamente, então não há como forjá-los de fora. Se um dia o app for
 * exposto direto na internet, esta função tem de mudar junto.
 */
export function baseDoPedido(request: Request) {
  const url = new URL(request.url);
  const encaminhado = request.headers.get('x-forwarded-host');
  if (!encaminhado) return url;
  // Cadeia de proxies vem separada por vírgula; o primeiro é o que o usuário viu.
  const host = encaminhado.split(',')[0].trim();
  const protocolo = (request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  if (!host) return url;
  // URL nova em vez de trocar `host` na existente: atribuir `.host` sem porta
  // NÃO apaga a porta que já estava lá, e o endereço sairia como
  // "https://dominio.com.br:3000" — com a porta interna exposta no navegador.
  const publico = new URL(`${protocolo}://${host}`);
  publico.pathname = url.pathname;
  publico.search = url.search;
  return publico;
}

/**
 * Redireciona apenas dentro do próprio site.
 *
 * `new URL(caminho, base)` respeita um endereço absoluto: se algum dia um
 * caminho vindo do formulário chegar aqui como "https://outro-site.com", o
 * usuário sairia do site achando que continua nele — é assim que se rouba
 * senha. Hoje todos os caminhos são fixos ou passam por lista branca, então
 * isto é rede de proteção para quem mexer nestas rotas depois.
 */
export function redirectInterno(request: Request, caminho: string, status = 303) {
  const base = baseDoPedido(request);
  const destino = new URL(caminho, base);
  if (destino.origin !== base.origin) {
    return NextResponse.redirect(new URL('/entrar', base), status);
  }
  return NextResponse.redirect(destino, status);
}
