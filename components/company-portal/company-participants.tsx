'use client';

import { Check, Copy, Download, Loader2, QrCode, UsersRound } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import { EmptyState, formatDate, PresencaBadge, selectClass } from '@/components/company-portal/company-ui';
import type { CompanyDashboardData, CompanyTraining } from '@/lib/company-types';

function QrPanel({ training }: { training: CompanyTraining }) {
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { const publicUrl = `${window.location.origin}/participar/${training.qr_token}`; QRCode.toDataURL(publicUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0b0b', light: '#ffffff' } }).then((imageUrl) => { setUrl(publicUrl); setImage(imageUrl); }).catch(() => setImage('')); }, [training.qr_token]);
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <div className="grid gap-7 border border-black/10 bg-white p-6 md:grid-cols-[280px_1fr] md:p-8"><div className="flex min-h-[280px] items-center justify-center bg-[#f7f7f4] p-4">{image ? <Image src={image} alt={`QR Code do treinamento ${training.nr}`} width={250} height={250} unoptimized className="h-auto w-full max-w-[250px]" /> : <Loader2 className="size-7 animate-spin text-[#8a6107]" />}</div><div className="flex flex-col justify-between"><div><span className="eyebrow text-[#8a6107]">Formulário do treinamento</span><h2 className="mt-3 text-2xl font-black uppercase tracking-[0.03em]">{training.nr} · {training.title}</h2><p className="mt-2 text-sm font-bold text-[#8a6107]">{training.client_name}</p><p className="mt-5 break-all border-l-4 border-[#f2ad19] bg-[#fff8e8] p-3 font-mono text-[10px] leading-relaxed">{url}</p></div><div className="mt-6 grid gap-2 sm:grid-cols-3"><button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copiado' : 'Copiar link'}</button><a href={image} download={`qr-${training.code}.png`} className="inline-flex h-11 items-center justify-center gap-2 border border-black/15 text-[9px] font-extrabold uppercase tracking-[0.12em] hover:bg-black hover:text-white"><Download className="size-4" />Baixar QR</a><a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 bg-[#f2ad19] text-[9px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]">Abrir formulário</a></div></div></div>;
}

export function CompanyParticipants({ data, reload }: { data: CompanyDashboardData; reload: () => Promise<void> }) {
  const [trainingId, setTrainingId] = useState(data.trainings[0]?.id || '');
  useEffect(() => {
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [reload]);
  const training = data.trainings.find((item) => item.id === trainingId) || data.trainings[0];
  const participants = training ? data.participants.filter((item) => item.training_id === training.id) : [];
  if (!training) return <EmptyState icon={QrCode} title="Nenhum QR disponível" text="Crie um treinamento para gerar o formulário." />;
  return <div className="space-y-6"><label className="block max-w-xl"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em]">Treinamento</span><select value={training.id} onChange={(e) => setTrainingId(e.target.value)} className={selectClass}>{data.trainings.map((item) => <option key={item.id} value={item.id}>{item.client_name} · {item.nr} · {item.internal_label ? `${item.internal_label} · ` : ''}{formatDate(item.training_date)}</option>)}</select></label><QrPanel training={training} /><section><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow text-[#8a6107]">Lista interna do QR · atualização automática</span><h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.03em]">Participantes inscritos</h2></div><span className="text-xs font-bold text-[#777]">{participants.length} inscrito(s) · {participants.filter((item) => item.days_total > 0 && item.days_present >= item.days_total).length} com todos os dias</span></div>{participants.length > 0 ? <div className="overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-black text-[9px] font-extrabold uppercase tracking-[0.12em] text-white"><tr><th className="p-4">Participante</th><th className="p-4">Identificador</th><th className="p-4">Presença</th><th className="p-4">Função</th><th className="p-4">Contato</th><th className="p-4">Inscrição</th></tr></thead><tbody className="divide-y divide-black/8">{participants.map((participant) => <tr key={participant.id}><td className="p-4 font-bold">{participant.full_name}</td><td className="p-4 text-[#666]">{participant.document_id}</td><td className="p-4"><PresencaBadge present={participant.days_present} total={participant.days_total} /></td><td className="p-4 text-[#666]">{participant.job_title || '—'}</td><td className="p-4 text-[#666]">{participant.email || participant.phone || '—'}</td><td className="p-4 text-[#666]">{formatDate(participant.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState icon={UsersRound} title="Nenhum participante inscrito" text="Compartilhe o QR Code. As novas inscrições aparecerão automaticamente nesta lista." />}</section></div>;
}
