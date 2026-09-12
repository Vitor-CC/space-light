'use client';

import { Printer } from 'lucide-react';

import type { CertificateData } from '@/db/company-repository';
import {
  ISSUING_CITY,
  TECHNICAL_LEAD,
  certificateSetup,
  formatCertificateDates,
} from '@/lib/certificate-config';

function SignatureBlock({ signature, lines }: { signature?: string | null; lines: string[] }) {
  return (
    <div className="cert-sign">
      <span className="cert-sign-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {signature ? <img src={signature} alt="" /> : null}
      </span>
      <span className="cert-sign-line" />
      {lines.filter(Boolean).map((line) => (
        <span key={line} className="cert-sign-text">{line}</span>
      ))}
    </div>
  );
}

/** Uma página A4 paisagem por participante, fiel ao modelo impresso da Space. */
export function Certificate({
  data,
  technicalLeadSignature,
}: {
  data: CertificateData;
  technicalLeadSignature: string | null;
}) {
  const setup = certificateSetup(data.training.nr);

  if (!setup) {
    return (
      <div className="mx-auto max-w-2xl border-l-4 border-[#b62525] bg-white p-6">
        <strong className="text-sm uppercase tracking-[0.08em]">Certificado indisponível para {data.training.nr}</strong>
        <p className="mt-2 text-sm leading-relaxed text-[#666]">
          A base legal e a arte desta norma ainda não foram cadastradas. Sem o texto legal correto
          o certificado não pode ser emitido — fale com quem cuida do sistema.
        </p>
      </div>
    );
  }

  const dataLinha = formatCertificateDates(data.training.dates);
  const assinaturaInstrutor = data.instructor.signatureDocumentId
    ? `/api/instructor-documents/${data.instructor.signatureDocumentId}`
    : null;

  return (
    <div className="cert-root">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        .cert-page {
          position: relative; width: 1123px; height: 794px; overflow: hidden;
          background: #fff; margin: 0 auto 18px; box-shadow: 0 1px 6px rgba(0,0,0,.14);
          color: #000; font-family: Arial, Helvetica, sans-serif;
        }
        .cert-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        /* A faixa foi desenhada num quadrado: ancorada à direita e com a altura
           da página, a parte transparente sobra à esquerda e o amarelo encosta na borda. */
        .cert-edge { position: absolute; top: 0; right: 0; height: 100%; width: auto; }
        .cert-body { position: relative; height: 100%; display: flex; flex-direction: column; padding: 30px 0 26px 58px; }
        .cert-head { display: flex; align-items: flex-start; justify-content: space-between; padding-right: 150px; }
        .cert-seal { height: 92px; width: auto; }
        .cert-logo { height: 76px; width: auto; }
        .cert-title { text-align: center; font-size: 34pt; font-weight: 900; letter-spacing: -.01em; margin-top: 2px; padding-right: 150px; }
        .cert-text { margin-top: 22px; padding-right: 175px; font-size: 11.5pt; line-height: 2.1; }
        .cert-name {
          display: inline-block; min-width: 400px; text-align: center; font-weight: 700;
          border-bottom: 1px solid #000; margin: 0 5px; padding-bottom: 1px;
        }
        .cert-client { margin-top: 24px; padding-right: 175px; text-align: center; font-size: 11.5pt; font-weight: 700; }
        .cert-date { margin-top: 16px; padding-right: 215px; text-align: right; font-size: 11.5pt; font-weight: 700; }
        .cert-signs { margin-top: auto; display: flex; align-items: flex-end; gap: 22px; padding-right: 190px; }
        .cert-sign { flex: 1; display: flex; flex-direction: column; align-items: center; }
        .cert-sign-img { display: flex; align-items: flex-end; justify-content: center; width: 100%; max-width: 215px; height: 44px; }
        .cert-sign-img img { max-height: 100%; max-width: 100%; object-fit: contain; }
        .cert-sign-line { display: block; width: 100%; max-width: 215px; border-top: 1px solid #000; }
        .cert-sign-text { text-align: center; font-size: 9.5pt; line-height: 1.25; margin-top: 2px; }
        @media print {
          .no-print { display: none !important; }
          .cert-root { background: #fff !important; padding: 0 !important; }
          .cert-page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
          .cert-page:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[1123px] flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#666]">
          {data.participants.length} certificado(s) · {data.training.nr} · {data.training.title}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 bg-[#f2ad19] px-5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"
        >
          <Printer className="size-4" />Imprimir / Salvar PDF
        </button>
      </div>

      {data.participants.map((participante) => (
        /* eslint-disable @next/next/no-img-element */
        <article key={participante.documentId || participante.fullName} className="cert-page">
          <img src={setup.background} alt="" className="cert-bg" />
          <img src="/images/certificado/faixa-lateral.png" alt="" className="cert-edge" />

          <div className="cert-body">
            <header className="cert-head">
              {setup.seal ? <img src={setup.seal} alt={setup.sealAlt ?? ''} className="cert-seal" /> : <span />}
              <img src="/images/certificado/logo-space.png" alt="Space Light Engenharia" className="cert-logo" />
            </header>

            <h1 className="cert-title">CERTIFICADO</h1>

            <div className="cert-text">
              <p>
                Certificamos que
                <span className="cert-name">
                  {participante.fullName}{participante.documentId ? ` CPF - ${participante.documentId}` : ''}
                </span>
                concluiu
              </p>
              <p>
                com aproveitamento o <strong>&ldquo;{data.training.title.toUpperCase()}&rdquo;</strong>, {setup.legalBasis}
              </p>
              <p>ministrado pela <strong>SPACE LIGHT ENGENHARIA.</strong></p>
            </div>

            <p className="cert-client">{data.client.legalName.toUpperCase()}</p>
            <p className="cert-date">{ISSUING_CITY}, {dataLinha}.</p>

            <footer className="cert-signs">
              <SignatureBlock
                signature={technicalLeadSignature}
                lines={[TECHNICAL_LEAD.role, TECHNICAL_LEAD.name, `${TECHNICAL_LEAD.registryLabel}: ${TECHNICAL_LEAD.registry}`]}
              />
              <SignatureBlock
                lines={[participante.fullName, participante.documentId ? `CPF - ${participante.documentId}` : '']}
              />
              <SignatureBlock
                signature={assinaturaInstrutor}
                lines={['Técnico de Segurança', data.instructor.name, data.instructor.registry ? `MTE: ${data.instructor.registry}` : '']}
              />
            </footer>
          </div>
        </article>
      ))}
    </div>
  );
}
