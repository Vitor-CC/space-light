'use client';

import { AlertTriangle, ArrowRight, Check, CircleX, Info, Lock, MessageCircle, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from 'react';

import { areaClasses, campoClasses, rotuloClasses, selectClasses } from '@/components/ds/base';
import { Resp } from '@/components/site-novo/blocos';
import { botao } from '@/components/site-novo/botao';
import { Spinner } from '@/components/ui/spinner';
import { WHATSAPP } from '@/lib/site-novo/contato';
import { enviarProposta, type EstadoDaProposta } from '@/lib/site-novo/enviar-proposta';
import {
  CARGOS,
  MODALIDADES,
  ORDEM_DOS_CAMPOS,
  PRAZOS,
  TAMANHOS,
  UFS,
  formatarCelular,
  formatarCnpj,
  propostaVazia,
  validarProposta,
  type CampoDaProposta,
  type ErrosDaProposta,
  type Proposta,
} from '@/lib/site-novo/proposta';
import { rotas } from '@/lib/site-novo/rotas';
import { cn } from '@/lib/utils';

/*
 * Formulário "Solicitar proposta" no desenho do Figma (Contato · Solicitar
 * proposta, Erro e Enviado). Valida no navegador ao enviar, e ao sair de um
 * campo já preenchido, e de novo no servidor. Com JavaScript o envio é feito
 * à mão: se a conexão cair, os dados ficam na tela e aparece um aviso. Sem
 * JavaScript, o <form> posta direto na Server Action.
 */

type CampoDeTexto = Exclude<CampoDaProposta, 'treinamentos'>;
type Opcao = { valor: string; rotulo: string };

const ESTADO_INICIAL: EstadoDaProposta = { status: 'inicial' };
const FALHA_DE_CONEXAO = 'Falha de conexão. Seus dados continuam aqui — tente de novo ou fale no WhatsApp.';
const controle = (erro?: string) => cn(campoClasses, erro && 'border-[1.5px]');

export function FormularioProposta({ treinamentos, preSelecionados = [], origem, apoio }: { treinamentos: readonly Opcao[]; preSelecionados?: readonly string[]; origem: string; apoio: ReactNode }) {
  const [estadoSemJs, acao] = useActionState(enviarProposta, ESTADO_INICIAL);
  const [estadoComJs, setEstadoComJs] = useState<EstadoDaProposta | null>(null);
  const estado = estadoComJs ?? estadoSemJs;
  const [enviando, iniciarEnvio] = useTransition();
  const [falha, setFalha] = useState<string | null>(null);
  const [enviadoEm, setEnviadoEm] = useState<Date | null>(null);
  const [valores, setValores] = useState<Proposta>(() => propostaVazia([...preSelecionados]));
  // Enquanto a pessoa corrige, os erros ficam locais; ao enviar um formulário
  // válido, voltam a valer os que o servidor devolver.
  const [errosLocais, setErrosLocais] = useState<ErrosDaProposta | null>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const tituloDoSucesso = useRef<HTMLHeadingElement>(null);

  const erros: ErrosDaProposta = errosLocais ?? (estado.status === 'erro' ? estado.erros : {});
  const faltam = Object.keys(erros).length;
  // Falha do servidor sem erro de campo (o lead não foi registrado): vira o
  // mesmo aviso da queda de conexão.
  const falhaSemJs = estadoComJs === null && estadoSemJs.status === 'erro' && Object.keys(estadoSemJs.erros).length === 0 ? estadoSemJs.mensagem : null;
  const mensagemDaFalha = falha ?? falhaSemJs;

  const focarPrimeiroErro = (encontrados: ErrosDaProposta) => {
    const campo = ORDEM_DOS_CAMPOS.find((item) => encontrados[item]);
    if (campo) formulario.current?.querySelector<HTMLElement>(`[data-campo="${campo}"]`)?.focus();
  };

  useEffect(() => {
    if (estado.status === 'sucesso') tituloDoSucesso.current?.focus();
    if (estado.status === 'erro') focarPrimeiroErro(estado.erros);
  }, [estado]);

  if (estado.status === 'sucesso') {
    return <Enviado valores={valores} treinamentos={treinamentos} enviadoEm={enviadoEm} titulo={tituloDoSucesso} />;
  }

  const tirarErro = (campo: CampoDaProposta) => {
    if (!erros[campo]) return;
    const restantes = { ...erros };
    delete restantes[campo];
    setErrosLocais(restantes);
  };

  const mudar = (campo: CampoDeTexto, valor: string) => {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    tirarErro(campo);
  };

  // Ao sair de um campo preenchido, aponta o erro já; campo vazio só acusa no
  // envio, para não encher de vermelho quem ainda está navegando.
  const conferir = (campo: CampoDeTexto) => {
    if (!valores[campo]) return;
    const erro = validarProposta(valores)[campo];
    if (erro) setErrosLocais({ ...erros, [campo]: erro });
  };

  const alternarTreinamento = (valor: string, marcado: boolean) => {
    setValores((atuais) => ({ ...atuais, treinamentos: marcado ? [...atuais.treinamentos, valor] : atuais.treinamentos.filter((item) => item !== valor) }));
    tirarErro('treinamentos');
  };

  // O envio sai do estado do formulário, e não do DOM: assim os selects e
  // checkboxes não voltam vazios depois de um erro devolvido pelo servidor.
  const aoEnviar = (evento: React.SubmitEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const encontrados = validarProposta(valores);
    if (Object.keys(encontrados).length > 0) {
      setErrosLocais(encontrados);
      focarPrimeiroErro(encontrados);
      return;
    }
    setErrosLocais(null);
    setFalha(null);
    const dados = new FormData();
    for (const [campo, valor] of Object.entries(valores)) {
      if (Array.isArray(valor)) valor.forEach((item) => dados.append(campo, item));
      else dados.set(campo, valor);
    }
    dados.set('origem', origem);
    const armadilha = evento.currentTarget.elements.namedItem('site');
    dados.set('site', armadilha instanceof HTMLInputElement ? armadilha.value : '');
    iniciarEnvio(async () => {
      try {
        const resultado = await enviarProposta(ESTADO_INICIAL, dados);
        if (resultado.status === 'erro' && Object.keys(resultado.erros).length === 0) {
          setFalha(resultado.mensagem);
          return;
        }
        if (resultado.status === 'sucesso') setEnviadoEm(new Date());
        setEstadoComJs(resultado);
      } catch {
        setFalha(FALHA_DE_CONEXAO);
      }
    });
  };

  const texto = (campo: CampoDeTexto) => ({ name: campo, value: valores[campo], 'data-campo': campo, onBlur: () => conferir(campo) });

  return <div className="bg-ds-muted text-ds-texto">
    <div className="mx-auto w-full max-w-[1440px] lg:flex lg:items-start lg:gap-10 lg:px-10 xl:gap-12 lg:pt-14 lg:pb-[104px] xl:px-[120px]">
      {apoio}
      <form ref={formulario} action={acao} onSubmit={aoEnviar} noValidate aria-label="Solicitar proposta" className="bg-ds-superficie lg:min-w-0 lg:flex-1 lg:overflow-hidden lg:rounded-lg">
        <input type="hidden" name="origem" value={origem} />
        {/* Armadilha para robôs: fora da tela e fora da navegação por teclado. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>Site<input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
        </div>

        {faltam > 0 ? <div className="px-5 pt-6 md:px-10">
          <Aviso tom="atencao" titulo={faltam === 1 ? 'Falta 1 informação' : `Faltam ${faltam} informações`} texto="Corrija os campos marcados em vermelho para enviar a solicitação." />
        </div> : null}

        <Etapa numero="01" titulo="Contato" primeira>
          <Campo id="proposta-nome" rotulo="Nome" erro={erros.nome}>
            {(aria) => <input {...aria} {...texto('nome')} type="text" autoComplete="name" placeholder="Seu nome completo" onChange={(e) => mudar('nome', e.target.value)} className={controle(erros.nome)} />}
          </Campo>
          <Linha colunas={2}>
            <Campo id="proposta-email" rotulo="E-mail corporativo" erro={erros.email}>
              {(aria) => <input {...aria} {...texto('email')} type="email" inputMode="email" autoComplete="email" placeholder="nome@empresa.com.br" onChange={(e) => mudar('email', e.target.value)} className={controle(erros.email)} />}
            </Campo>
            <Campo id="proposta-celular" rotulo="Celular / WhatsApp" erro={erros.celular}>
              {(aria) => <input {...aria} {...texto('celular')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(11) 90000-0000" onChange={(e) => mudar('celular', formatarCelular(e.target.value))} className={controle(erros.celular)} />}
            </Campo>
          </Linha>
        </Etapa>

        <Etapa numero="02" titulo="Empresa">
          <Linha colunas={2}>
            <Campo id="proposta-empresa" rotulo="Empresa" erro={erros.empresa}>
              {(aria) => <input {...aria} {...texto('empresa')} type="text" autoComplete="organization" placeholder="Razão social ou nome fantasia" onChange={(e) => mudar('empresa', e.target.value)} className={controle(erros.empresa)} />}
            </Campo>
            <Campo id="proposta-cnpj" rotulo="CNPJ" erro={erros.cnpj} dica="Aceita CNPJ só com números ou com letras.">
              {(aria) => <input {...aria} {...texto('cnpj')} type="text" autoCapitalize="characters" autoComplete="off" placeholder="00.000.000/0000-00" onChange={(e) => mudar('cnpj', formatarCnpj(e.target.value))} className={cn(controle(erros.cnpj), 'tabular-nums')} />}
            </Campo>
          </Linha>
          <Linha colunas={3}>
            <Campo id="proposta-cargo" rotulo="Cargo" erro={erros.cargo}>
              {(aria) => <Selecao aria={aria} campo={texto('cargo')} erro={erros.cargo} aoMudar={(v) => mudar('cargo', v)} opcoes={CARGOS.map((cargo) => [cargo, cargo])} />}
            </Campo>
            <Campo id="proposta-tamanho" rotulo="Tamanho da empresa" erro={erros.tamanho}>
              {(aria) => <Selecao aria={aria} campo={texto('tamanho')} erro={erros.tamanho} aoMudar={(v) => mudar('tamanho', v)} opcoes={TAMANHOS.map((tamanho) => [tamanho, `${tamanho} funcionários`])} />}
            </Campo>
            <Campo id="proposta-uf" rotulo="Estado" erro={erros.uf}>
              {(aria) => <Selecao aria={aria} campo={texto('uf')} erro={erros.uf} aoMudar={(v) => mudar('uf', v)} opcoes={UFS.map(([sigla, nome]) => [sigla, nome])} autoComplete="address-level1" />}
            </Campo>
          </Linha>
        </Etapa>

        <Etapa numero="03" titulo="Treinamento">
          <fieldset aria-describedby={erros.treinamentos ? 'proposta-treinamentos-erro' : undefined} className="flex min-w-0 flex-col gap-[18px]">
            {/* float tira a legenda da borda do fieldset; no flex ela vira um item comum. */}
            <legend className={cn(rotuloClasses, 'float-left w-full')}>Quais treinamentos?</legend>
            <div className="flex flex-wrap gap-2">
              {treinamentos.map((opcao, indice) => {
                const marcado = valores.treinamentos.includes(opcao.valor);
                return <label key={opcao.valor} className={cn('inline-flex cursor-pointer items-center rounded-md border px-3.5 py-2.5 ds-caps-l transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ds-amarelo has-[:focus-visible]:ring-offset-2', marcado ? 'border-ds-borda-forte bg-ds-inverso text-ds-texto-inv' : cn('bg-ds-superficie text-ds-texto hover:border-ds-borda-forte', erros.treinamentos ? 'border-ds-perigo' : 'border-ds-borda'))}>
                  <input type="checkbox" name="treinamentos" value={opcao.valor} checked={marcado} onChange={(e) => alternarTreinamento(opcao.valor, e.target.checked)} data-campo={indice === 0 ? 'treinamentos' : undefined} aria-invalid={erros.treinamentos ? true : undefined} className="sr-only" />
                  {opcao.rotulo}
                </label>;
              })}
            </div>
            {erros.treinamentos ? <Mensagem id="proposta-treinamentos-erro" erro>{erros.treinamentos}</Mensagem> : null}
          </fieldset>
          <Linha colunas={3}>
            <Campo id="proposta-participantes" rotulo="Nº de participantes" erro={erros.participantes}>
              {(aria) => <input {...aria} {...texto('participantes')} type="text" inputMode="numeric" placeholder="Ex.: 25" onChange={(e) => mudar('participantes', e.target.value.replace(/\D/g, ''))} className={cn(controle(erros.participantes), 'tabular-nums')} />}
            </Campo>
            <Campo id="proposta-modalidade" rotulo="Modalidade" erro={erros.modalidade}>
              {(aria) => <Selecao aria={aria} campo={texto('modalidade')} erro={erros.modalidade} aoMudar={(v) => mudar('modalidade', v)} opcoes={MODALIDADES.map((modalidade) => [modalidade, modalidade])} />}
            </Campo>
            <Campo id="proposta-prazo" rotulo="Prazo (opcional)" erro={erros.prazo}>
              {(aria) => <Selecao aria={aria} campo={texto('prazo')} erro={erros.prazo} aoMudar={(v) => mudar('prazo', v)} opcoes={PRAZOS.map((prazo) => [prazo, prazo])} />}
            </Campo>
          </Linha>
          <Campo id="proposta-mensagem" rotulo="Mensagem (opcional)" erro={erros.mensagem}>
            {(aria) => <textarea {...aria} {...texto('mensagem')} rows={3} placeholder="Conte algo sobre a operação, a cidade ou o prazo." onChange={(e) => mudar('mensagem', e.target.value)} className={cn(areaClasses, erros.mensagem && 'border-[1.5px]')} />}
          </Campo>
        </Etapa>

        <div className="flex flex-col-reverse gap-3 border-t border-ds-borda px-5 py-6 md:px-10 lg:flex-row lg:items-center lg:gap-4">
          <p className="flex items-start justify-center gap-2 text-center ds-caption text-ds-texto-2 lg:flex-1 lg:justify-start lg:text-left">
            <Lock className="hidden size-4 shrink-0 lg:block" aria-hidden="true" />Usamos estes dados só para preparar e enviar a proposta.
          </p>
          <button type="submit" disabled={enviando} className={botao({ tamanho: 'lg', className: 'w-full disabled:cursor-wait disabled:opacity-80 lg:w-auto' })}>
            {enviando ? <><span aria-hidden="true"><Spinner /></span>Enviando…</> : <>Enviar solicitação<ArrowRight className="size-5" aria-hidden="true" /></>}
          </button>
        </div>
      </form>
    </div>

    {/* Toast do Figma: canto inferior direito no desktop, rodapé da tela no celular. Fica até ser fechado. */}
    {mensagemDaFalha ? <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-8 sm:bottom-8 sm:w-[420px]">
      <Aviso tom="perigo" titulo="Não foi possível enviar" texto={mensagemDaFalha} aoFechar={() => setFalha(null)} className="shadow-[0_12px_16px_rgba(0,0,0,0.16)]" />
    </div> : null}
  </div>;
}

// ---------------------------------------------------------------------------
// Peças do formulário
// ---------------------------------------------------------------------------

/** Etapa numerada do cartão ("01 Contato", "02 Empresa", "03 Treinamento"). */
function Etapa({ numero, titulo, primeira = false, children }: { numero: string; titulo: string; primeira?: boolean; children: ReactNode }) {
  return <fieldset className={cn('flex min-w-0 flex-col gap-[18px] px-5 py-7 md:px-10', !primeira && 'border-t border-ds-borda')}>
    <legend className="float-left w-full">
      <h2 className="flex items-center gap-3 ds-h4">
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ds-inverso ds-caps text-ds-amarelo">{numero}</span>{titulo}
      </h2>
    </legend>
    {children}
  </fieldset>;
}

function Linha({ colunas, children }: { colunas: 2 | 3; children: ReactNode }) {
  return <div className={cn('grid items-start gap-[18px] md:gap-5', colunas === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>{children}</div>;
}

type Aria = { id: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined };

/** Rótulo, controle e a linha de ajuda ou de erro de um campo, ligados por id e aria. */
function Campo({ id, rotulo, erro, dica, children }: { id: string; rotulo: string; erro?: string; dica?: string; children: (aria: Aria) => ReactNode }) {
  const idDaMensagem = `${id}-mensagem`;
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className={rotuloClasses}>{rotulo}</label>
    {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': erro || dica ? idDaMensagem : undefined })}
    {erro ? <Mensagem id={idDaMensagem} erro>{erro}</Mensagem> : dica ? <Mensagem id={idDaMensagem}>{dica}</Mensagem> : null}
  </div>;
}

function Mensagem({ id, erro = false, children }: { id: string; erro?: boolean; children: ReactNode }) {
  const Icone = erro ? AlertTriangle : Info;
  return <p id={id} className={cn('flex items-start gap-1.5 ds-caption', erro ? 'text-ds-perigo' : 'text-ds-texto-2')}>
    <Icone className="mt-px size-3.5 shrink-0" aria-hidden="true" />{children}
  </p>;
}

function Selecao({ aria, campo, erro, aoMudar, opcoes, autoComplete }: { aria: Aria; campo: { name: string; value: string; 'data-campo': string; onBlur: () => void }; erro?: string; aoMudar: (valor: string) => void; opcoes: readonly (readonly [string, string])[]; autoComplete?: string }) {
  return <select {...aria} {...campo} autoComplete={autoComplete} onChange={(e) => aoMudar(e.target.value)} className={cn(selectClasses, erro && 'border-[1.5px]', !campo.value && 'text-ds-texto-2')}>
    <option value="">Selecione</option>
    {opcoes.map(([valor, rotulo]) => <option key={valor} value={valor} className="text-ds-texto">{rotulo}</option>)}
  </select>;
}

/** "Aviso" do Figma: faixa com fio à esquerda, no topo do formulário ou como toast. */
function Aviso({ tom, titulo, texto, aoFechar, className }: { tom: 'atencao' | 'perigo'; titulo: string; texto: string; aoFechar?: () => void; className?: string }) {
  const Icone = tom === 'perigo' ? CircleX : AlertTriangle;
  return <div role="alert" className={cn('flex items-start gap-3 rounded-lg border-l-[3px] py-3.5 pr-3 pl-4', tom === 'perigo' ? 'border-ds-perigo bg-ds-perigo-suave' : 'border-ds-atencao bg-ds-atencao-suave', className)}>
    <Icone className={cn('size-5 shrink-0', tom === 'perigo' ? 'text-ds-perigo' : 'text-ds-atencao')} aria-hidden="true" />
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 ds-body-s">
      <strong className="font-medium">{titulo}</strong>
      <span className="text-ds-texto-2">{texto}</span>
    </div>
    {aoFechar ? <button type="button" onClick={aoFechar} aria-label="Fechar aviso" className="doc-focus shrink-0 rounded-sm p-0.5 text-ds-texto-2 hover:text-ds-texto"><X className="size-4" aria-hidden="true" /></button> : null}
  </div>;
}

// ---------------------------------------------------------------------------
// Enviado (confirmação)
// ---------------------------------------------------------------------------

function Enviado({ valores, treinamentos, enviadoEm, titulo }: { valores: Proposta; treinamentos: readonly Opcao[]; enviadoEm: Date | null; titulo: RefObject<HTMLHeadingElement | null> }) {
  const primeiroNome = valores.nome.trim().split(/\s+/)[0];
  const obrigado = primeiroNome ? `Obrigado, ${primeiroNome}.` : 'Obrigado.';
  const participantes = Number(valores.participantes);
  const uf = UFS.find(([sigla]) => sigla === valores.uf);
  const modalidade = (localDoEstado?: string) => [valores.modalidade, localDoEstado].filter(Boolean).join(' · ');
  const linhas: { rotulo: string; valor: ReactNode; soNoDesktop?: boolean }[] = [
    { rotulo: 'Treinamentos', valor: valores.treinamentos.map((valor) => treinamentos.find((opcao) => opcao.valor === valor)?.rotulo ?? valor).join(' · ') },
    { rotulo: 'Participantes', valor: participantes > 0 ? `${participantes} ${participantes === 1 ? 'pessoa' : 'pessoas'}` : '' },
    { rotulo: 'Modalidade', valor: valores.modalidade ? <Resp curto={modalidade(uf?.[0])} longo={modalidade(uf?.[1])} /> : '' },
    { rotulo: 'Empresa', valor: valores.empresa, soNoDesktop: true },
    { rotulo: 'Enviado em', valor: enviadoEm ? `${enviadoEm.toLocaleDateString('pt-BR')} às ${enviadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '' },
  ].filter((linha) => linha.valor);

  return <div className="bg-ds-muted text-ds-texto lg:px-10 lg:pt-20 lg:pb-[120px]">
    <div className="mx-auto flex w-full max-w-[720px] flex-col overflow-hidden bg-ds-superficie lg:rounded-xl">
      <div className="ds-degrade flex flex-col items-center gap-4 px-5 pt-6 pb-8 text-center lg:px-16 lg:pt-14 lg:pb-10">
        <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-full bg-ds-inverso text-ds-amarelo lg:size-[88px]"><Check className="size-9 lg:size-11" /></span>
        <h1 ref={titulo} tabIndex={-1} className="doc-focus font-ds-display text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[40px] lg:leading-[46px] lg:tracking-[-0.02em]">Solicitação enviada!</h1>
        <p className="ds-body-m lg:font-ds-sans lg:text-xl lg:leading-[30px]">
          <Resp curto={`${obrigado} A Space Light retorna em até 1 dia útil por e-mail ou WhatsApp.`} longo={`${obrigado} A Space Light retorna em até 1 dia útil ${valores.email ? `no e-mail ${valores.email} ou pelo WhatsApp` : 'por e-mail ou WhatsApp'}.`} />
        </p>
      </div>

      {linhas.length > 0 ? <div className="px-5 pt-6 lg:px-12 lg:pt-8 lg:pb-2">
        <p className="ds-caps text-ds-texto-2"><Resp curto="Resumo" longo="Resumo do que você enviou" /></p>
        <dl className="mt-2">
          {linhas.map((linha) => <div key={linha.rotulo} className={cn('flex items-start justify-between gap-4 border-b border-ds-borda py-3 ds-body-s lg:py-[13px]', linha.soNoDesktop && 'max-lg:hidden')}>
            <dt className="text-ds-texto-2">{linha.rotulo}</dt>
            <dd className="text-right font-medium">{linha.valor}</dd>
          </div>)}
        </dl>
      </div> : null}

      <div className="flex flex-col gap-3.5 px-5 pt-8 pb-10 lg:px-12 lg:pt-6">
        <p className="hidden items-center gap-3 rounded-lg bg-ds-muted px-4 py-3.5 ds-body-s lg:flex">
          <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />Quando a turma for agendada, você recebe acesso ao portal do cliente para acompanhar presença, fotos e certificados.
        </p>
        <div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-center lg:pt-2">
          <Link href={rotas.inicio} className={botao({ variante: 'contorno', tamanho: 'lg', className: 'border-ds-inverso text-ds-texto hover:bg-ds-inverso hover:text-ds-texto-inv' })}>Voltar para o início</Link>
          <a href={WHATSAPP.link} target="_blank" rel="noreferrer" className={botao({ variante: 'escuro', tamanho: 'lg' })}>Falar no WhatsApp<MessageCircle className="size-5" aria-hidden="true" /></a>
        </div>
      </div>
    </div>
  </div>;
}
