/**
 * A Amazon identifica cada pessoa pelo login interno, e só ela pede esse
 * campo no formulário do QR (decisão de 26/09/2026). Olha nome e razão
 * social, porque as unidades da Amazon são cadastradas com nomes diferentes.
 */
export function clientePedeLogin(nomes: Array<string | null | undefined>) {
  return nomes.some((nome) => /amazon/i.test(nome ?? ''));
}
