'use client';

import { Info, MessageCircle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { botao } from '@/components/site-novo/botao';
import { SeloDeErro, TelaDeErro } from '@/components/site-novo/tela-de-erro';
import { WHATSAPP } from '@/lib/site-novo/contato';

/**
 * Erro do site (Figma "Erro 500 · Algo deu errado"). O código que aparece é
 * o `digest` do Next, o mesmo que fica no log do servidor.
 */
export default function ErroDoSite({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <TelaDeErro
    selo="Erro no servidor"
    titulo="Algo deu errado do nosso lado."
    texto="Nada do que você fez causou isso. Tente de novo em alguns instantes — se continuar, fale com a gente pelo WhatsApp."
    ilustracao={<SeloDeErro />}
    acoes={<>
      <button type="button" onClick={() => retry()} className={botao({ tamanho: 'lg' })}>Tentar de novo<RefreshCw className="size-5" aria-hidden="true" /></button>
      <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={botao({ variante: 'inverso', tamanho: 'lg' })}>Falar no WhatsApp<MessageCircle className="size-5" aria-hidden="true" /></a>
    </>}
    extra={error.digest ? <p className="flex items-center gap-2 font-ds-mono text-sm leading-5 text-ds-texto-inv-2">
      <Info className="size-3.5 shrink-0" aria-hidden="true" />Código do erro: {error.digest} · envie para o suporte se precisar
    </p> : null}
  />;
}
