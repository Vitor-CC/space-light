'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { botaoClasses, type BotaoTipo, type Tom } from '@/components/ds/base';
import type { ClientParticipant, ClientTraining } from '@/lib/client-portal-data';
import { downloadFilesAsZip, type ZipEntry } from '@/lib/download-zip';

export type Secao = 'dashboard' | 'trainings' | 'certificates' | 'documents' | 'request' | 'profile';

/** Normas oferecidas no pedido de nova turma (as mesmas do site). */
/** Normas de treinamento da Space (lista do usuário, 27/09/2026). NR 13, 15 e 16 são laudo: pedem-se em Documentos. */
export const NORMAS_PEDIDO = ['NR 05', 'NR 06', 'NR 07', 'NR 07 LEI LUCAS', 'NR 10', 'NR 10 SEP', 'NR 11', 'NR 12', 'NR 18', 'NR 20', 'NR 23', 'NR 26', 'NR 31', 'NR 33', 'NR 35', 'Outra'];

export function tomDoStatus(status: ClientTraining['status']): Tom {
  return status === 'Concluído' ? 'sucesso' : status === 'Em andamento' ? 'sinal' : 'info';
}

export function rotuloDoStatus(status: ClientTraining['status']) {
  return status === 'Concluído' ? 'Concluída' : status === 'Em andamento' ? 'Em andamento' : 'Agendada';
}

/** "2026-09-12" → "12/09/2026". */
export function dataCurta(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/** "2026-09-12" → "09/2026". */
export function mesAno(iso: string) {
  const [a, m] = iso.slice(0, 10).split('-');
  return a && m ? `${m}/${a}` : iso;
}

/** Dias entre hoje e a data (negativo = já passou). */
export function diasAte(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const alvo = Date.UTC(a, (m ?? 1) - 1, d ?? 1);
  const agora = new Date();
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.round((alvo - hoje) / 86_400_000);
}

export function vencimento(expiresAt: string): { tom: Tom; texto: string } {
  const dias = diasAte(expiresAt);
  if (dias < 0) return { tom: 'perigo', texto: `vencida há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}` };
  if (dias === 0) return { tom: 'perigo', texto: 'vence hoje' };
  const texto = `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return { tom: dias <= 30 ? 'perigo' : dias <= 60 ? 'atencao' : 'neutro', texto };
}

/** Situação do certificado de uma pessoa, para a tag da tabela. */
export function situacaoCertificado(p: ClientParticipant, turma: ClientTraining | undefined): { tom: Tom; texto: string } {
  const completo = p.daysTotal > 0 && p.daysPresent >= p.daysTotal;
  if (turma && turma.status !== 'Concluído') return { tom: 'info', texto: 'Turma em andamento' };
  if (!completo) return { tom: 'atencao', texto: 'Ausente — reagendar' };
  if (!p.certificateFileId) return { tom: 'neutro', texto: 'Em preparação' };
  if (turma?.expiresAt) {
    const venc = diasAte(turma.expiresAt);
    return venc < 0 ? { tom: 'perigo', texto: `Venceu em ${mesAno(turma.expiresAt)}` } : { tom: 'sucesso', texto: `Válido até ${mesAno(turma.expiresAt)}` };
  }
  return { tom: 'sucesso', texto: 'Disponível' };
}

/**
 * Segunda informação da pessoa nas tabelas: o login, para cliente Amazon; a
 * função, que só existe em quem se cadastrou antes de 26/09/2026.
 */
export function identificacaoDaPessoa(p: Pick<ClientParticipant, 'employeeLogin' | 'jobTitle'>) {
  return p.employeeLogin ? `Login ${p.employeeLogin}` : p.jobTitle || '—';
}

export function slug(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'arquivos';
}

/** Botão que baixa vários arquivos num .zip montado no navegador. */
export function BotaoZip({ entries, zipName, rotulo, tipo = 'secundario', className }: { entries: ZipEntry[]; zipName: string; rotulo?: string; tipo?: BotaoTipo; className?: string }) {
  const [status, setStatus] = useState('');
  async function run() {
    setStatus('Preparando…');
    try {
      const result = await downloadFilesAsZip({
        entries,
        zipName,
        onProgress: (done, total) => setStatus(done >= total ? 'Compactando…' : `Baixando ${done + 1} de ${total}`),
      });
      if (result.failed.length) window.alert(`${result.zipped} arquivo(s) baixados. Não deu para incluir: ${result.failed.join(', ')}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível montar o arquivo zip.');
    } finally {
      setStatus('');
    }
  }
  return <button type="button" onClick={() => void run()} disabled={Boolean(status) || entries.length === 0} className={botaoClasses(tipo, 'M', className)}>
    {status || rotulo || 'Baixar tudo (.zip)'}
    {status ? <Loader2 className="animate-spin" /> : <Download />}
  </button>;
}
