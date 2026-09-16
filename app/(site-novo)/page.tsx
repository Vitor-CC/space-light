import { ArrowDown, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { botao, linhaDeBotoes } from '@/components/site-novo/botao';
import { Confirmar } from '@/components/site-novo/confirmar';
import { DadosEstruturados } from '@/components/site-novo/dados-estruturados';
import { DocSection } from '@/components/site-novo/doc-section';
import { Figura } from '@/components/site-novo/figura';
import { ListaDeItens } from '@/components/site-novo/lista-de-itens';
import { Marcadores } from '@/components/site-novo/marcadores';
import { TabelaDoc } from '@/components/site-novo/tabela-doc';
import { grade, texto } from '@/components/site-novo/texto';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { imagemMarca } from '@/lib/site-novo/imagens';
import { ETAPAS } from '@/lib/site-novo/metodo';
import { NORMAS } from '@/lib/site-novo/normas';
import { rotas } from '@/lib/site-novo/rotas';
import {
  NOME_DA_EMPRESA,
  dadosDaOrganizacao,
  imagemOg,
  metadadosDaPagina,
} from '@/lib/site-novo/seo';
import { cn } from '@/lib/utils';

/*
 * Home do site novo. Textos do briefing, usados literalmente — só cortados em
 * parágrafos menores para caber em até 3 linhas no celular.
 */

const PONTOS_DA_PRATICA = [
  {
    titulo: 'Prática supervisionada',
    texto:
      'O participante executa o procedimento com o instrutor acompanhando cada etapa.',
  },
  {
    titulo: 'Aprendizado coletivo',
    texto:
      'A turma observa, comenta e corrige junto, que é como o conhecimento fixa.',
  },
  {
    titulo: 'Reconhecimento de risco',
    texto:
      'Exercício de identificar o risco no próprio ambiente, não em foto de slide.',
  },
  {
    titulo: 'Cultura de segurança',
    texto:
      'A conversa continua depois do treinamento, dentro da rotina da equipe.',
  },
];

const FIGURAS_DA_PRATICA = [
  {
    src: imagemMarca('cases/space-light-case-01'),
    norma: 'NR 23',
    legenda: 'Combate a princípio de incêndio com extintor',
    alt: 'Participante aplica o jato de um extintor em fogo controlado enquanto a turma, de colete refletivo, observa ao lado do instrutor.',
  },
  {
    src: imagemMarca('cases/space-light-case-02'),
    norma: 'NR 35',
    legenda: 'Exercício em estrutura elevada, com ancoragem',
    alt: 'Dois participantes suspensos por cordas numa estrutura metálica, acompanhados por um instrutor na plataforma.',
  },
  {
    src: imagemMarca('cases/space-light-case-03'),
    norma: 'NR 10',
    legenda: 'Demonstração em painel elétrico',
    alt: 'Participante usa um instrumento de medição num painel elétrico aberto enquanto colegas de capacete e luvas observam em fila.',
  },
  {
    src: imagemMarca('cases/space-light-case-04'),
    norma: 'NR 33',
    legenda: 'Resgate com tripé de ancoragem',
    alt: 'Tripé de ancoragem sobre uma abertura no piso, isolada por correntes, com um participante suspenso e a equipe acompanhando.',
  },
];

const MODALIDADES = [
  {
    modalidade: 'In company',
    como: 'A Space leva o treinamento até a sua planta, no seu equipamento e no seu cenário.',
    quando:
      'Quando o risco a treinar é o da própria operação, e quando deslocar a equipe é caro.',
  },
  {
    modalidade: 'Centro de treinamento',
    como: 'A turma vai até uma estrutura preparada para a prática.',
    quando: 'Quando o exercício exige estrutura que a planta não tem.',
  },
];

const DIFERENCIAIS = [
  {
    titulo: 'Didática',
    texto: 'Conteúdo técnico traduzido em experiência clara e participativa.',
  },
  {
    titulo: 'Personalização',
    texto:
      'Estrutura adaptada ao contexto, ao público e à operação da empresa.',
  },
  {
    titulo: 'Profissionalismo',
    texto: 'Condução cuidadosa, organização e compromisso em todas as etapas.',
  },
  {
    titulo: 'Proximidade',
    texto:
      'Escuta ativa para construir treinamentos que façam sentido para aquela equipe.',
  },
];

const ALT_DA_ABERTURA =
  'Participante usa um extintor portátil num fogo controlado, observada por um instrutor e por colegas de colete refletivo.';

export const metadata: Metadata = metadadosDaPagina({
  titulo: `${NOME_DA_EMPRESA} | Treinamentos em Normas Regulamentadoras`,
  descricao:
    'Treinamentos de Normas Regulamentadoras com teoria aplicada e prática supervisionada, in company ou em centro de treinamento.',
  caminho: rotas.inicio,
  imagem: imagemOg('home'),
  alt: ALT_DA_ABERTURA,
});

export default function HomeSiteNovo() {
  return (
    <>
      <DadosEstruturados dados={dadosDaOrganizacao()} />
      <DocSection numero="01" rotulo="Abertura" tom="preto">
        <p className={texto.eyebrow}>Engenharia de segurança do trabalho</p>
        <h1 className={cn(texto.tituloPagina, 'mt-5')}>
          Segurança que sai do papel.
        </h1>
        <div className={cn(grade.duas, 'mt-6 lg:mt-10')}>
          <div>
            <p className={texto.apoio}>
              Treinamentos de Normas Regulamentadoras com teoria aplicada e
              prática supervisionada.
            </p>
            <div className={cn(linhaDeBotoes, 'mt-8')}>
              <Link href={rotas.contato} className={botao({ tamanho: 'lg' })}>
                Solicitar proposta
              </Link>
              <Link
                href={rotas.treinamentos}
                className={botao({ variante: 'contorno', tamanho: 'lg' })}
              >
                Ver treinamentos
                <ArrowDown className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <Marcadores
              className="mt-10"
              itens={[
                'Teoria + prática',
                'Conteúdo sob medida',
                'Instrutores especializados',
              ]}
            />
          </div>
          <Figura
            src={imagemMarca('heroes/space-light-hero-01')}
            alt={ALT_DA_ABERTURA}
            legenda="Exercício com extintor portátil em fogo controlado, sob supervisão."
            sizes="(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 100vw"
            posicao="68% 50%"
            prioridade
          />
        </div>
      </DocSection>

      <DocSection id="treinamentos" numero="02" rotulo="Os treinamentos">
        <p className={texto.eyebrow}>Treinamentos regulamentares</p>
        <h2 className={cn(texto.tituloSecao, 'mt-4')}>
          Conhecimento técnico. Aplicação imediata.
        </h2>
        <div className="mt-6 space-y-4">
          <p className={texto.apoio}>
            Programas que conectam o requisito da norma à realidade da operação.
          </p>
          <p className={texto.apoio}>
            Para que o participante saia sabendo o que fazer, e não apenas o que
            a norma diz.
          </p>
        </div>

        {/* No celular cada norma é um bloco; a partir de 1024, uma linha de
            índice: código, nome, descrição e link. */}
        <ul data-surgir className="mt-10 border-t border-doc-ink">
          {NORMAS.map((norma) => (
            <li key={norma.slug} className="border-b border-doc-rule-strong">
              <Link
                href={rotas.norma(norma.slug)}
                className="doc-focus group grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 py-5 lg:grid-cols-[6rem_minmax(0,13rem)_minmax(0,1fr)_auto] lg:items-baseline lg:gap-x-6 lg:py-6"
              >
                <span className="font-doc-mono text-2xl leading-none font-semibold text-doc-mark lg:text-3xl">
                  {norma.codigo}
                </span>
                <span className="min-w-0 lg:contents">
                  <span
                    className={cn(
                      texto.tituloItem,
                      'block decoration-sl-gold decoration-2 underline-offset-4 group-hover:underline',
                    )}
                  >
                    {norma.nome}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-doc-ink-muted lg:mt-0 lg:text-base">
                    {norma.linha}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-sl-gold decoration-2 underline-offset-4 group-hover:decoration-doc-ink lg:mt-0 lg:justify-self-end">
                    <span className="lg:max-xl:sr-only">Ver treinamento</span>
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-measure text-sm leading-relaxed text-doc-ink-muted">
          A Space Light atende outras Normas Regulamentadoras além destas. Se a
          sua demanda não estiver na lista,{' '}
          <Link href={rotas.contato} className={texto.link}>
            fale com a gente
          </Link>
          .
        </p>
      </DocSection>

      <DocSection id="pratica" numero="03" rotulo="A prática" tom="folha">
        <p className={texto.eyebrow}>Treinamento em campo</p>
        <h2 className={cn(texto.tituloSecao, 'mt-4')}>
          Onde a prática muda a percepção.
        </h2>

        {/* Ordem do DOM = ordem do celular (argumento, pontos, figuras). No
            desktop os pontos sobem para a coluna da direita. */}
        <div className={cn(grade.duas, 'mt-6 lg:mt-10')}>
          <div className="space-y-4">
            <p className={texto.corpo}>
              Conteúdo técnico explicado em sala responde à norma.
            </p>
            <p className={texto.corpo}>
              O que muda comportamento é o momento em que a pessoa executa, erra
              com supervisão e entende o porquê.
            </p>
            <p className={cn(texto.corpo, 'font-semibold')}>
              Por isso a prática supervisionada não é complemento do nosso
              treinamento — é a parte que faz o resto valer.
            </p>
          </div>

          <ListaDeItens
            numerada
            compacta
            className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
            itens={PONTOS_DA_PRATICA}
          />

          <div
            data-surgir
            className="grid grid-cols-2 gap-x-3 gap-y-6 lg:col-start-1 lg:gap-x-4"
          >
            {FIGURAS_DA_PRATICA.map((figura) => (
              <Figura
                key={figura.src}
                marcador={figura.norma}
                src={figura.src}
                alt={figura.alt}
                legenda={figura.legenda}
                sizes="(min-width: 1440px) 270px, (min-width: 1024px) 20vw, 50vw"
              />
            ))}
          </div>
        </div>

        <Confirmar bloco className="mt-10">
          o que pode ser afirmado sobre o campo prático próprio da empresa —
          está em construção. Enquanto não confirmar, esta seção fala apenas de
          prática supervisionada em campo, sem prometer estrutura.
        </Confirmar>
      </DocSection>

      <DocSection
        id="como-trabalhamos"
        numero="04"
        rotulo="Como trabalhamos"
        tom="grafite"
      >
        <p className={texto.eyebrow}>Como fazemos</p>
        <h2 className={cn(texto.tituloSecao, 'mt-4')}>
          Um processo que transforma conteúdo em conduta.
        </h2>
        <div className="mt-6 space-y-4">
          <p className={texto.apoio}>
            Da primeira conversa ao registro final, cada etapa existe para
            tornar o treinamento mais relevante para quem participa.
          </p>
          <p className={texto.apoio}>
            E mais fácil de comprovar para quem gere.
          </p>
        </div>

        <ListaDeItens numerada className="mt-10" itens={ETAPAS} />

        <div className={cn(grade.duas, 'mt-10 lg:items-start')}>
          <div>
            <p className={texto.corpo}>
              O registro de cada turma fica organizado no portal do cliente,
              disponível quando a auditoria pedir.
            </p>
            <Link
              href={rotas.portal}
              className={cn(
                texto.link,
                'mt-6 inline-flex items-center gap-1.5',
              )}
            >
              Conhecer o portal
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <Marcadores
            className="grid-cols-2"
            itens={['Lista de presença', 'Fotos', 'Documentos', 'Certificados']}
          />
        </div>
      </DocSection>

      <DocSection id="modalidades" numero="05" rotulo="Modalidades">
        <h2 className={texto.tituloSecao}>Modalidades</h2>
        <TabelaDoc
          className="mt-8"
          legenda="Tabela 1. Modalidades de atendimento"
          colunas={[
            { chave: 'modalidade', titulo: 'Modalidade', destaque: true },
            { chave: 'como', titulo: 'Como funciona' },
            { chave: 'quando', titulo: 'Quando faz sentido' },
          ]}
          linhas={MODALIDADES}
        />
        <Confirmar bloco className="mt-8">
          descrição real do centro de treinamento e se ele já está operando
        </Confirmar>
      </DocSection>

      <DocSection
        id="por-que"
        numero="06"
        rotulo="Por que a Space Light"
        tom="folha"
      >
        <h2 className={texto.tituloSecao}>Por que a Space Light</h2>
        <ListaDeItens className="mt-8" itens={DIFERENCIAIS} />
      </DocSection>

      <DocSection id="depoimentos" numero="07" rotulo="Depoimentos">
        <p className={texto.eyebrow}>Quem já treinou com a gente</p>
        <h2 className={cn(texto.tituloSecao, 'mt-4')}>
          O que dizem as equipes de segurança.
        </h2>
        <ul data-surgir className="mt-10 border-t border-doc-ink">
          {[1, 2, 3].map((numero) => (
            <li key={numero} className="border-b border-doc-rule-strong py-6">
              <figure className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-start lg:gap-x-10">
                <blockquote>
                  <Confirmar bloco>depoimento real</Confirmar>
                </blockquote>
                <figcaption className="mt-3 lg:mt-0">
                  <Confirmar>
                    assinatura por função e tipo de operação de quem deu o
                    depoimento
                  </Confirmar>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <Marcadores
          className="mt-10 lg:grid-cols-3"
          itens={[
            'Atuação nacional',
            'Empresas de médio e grande porte',
            'Logística · Indústria · Varejo',
          ]}
        />
      </DocSection>

      <DocSection id="proposta" numero="08" rotulo="Proposta" tom="preto">
        <div className={cn(grade.duasComTitulo, 'xl:items-end')}>
          <div>
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt="Space Light Engenharia"
              width={260}
              height={49}
              className="h-8 w-auto brightness-0 invert"
            />
            <h2 className={cn(texto.tituloSecao, 'mt-8')}>
              Conte o treinamento que a sua empresa precisa.
            </h2>
          </div>
          <div>
            <p className={texto.apoio}>
              Preencha o formulário com o essencial e a Space Light retorna com
              a proposta e o caminho recomendado.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={rotas.contato} className={botao({ tamanho: 'lg' })}>
                Solicitar proposta
              </Link>
              <a
                href={WHATSAPP.link}
                target="_blank"
                rel="noreferrer"
                className={botao({ variante: 'contorno', tamanho: 'lg' })}
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </DocSection>
    </>
  );
}
