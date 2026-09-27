import { Home } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Resp } from '@/components/site-novo/blocos';
import { botao } from '@/components/site-novo/botao';
import { CascaDoSite } from '@/components/site-novo/casca';
import { PlacaDe404, TelaDeErro } from '@/components/site-novo/tela-de-erro';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';

export const metadata: Metadata = {
  title: 'Página não encontrada | Space Light Engenharia',
  robots: { index: false },
};

/** 404 do Figma ("Esta saída não está sinalizada"), com o cabeçalho e o rodapé do site. */
export default function NaoEncontrada() {
  return <CascaDoSite>
    <TelaDeErro
      selo="Erro 404"
      titulo="Esta saída não está sinalizada."
      texto={<Resp curto="A página que você procurou não existe ou mudou de endereço." longo="A página que você procurou não existe ou mudou de endereço. Siga por uma das rotas abaixo." />}
      ilustracao={<PlacaDe404 />}
      acoes={<>
        <Link href={rotas.inicio} className={botao({ tamanho: 'lg' })}>Ir para o início<Home className="size-5" aria-hidden="true" /></Link>
        <Link href={rotas.treinamentos} className={botao({ variante: 'inverso', tamanho: 'lg' })}>Ver treinamentos</Link>
      </>}
      extra={<nav aria-labelledby="erro-atalhos" className="hidden flex-col gap-2.5 border-t border-ds-borda-inv pt-4 lg:flex">
        <p id="erro-atalhos" className="ds-caps text-ds-texto-inv-2">Ir direto para uma norma</p>
        <ul className="flex flex-wrap gap-2">
          {NORMAS.map((norma) => <li key={norma.slug}>
            <Link href={rotas.norma(norma.slug)} className="doc-focus flex rounded-md bg-ds-inverso-2 px-3 py-2 font-ds-display text-sm leading-5 font-extrabold whitespace-nowrap text-ds-amarelo hover:bg-ds-borda-inv">{norma.codigo}</Link>
          </li>)}
        </ul>
      </nav>}
    />
  </CascaDoSite>;
}
