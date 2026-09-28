'use client';

import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Avatar, Botao, botaoClasses } from '@/components/ds/base';
import { urlDaFoto, type TipoDeFoto } from '@/lib/fotos';
import { cn } from '@/lib/utils';

/**
 * Avatar grande com "Trocar foto" e "Remover". Serve aos três portais: a foto
 * do funcionário, a do instrutor e o logo do cliente. Depois de enviar, chama
 * `aoMudar` para a tela recarregar os dados (e o avatar do menu junto).
 */
export function FotoDePerfil({ tipo, id, nome, chave, aoMudar, notify, tamanho = 72, className }: {
  tipo: TipoDeFoto;
  id: string;
  nome: string;
  chave: string | null | undefined;
  aoMudar: () => Promise<void> | void;
  notify: (mensagem: string) => void;
  tamanho?: number;
  className?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState<'' | 'enviando' | 'removendo'>('');
  const logo = tipo === 'cliente';

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setOcupado('enviando');
    try {
      const form = new FormData();
      form.set('tipo', tipo);
      form.set('id', id);
      form.set('file', arquivo);
      const resposta = await fetch('/api/fotos', { method: 'POST', body: form });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: string };
      if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível enviar a imagem.');
      notify(logo ? 'Logo atualizado.' : 'Foto atualizada.');
      await aoMudar();
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.'); }
    finally { setOcupado(''); if (entrada.current) entrada.current.value = ''; }
  }

  async function remover() {
    setOcupado('removendo');
    try {
      const resposta = await fetch('/api/fotos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, id }) });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: string };
      if (!resposta.ok) throw new Error(corpo.error || 'Não foi possível remover.');
      notify(logo ? 'Logo removido.' : 'Foto removida.');
      await aoMudar();
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível remover.'); }
    finally { setOcupado(''); }
  }

  return <div className={cn('flex items-center gap-4', className)}>
    <Avatar nome={nome} foto={urlDaFoto(tipo, id, chave)} tamanho={tamanho} quadrado={logo} />
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <label className={botaoClasses('secundario', 'P', cn('cursor-pointer', ocupado && 'pointer-events-none opacity-60'))}>
          {ocupado === 'enviando' ? <Loader2 className="animate-spin" /> : <Camera />}{chave ? (logo ? 'Trocar logo' : 'Trocar foto') : (logo ? 'Enviar logo' : 'Enviar foto')}
          <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void enviar(e.target.files?.[0])} />
        </label>
        {chave ? <Botao tipo="fantasma" tamanho="P" disabled={Boolean(ocupado)} onClick={() => void remover()}>{ocupado === 'removendo' ? <Loader2 className="animate-spin" /> : <Trash2 />}Remover</Botao> : null}
      </div>
      <span className="ds-caption text-ds-texto-2">{logo ? 'JPG, PNG ou WebP. O logo aparece inteiro, sobre fundo branco.' : 'JPG, PNG ou WebP. A foto é cortada em quadrado, centrada no rosto.'}</span>
    </div>
  </div>;
}
