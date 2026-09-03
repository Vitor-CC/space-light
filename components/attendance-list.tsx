'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { AttendanceListData } from '@/lib/company-types';

function formatDate(iso: string) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

function formatDates(dates: string[]) {
  const list = dates.map(formatDate).filter(Boolean);
  if (list.length <= 1) return list[0] ?? '';
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

export function AttendanceList({ data }: { data: AttendanceListData }) {
  const { training, participants } = data;
  const dates = training.dates.length ? training.dates : [''];
  const blankRows = 4;
  const rows: (AttendanceListData['participants'][number] | null)[] = [
    ...participants,
    ...Array.from({ length: blankRows }, () => null),
  ];

  return (
    <div className="al-root">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print { .no-print { display: none !important; } .al-root { background: #fff !important; padding: 0 !important; } }
        .al-sheet { color: #000; font-family: Arial, Helvetica, sans-serif; }
        .al-table { width: 100%; border-collapse: collapse; }
        .al-table td, .al-table th { border: 1px solid #000; padding: 3px 6px; font-size: 11px; vertical-align: middle; }
        .al-head th { background: #f0f0f0; text-align: center; font-size: 10px; text-transform: uppercase; }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/empresa" className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a6107] hover:text-black"><ArrowLeft className="size-4" />Voltar</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"><Printer className="size-4" />Imprimir / Salvar PDF</button>
      </div>

      <div className="al-sheet mx-auto max-w-[1040px] bg-white p-4 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Cabeçalho */}
        <table className="al-table">
          <tbody>
            <tr>
              <td rowSpan={6} style={{ width: 190, textAlign: 'center' }}>
                <Image src="/images/branding/space-light-logo-oficial.png" alt="Space Light Engenharia" width={232} height={84} className="mx-auto h-14 w-auto" />
              </td>
              <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 15 }}>LISTA DE PRESENÇA</td>
            </tr>
            <tr><td><strong>Empresa:</strong> {training.client_name}</td></tr>
            <tr><td><strong>Local:</strong> {training.location}</td></tr>
            <tr><td><strong>Carga horária:</strong> {training.duration}</td></tr>
            <tr><td><strong>Instrutor Responsável:</strong> {training.instructor}</td></tr>
            <tr><td><strong>Datas do treinamento:</strong> {formatDates(dates)}</td></tr>
          </tbody>
        </table>

        {/* Faixa do NR + conteúdo programático */}
        <div style={{ border: '1px solid #000', borderTop: 'none', background: '#fdf5a6', textAlign: 'center', fontWeight: 'bold', fontSize: 11, padding: '4px 6px' }}>
          {training.nr}{training.title ? ` - ${training.title}` : ''} — CONTEÚDO PROGRAMÁTICO.
        </div>
        {training.content_program ? (
          <div style={{ border: '1px solid #000', borderTop: 'none', fontSize: 10, lineHeight: 1.35, padding: '5px 6px' }}>
            {training.content_program}
          </div>
        ) : null}

        {/* Tabela de participantes */}
        <table className="al-table" style={{ marginTop: 10 }}>
          <thead className="al-head">
            <tr>
              <th style={{ width: 28 }}>Nº</th>
              <th style={{ textAlign: 'left' }}>Nome</th>
              <th style={{ width: 90 }}>RG</th>
              <th style={{ width: 110 }}>CPF</th>
              <th style={{ width: 80 }}>Data de nasc.</th>
              {dates.map((date, index) => (
                <th key={index} style={{ width: 130 }}>Assinatura{date ? ` ${formatDate(date)}` : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((participant, index) => (
              <tr key={index} style={{ height: 24 }}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                <td style={{ textTransform: 'uppercase' }}>{participant?.full_name ?? ''}</td>
                <td>{participant?.rg ?? ''}</td>
                <td>{participant?.document_id ?? ''}</td>
                <td style={{ textAlign: 'center' }}>{participant ? formatDate(participant.birth_date) : ''}</td>
                {dates.map((_, dateIndex) => <td key={dateIndex} />)}
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 8, fontSize: 9, color: '#555' }} className="no-print">
          Dica: em &quot;Imprimir&quot;, escolha &quot;Salvar como PDF&quot; e orientação Paisagem.
        </p>
      </div>
    </div>
  );
}
