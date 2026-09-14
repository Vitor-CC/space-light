import { DocSection } from '@/components/site-novo/doc-section';

/*
 * ETAPA 1 — esqueleto para o checkpoint: só a grade do documento, com o
 * número, o rótulo e o título de cada seção da home. O conteúdo entra na
 * etapa 2.
 */

const eyebrow =
  'font-heading text-xs font-bold tracking-[0.16em] text-doc-mark uppercase';
const titulo =
  'mt-4 max-w-[22ch] font-heading text-[clamp(2rem,1.2rem+3.4vw,3.75rem)] leading-[0.95] font-extrabold uppercase';

export default function HomeSiteNovo() {
  return (
    <>
      <DocSection numero="01" rotulo="Abertura" tom="preto">
        <p className={eyebrow}>Engenharia de segurança do trabalho</p>
        <h1 className="mt-5 font-heading text-[clamp(2.75rem,1.6rem+5vw,6rem)] leading-[0.92] font-black uppercase">
          Segurança que sai do papel.
        </h1>
      </DocSection>

      <DocSection id="treinamentos" numero="02" rotulo="Os treinamentos">
        <p className={eyebrow}>Treinamentos regulamentares</p>
        <h2 className={titulo}>Conhecimento técnico. Aplicação imediata.</h2>
      </DocSection>

      <DocSection id="pratica" numero="03" rotulo="A prática" tom="folha">
        <p className={eyebrow}>Treinamento em campo</p>
        <h2 className={titulo}>Onde a prática muda a percepção.</h2>
      </DocSection>

      <DocSection
        id="como-trabalhamos"
        numero="04"
        rotulo="Como trabalhamos"
        tom="grafite"
      >
        <p className={eyebrow}>Como fazemos</p>
        <h2 className={titulo}>
          Um processo que transforma conteúdo em conduta.
        </h2>
      </DocSection>

      <DocSection id="modalidades" numero="05" rotulo="Modalidades">
        <h2 className={titulo}>Modalidades</h2>
      </DocSection>

      <DocSection
        id="por-que"
        numero="06"
        rotulo="Por que a Space Light"
        tom="folha"
      >
        <h2 className={titulo}>Por que a Space Light</h2>
      </DocSection>

      <DocSection id="depoimentos" numero="07" rotulo="Depoimentos">
        <p className={eyebrow}>Quem já treinou com a gente</p>
        <h2 className={titulo}>O que dizem as equipes de segurança.</h2>
      </DocSection>

      <DocSection id="proposta" numero="08" rotulo="Proposta" tom="preto">
        <h2 className={titulo}>
          Conte o treinamento que a sua empresa precisa.
        </h2>
      </DocSection>
    </>
  );
}
