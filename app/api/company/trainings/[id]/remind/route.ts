import { NextResponse } from 'next/server';

import { getTrainingReminderTargets } from '@/db/company-repository';
import { getCurrentUser } from '@/lib/app-auth';
import { isMailerConfigured, sendTrainingReminderEmail } from '@/lib/mailer';
import { SITE_URL } from '@/lib/site-url';
import { trainingReminderMessage, whatsappLink } from '@/lib/whatsapp';

function dataPorExtenso(value: string) {
  if (!value) return 'sem data';
  const iso = value.length === 10 ? `${value}T12:00:00Z` : value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

/**
 * Cobra o instrutor que deixou a turma aberta. O e-mail sai sozinho; o link do
 * WhatsApp volta pronto porque disparo automático por lá exige a API oficial
 * do Business (conta verificada, modelo aprovado, custo por mensagem).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.must_reset) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  const { id } = await params;
  const alvo = await getTrainingReminderTargets(id);
  if (!alvo) return NextResponse.json({ error: 'Treinamento não encontrado.' }, { status: 404 });
  if (alvo.training.status === 'completed') {
    return NextResponse.json({ error: 'Este treinamento já está concluído.' }, { status: 400 });
  }
  if (alvo.instrutores.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum instrutor escalado nos dias em aberto — atribua um instrutor antes de cobrar.' },
      { status: 400 },
    );
  }

  const dateLabel = dataPorExtenso(alvo.training.training_date);
  const base = {
    nr: alvo.training.nr,
    title: alvo.training.title,
    clientName: alvo.training.client_name,
    dateLabel,
    faltaLista: alvo.faltaLista,
  };

  const enviados: string[] = [];
  const falhas: string[] = [];
  const links: { name: string; url: string }[] = [];

  for (const instrutor of alvo.instrutores) {
    const url = whatsappLink(instrutor.phone, trainingReminderMessage({ ...base, instructorName: instrutor.name }));
    if (url) links.push({ name: instrutor.name, url });

    if (!isMailerConfigured() || !instrutor.email) {
      falhas.push(instrutor.name);
      continue;
    }
    try {
      await sendTrainingReminderEmail({
        ...base,
        to: instrutor.email,
        name: instrutor.name,
        link: `${SITE_URL}/instrutor`,
      });
      enviados.push(instrutor.name);
    } catch {
      falhas.push(instrutor.name);
    }
  }

  return NextResponse.json({ ok: true, enviados, falhas, links, faltaLista: alvo.faltaLista });
}
