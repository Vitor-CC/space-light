import {
  Award,
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Handshake,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';

import { buttonVariants } from '@/components/ui/button';
import { MobileNav } from '@/components/site/mobile-nav';
import { SITE_URL } from '@/lib/site-url';
import { cn } from '@/lib/utils';

const trainings = [
  {
    nr: 'NR 05',
    title: 'CIPA',
    description:
      'Formação para prevenção de acidentes e atuação responsável no ambiente de trabalho.',
    image: '/images/brand-v2/services/space-light-service-nr05-brand-v2.png',
  },
  {
    nr: 'NR 06',
    title: 'Equipamentos de Proteção Individual',
    description:
      'Orientação prática para seleção, uso, guarda e conservação correta dos EPIs.',
    image: '/images/brand-v2/services/space-light-service-nr06-brand-v2.png',
  },
  {
    nr: 'NR 10',
    title: 'Segurança em Eletricidade',
    description:
      'Capacitação para prevenção de riscos em instalações e serviços com eletricidade.',
    image: '/images/brand-v2/services/space-light-service-nr10-brand-v2.png',
  },
  {
    nr: 'NR 11',
    title: 'Movimentação de Materiais',
    description:
      'Boas práticas para transporte, movimentação, armazenagem e manuseio de materiais.',
    image: '/images/brand-v2/services/space-light-service-nr11-brand-v2.png',
  },
  {
    nr: 'NR 23',
    title: 'Proteção Contra Incêndios',
    description:
      'Preparo técnico e prático para prevenção e resposta inicial a emergências.',
    image: '/images/brand-v2/services/space-light-service-nr23-brand-v2.png',
  },
  {
    nr: 'NR 33',
    title: 'Espaços Confinados',
    description:
      'Treinamento para reconhecer, avaliar e controlar riscos em espaços confinados.',
    image: '/images/brand-v2/services/space-light-service-nr33-brand-v2.png',
  },
  {
    nr: 'NR 35',
    title: 'Trabalho em Altura',
    description:
      'Procedimentos seguros para planejamento, organização e execução do trabalho em altura.',
    image: '/images/brand-v2/services/space-light-service-nr35-brand-v2.png',
  },
];

const methodSteps = [
  {
    number: '01',
    title: 'Diagnóstico',
    description: 'Entendemos a operação, o público e os riscos que fazem parte da rotina da equipe.',
  },
  {
    number: '02',
    title: 'Planejamento',
    description: 'Organizamos conteúdo, formato e dinâmica de acordo com a realidade da empresa.',
  },
  {
    number: '03',
    title: 'Teoria aplicada',
    description: 'Traduzimos os requisitos técnicos em uma linguagem direta, clara e relevante.',
  },
  {
    number: '04',
    title: 'Prática supervisionada',
    description: 'Transformamos conteúdo em experiência para aumentar retenção e confiança.',
  },
  {
    number: '05',
    title: 'Registro',
    description: 'Organizamos a documentação do treinamento para apoiar a gestão da empresa.',
  },
];

const fieldImages = [
  {
    src: '/images/brand-v2/cases/space-light-case-01-brand-v2.png',
    alt: 'Profissionais durante atividade prática de treinamento',
    label: 'Experiência em campo',
  },
  {
    src: '/images/brand-v2/cases/space-light-case-02-brand-v2.png',
    alt: 'Instrutor orientando equipe em ambiente industrial',
    label: 'Aprendizado coletivo',
  },
  {
    src: '/images/brand-v2/cases/space-light-case-03-brand-v2.png',
    alt: 'Simulação técnica com equipamentos de proteção',
    label: 'Prática supervisionada',
  },
  {
    src: '/images/brand-v2/cases/space-light-case-04-brand-v2.png',
    alt: 'Equipe reunida em treinamento de segurança',
    label: 'Cultura de segurança',
  },
];

/**
 * Ficha da empresa para o Google. Sem isto ele monta o resultado adivinhando a
 * partir do texto da página — foi assim que virou "Space Light Engenharia -
 * Home". Só entram dados conferíveis: nada de endereço ou CNPJ chutado.
 */
const dadosDaEmpresa = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Space Light Engenharia',
  url: SITE_URL,
  logo: `${SITE_URL}/images/branding/space-light-logo-oficial.png`,
  image: `${SITE_URL}/og.png`,
  description:
    'Treinamentos de Normas Regulamentadoras com teoria aplicada, prática supervisionada e conteúdo adaptado à realidade da sua empresa.',
  telephone: '+5511941318646',
  inLanguage: 'pt-BR',
  knowsAbout: trainings.map((item) => `${item.nr} — ${item.title}`),
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f2] text-[#0b0b0b]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosDaEmpresa) }}
      />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/85 text-white backdrop-blur-xl">
        <div className="page-shell flex h-[76px] items-center justify-between gap-8">
          <a
            href="#inicio"
            aria-label="Space Light Engenharia — início"
            className="shrink-0"
          >
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt="Space Light Engenharia"
              width={232}
              height={84}
              className="h-11 w-auto object-contain brightness-0 invert"
            />
          </a>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-8 lg:flex"
          >
            <a className="nav-link" href="#sobre">
              A Space Light
            </a>
            <a className="nav-link" href="#treinamentos">
              Treinamentos
            </a>
            <a className="nav-link" href="#metodo">
              Como fazemos
            </a>
            <a className="nav-link" href="#contato">
              Contato
            </a>
            <a className="nav-link" href="/entrar">
              Entrar no portal
            </a>
          </nav>

          <a
            href="#contato"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-11 max-lg:hidden rounded-none bg-[#f2ad19] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]',
            )}
          >
            Solicitar proposta
          </a>

          <MobileNav />
        </div>
      </header>

      <section
        id="inicio"
        className="relative flex min-h-[820px] items-end overflow-hidden bg-black pt-[76px] text-white"
      >
        <Image
          src="/images/brand-v2/heroes/space-light-hero-01-brand-v2.png"
          alt="Treinamento prático de prevenção e combate a incêndio"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-[66%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.96)_0%,rgba(0,0,0,.82)_35%,rgba(0,0,0,.18)_72%,rgba(0,0,0,.25)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.78)_0%,transparent_48%)]" />
        <div className="hero-grid absolute inset-0 opacity-25" />

        <div className="page-shell relative z-10 pb-16 pt-28 md:pb-20 md:pt-40">
          <div className="max-w-[850px]">
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12 bg-[#f2ad19]" />
              <span className="eyebrow text-[#f2ad19]">
                Engenharia de segurança do trabalho
              </span>
            </div>

            <h1 className="max-w-[820px] text-[clamp(3.2rem,7vw,7.2rem)] font-black uppercase leading-[0.86] tracking-normal md:tracking-[-0.01em] xl:tracking-[-0.02em]">
              Segurança que sai do papel.
            </h1>
            <p className="mt-8 max-w-[610px] text-lg leading-relaxed text-white/72 md:text-xl">
              Treinamentos de NRs com teoria aplicada, prática supervisionada e
              uma linguagem que aproxima sua equipe da segurança real.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contato"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-14 rounded-none bg-[#f2ad19] px-7 text-xs font-extrabold uppercase tracking-[0.14em] text-black hover:bg-[#ff9900]',
                )}
              >
                Levar o treinamento à minha empresa
                <ChevronRight className="size-4" />
              </a>
              <a
                href="#treinamentos"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-14 rounded-none border-white/30 bg-white/5 px-7 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black',
                )}
              >
                Conhecer treinamentos <ArrowDown className="size-4" />
              </a>
            </div>
          </div>

          <div className="mt-16 grid max-w-4xl gap-px border-y border-white/18 bg-white/18 sm:grid-cols-3">
            {['Teoria + prática', 'Conteúdo sob medida', 'Instrutores especializados'].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 bg-black/45 px-5 py-4 backdrop-blur-md"
                >
                  <Check
                    className="size-4 shrink-0 text-[#f2ad19]"
                    strokeWidth={3}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-white/80">
                    {item}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section id="treinamentos" className="relative py-24 md:py-32">
        <div className="page-shell">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <h2 className="section-title mt-4">
                Conhecimento técnico. Aplicação imediata.
              </h2>
            </div>
            <div className="lg:pb-2 lg:pl-16">
              <p className="max-w-xl text-lg leading-relaxed text-[#666]">
                Programas desenvolvidos para conectar os requisitos das Normas
                Regulamentadoras à realidade da sua operação.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-px bg-[#c9c9c4] sm:grid-cols-2 lg:grid-cols-3">
            {trainings.slice(0, 6).map((training, index) => (
              <article
                key={training.nr}
                className="group relative min-h-[440px] overflow-hidden bg-[#171716] text-white"
              >
                <Image
                  src={training.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-[1.035] group-hover:opacity-75"
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.96)_0%,rgba(0,0,0,.2)_72%)]" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/18 p-5">
                  <span className="font-heading text-3xl font-black tracking-[-0.01em] text-[#f2ad19]">
                    {training.nr}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                  <h3 className="max-w-sm text-2xl font-extrabold uppercase tracking-[0.03em] leading-tight">
                    {training.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/68">
                    {training.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.11em] text-[#f2ad19]">
                    Ver treinamento
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-px flex flex-col gap-6 bg-black px-7 py-8 text-white md:flex-row md:items-center md:justify-between md:px-10">
            <div className="flex items-center gap-4">
              <ShieldCheck className="size-8 text-[#f2ad19]" />
              <div>
                <span className="block text-sm text-white/60">
                  Também oferecemos
                </span>
                <strong className="mt-1 block text-xl uppercase tracking-[0.04em]">
                  NR 35 — Trabalho em Altura
                </strong>
              </div>
            </div>
            <a
              href="#contato"
              className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] hover:text-[#f2ad19]"
            >
              Consultar programa
            </a>
          </div>
        </div>
      </section>

      <section
        id="sobre"
        className="relative isolate overflow-hidden bg-[#050505] py-24 text-white md:py-36"
      >
        <Image
          src="/images/brand-v2/backgrounds/space-light-manifesto-bg-brand-v2.png"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-32"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.98),rgba(0,0,0,.78)_58%,rgba(0,0,0,.48))]" />
        <div className="page-shell grid gap-16 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
          <div>
            <h2 className="mt-7 max-w-[1040px] text-[clamp(3rem,7.7vw,8.8rem)] font-black uppercase leading-[0.84] tracking-normal md:tracking-[-0.01em] xl:tracking-[-0.02em]">
              Segurança não se aprende só na teoria.
            </h2>
          </div>
          <div className="border-l border-[#f2ad19] pl-6 lg:mb-3">
            <p className="text-lg leading-relaxed text-white/68">
              Ela ganha força quando o conteúdo faz sentido, a prática aproxima
              e cada profissional entende o impacto das próprias escolhas.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 md:py-32">
        <div className="page-shell grid gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative min-h-[540px] overflow-hidden bg-[#171716] md:min-h-[700px]">
            <Image
              src="/images/brand-v2/editorial/space-light-editorial-credibilidade-brand-v2.png"
              alt="Instrutora da Space Light durante treinamento técnico"
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 max-w-[330px] bg-[#f2ad19] p-7 text-black md:p-9">
              <span className="eyebrow">Space Light Engenharia</span>
              <p className="mt-4 font-heading text-2xl font-extrabold uppercase tracking-[0.03em] leading-tight">
                Compromisso técnico sem perder a conexão humana.
              </p>
            </div>
          </div>

          <div className="lg:pl-12">
            <h2 className="section-title mt-5">
              Treinar pessoas é cuidar da operação inteira.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#666]">
              Desenvolvemos treinamentos de segurança do trabalho que unem
              dedicação, comprometimento e profissionalismo. Cada encontro é
              pensado para aproximar norma, contexto e comportamento.
            </p>
            <div className="mt-10 grid gap-px bg-[#d5d5d0] sm:grid-cols-2">
              {[
                'Linguagem clara e acessível',
                'Conteúdo conectado à rotina',
                'Dinâmicas práticas',
                'Atenção a cada equipe',
              ].map((item) => (
                <div
                  key={item}
                  className="flex min-h-24 items-center gap-3 bg-[#f5f5f2] p-5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center bg-black text-[#f2ad19]">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-bold leading-snug">{item}</span>
                </div>
              ))}
            </div>
            <a
              href="#contato"
              className="mt-9 inline-flex items-center gap-3 border-b-2 border-[#f2ad19] pb-2 text-xs font-extrabold uppercase tracking-[0.1em] transition hover:gap-5"
            >
              Conversar sobre sua equipe
            </a>
          </div>
        </div>
      </section>

      <section id="metodo" className="bg-[#171716] py-24 text-white md:py-32">
        <div className="page-shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <div>
              <h2 className="section-title mt-5">
                Um processo que transforma conteúdo em conduta.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-white/58 lg:justify-self-end">
              Da primeira conversa ao registro final, cada etapa ajuda a tornar
              o treinamento mais relevante para quem participa.
            </p>
          </div>

          <ol className="mt-16 grid gap-px bg-white/15 lg:grid-cols-5">
            {methodSteps.map((step) => (
              <li
                key={step.number}
                className="group min-h-[300px] bg-[#171716] p-7 transition hover:bg-[#222220]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-heading text-5xl font-black tracking-[-0.02em] text-[#f2ad19]">
                    {step.number}
                  </span>
                  <ArrowUpRight className="size-5 text-white/22 transition group-hover:text-[#f2ad19]" />
                </div>
                <h3 className="mt-16 text-lg font-extrabold uppercase tracking-[0.05em]">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-white/55">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#e6e8e9] py-24 md:py-32">
        <div className="page-shell">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title mt-5">Onde a prática muda a percepção.</h2>
            </div>
            <p className="max-w-sm text-base leading-relaxed text-[#666]">
              Experiências planejadas para que cada profissional reconheça riscos,
              exercite decisões e leve o aprendizado para a rotina.
            </p>
          </div>

          <div className="mt-14 grid auto-rows-[310px] gap-2 md:grid-cols-2 md:auto-rows-[420px]">
            {fieldImages.map((item, index) => (
              <figure
                key={item.src}
                className={cn(
                  'group relative overflow-hidden bg-black',
                  index === 0 && 'md:row-span-2',
                )}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white md:p-8">
                  <span className="font-heading text-xl font-extrabold uppercase tracking-[0.04em]">
                    {item.label}
                  </span>
                  <span className="font-heading text-sm font-extrabold text-[#f2ad19]">0{index + 1}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 md:py-32">
        <div className="page-shell">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="section-title mx-auto mt-5">
              Técnica para proteger. Proximidade para engajar.
            </h2>
          </div>

          <div className="mt-16 grid gap-px bg-[#d5d5d0] md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: GraduationCap,
                title: 'Didática',
                text: 'Conteúdo técnico traduzido para uma experiência clara e participativa.',
              },
              {
                icon: ClipboardCheck,
                title: 'Personalização',
                text: 'Estrutura adaptada ao contexto, ao público e à operação da empresa.',
              },
              {
                icon: Award,
                title: 'Profissionalismo',
                text: 'Condução cuidadosa, organização e compromisso em todas as etapas.',
              },
              {
                icon: Handshake,
                title: 'Proximidade',
                text: 'Escuta ativa para construir treinamentos que realmente façam sentido.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="min-h-[320px] bg-[#f5f5f2] p-8">
                <span className="flex size-14 items-center justify-center bg-black text-[#f2ad19]">
                  <Icon className="size-7" strokeWidth={1.7} />
                </span>
                <h3 className="mt-14 text-xl font-extrabold uppercase tracking-[0.04em]">
                  {title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[#666]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contato"
        className="relative isolate overflow-hidden bg-black py-24 text-white md:py-36"
      >
        <Image
          src="/images/brand-v2/backgrounds/space-light-contact-bg-brand-v2.png"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.98),rgba(0,0,0,.86)_56%,rgba(0,0,0,.35))]" />
        <div className="hero-grid absolute inset-0 -z-10 opacity-20" />
        <div className="page-shell grid gap-14 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <h2 className="mt-6 max-w-[900px] text-[clamp(3.2rem,7vw,8rem)] font-black uppercase leading-[0.84] tracking-normal md:tracking-[-0.01em] xl:tracking-[-0.02em]">
              Sua equipe pronta para trabalhar com mais segurança.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/62">
              Conte sobre o treinamento que sua empresa precisa. A Space Light
              ajuda a definir o melhor caminho.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="https://wa.me/5511941318646?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20uma%20proposta%20de%20treinamento."
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-24 items-center justify-between gap-4 bg-[#f2ad19] p-6 text-black transition hover:bg-[#ff9900]"
            >
              <span className="flex items-center gap-4">
                <MessageCircle className="size-7" />
                <span>
                  <span className="eyebrow block">Atendimento direto</span>
                  <strong className="mt-1 block font-heading text-xl uppercase tracking-[0.04em]">
                    Falar no WhatsApp
                  </strong>
                </span>
              </span>
              <ArrowUpRight className="size-6 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
            <a
              href="tel:+5511941318646"
              className="flex min-h-20 items-center gap-4 border border-white/22 bg-white/6 p-6 transition hover:bg-white hover:text-black"
            >
              <Phone className="size-5 text-[#f2ad19]" />
              <span className="text-sm font-bold">+55 11 94131-8646</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] py-12 text-white">
        <div className="page-shell">
          <div className="grid gap-10 border-b border-white/12 pb-10 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <Image
                src="/images/branding/space-light-logo-oficial.png"
                alt="Space Light Engenharia"
                width={232}
                height={84}
                className="h-14 w-auto brightness-0 invert"
              />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/50">
                Treinamentos em segurança do trabalho com conteúdo técnico,
                prática e conexão humana.
              </p>
            </div>
            <nav aria-label="Navegação do rodapé" className="grid gap-3 text-xs font-bold uppercase tracking-[0.1em] text-white/62">
              <a href="#sobre" className="hover:text-[#f2ad19]">A Space Light</a>
              <a href="#treinamentos" className="hover:text-[#f2ad19]">Treinamentos</a>
              <a href="#metodo" className="hover:text-[#f2ad19]">Como fazemos</a>
              <a href="#contato" className="hover:text-[#f2ad19]">Contato</a>
              <a href="/cliente/login" className="hover:text-[#f2ad19]">Área do Cliente</a>
              <a href="/instrutor/login" className="hover:text-[#f2ad19]">Área do Instrutor</a>
              <a href="/empresa/login" className="hover:text-[#f2ad19]">Área da Empresa</a>
            </nav>
            <div className="flex gap-2">
              <a
                href="https://instagram.com/spacelight_eng/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Space Light"
                className="flex size-11 items-center justify-center border border-white/16 text-white/70 transition hover:border-[#f2ad19] hover:bg-[#f2ad19] hover:text-black"
              >
                <span className="text-[10px] font-black tracking-[0.08em]">IG</span>
              </a>
              <a
                href="https://facebook.com/spacelightengenharia/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook da Space Light"
                className="flex size-11 items-center justify-center border border-white/16 text-white/70 transition hover:border-[#f2ad19] hover:bg-[#f2ad19] hover:text-black"
              >
                <span className="text-[10px] font-black tracking-[0.08em]">FB</span>
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} Space Light Engenharia</span>
            <span>Segurança que transforma comportamento</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
