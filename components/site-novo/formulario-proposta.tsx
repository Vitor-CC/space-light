'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from 'react';

import { botao } from '@/components/site-novo/botao';
import { Confirmar } from '@/components/site-novo/confirmar';
import { texto } from '@/components/site-novo/texto';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { WHATSAPP } from '@/lib/site-novo/contato';
import {
  enviarProposta,
  type EstadoDaProposta,
} from '@/lib/site-novo/enviar-proposta';
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
  resumoDosErros,
  validarProposta,
  type CampoDaProposta,
  type ErrosDaProposta,
  type Proposta,
} from '@/lib/site-novo/proposta';
import { cn } from '@/lib/utils';

type CampoDeTexto = Exclude<CampoDaProposta, 'treinamentos'>;

const ESTADO_INICIAL: EstadoDaProposta = { status: 'inicial' };

// Os controles do kit, vestidos com os tokens do documento: fio escuro o
// bastante para passar 3:1, sem raio, sem anel dourado de foco (o foco é o
// contorno sólido de `doc-focus`) e erro só em vermelho.
const controle =
  'doc-focus h-12 border-doc-ink-muted bg-doc-sheet px-3 text-base text-doc-ink placeholder:text-doc-ink-muted focus-visible:border-doc-ink focus-visible:ring-0 aria-invalid:border-doc-error aria-invalid:ring-0 md:text-base';
const seletor =
  'w-full [&_select]:doc-focus [&_select]:h-12 [&_select]:border-doc-ink-muted [&_select]:bg-doc-sheet [&_select]:pl-3 [&_select]:text-base [&_select]:text-doc-ink [&_select]:focus-visible:border-doc-ink [&_select]:focus-visible:ring-0 [&_select]:aria-invalid:border-doc-error [&_select]:aria-invalid:ring-0 [&_svg]:text-doc-ink';

/**
 * Formulário "Solicitar proposta". Valida no navegador ao enviar (e ao sair
 * de um campo já preenchido) e de novo no servidor; o erro aparece ao lado do
 * campo, dizendo o que fazer. O sucesso fica na própria página.
 */
export function FormularioProposta({
  treinamentos,
  preSelecionados = [],
  origem,
}: {
  treinamentos: readonly { valor: string; rotulo: string }[];
  preSelecionados?: readonly string[];
  origem: string;
}) {
  const [estado, acao, enviando] = useActionState(
    enviarProposta,
    ESTADO_INICIAL,
  );
  const [valores, setValores] = useState<Proposta>(() =>
    propostaVazia([...preSelecionados]),
  );
  // Enquanto a pessoa corrige, os erros ficam locais; ao enviar um formulário
  // válido, voltam a valer os que o servidor devolver.
  const [errosLocais, setErrosLocais] = useState<ErrosDaProposta | null>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const tituloDoSucesso = useRef<HTMLHeadingElement>(null);

  const erros: ErrosDaProposta =
    errosLocais ?? (estado.status === 'erro' ? estado.erros : {});
  const resumo = errosLocais
    ? resumoDosErros(errosLocais)
    : estado.status === 'erro'
      ? estado.mensagem
      : '';

  const focarPrimeiroErro = (encontrados: ErrosDaProposta) => {
    const campo = ORDEM_DOS_CAMPOS.find((item) => encontrados[item]);
    if (!campo) return;
    formulario.current
      ?.querySelector<HTMLElement>(`[data-campo="${campo}"]`)
      ?.focus();
  };

  useEffect(() => {
    if (estado.status === 'sucesso') tituloDoSucesso.current?.focus();
    if (estado.status === 'erro') focarPrimeiroErro(estado.erros);
  }, [estado]);

  if (estado.status === 'sucesso') {
    return (
      <div className="border-t border-doc-ink pt-8">
        <h3
          ref={tituloDoSucesso}
          tabIndex={-1}
          className="doc-focus font-heading text-2xl leading-tight font-extrabold uppercase"
        >
          Solicitação recebida.
        </h3>
        <p className={cn(texto.corpo, 'mt-5')}>
          A equipe da Space Light vai analisar as informações e responder pelo
          e-mail ou pelo celular informados.
        </p>
        <Confirmar bloco className="mt-4">
          prazo em que a equipe responde a solicitação de proposta
        </Confirmar>
        <p className={cn(texto.apoio, 'mt-6')}>
          Se precisar falar agora,{' '}
          <a
            href={WHATSAPP.link}
            target="_blank"
            rel="noreferrer"
            className={texto.link}
          >
            chame no WhatsApp
          </a>
          .
        </p>
      </div>
    );
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

  // Ao sair de um campo preenchido, aponta o erro já; campo vazio só acusa
  // no envio, para não encher de vermelho quem ainda está navegando.
  const conferir = (campo: CampoDeTexto) => {
    if (!valores[campo]) return;
    const erro = validarProposta(valores)[campo];
    if (erro) setErrosLocais({ ...erros, [campo]: erro });
  };

  const alternarTreinamento = (valor: string, marcado: boolean) => {
    setValores((atuais) => ({
      ...atuais,
      treinamentos: marcado
        ? [...atuais.treinamentos, valor]
        : atuais.treinamentos.filter((item) => item !== valor),
    }));
    tirarErro('treinamentos');
  };

  // O envio sai do estado do formulário, e não do DOM: o React 19 reinicia o
  // <form> quando a Server Action termina, e depois de um erro devolvido pelo
  // servidor os selects e checkboxes do DOM voltariam vazios enquanto a tela
  // continua preenchida. Disparando a ação à mão, não há reinício.
  const aoEnviar: NonNullable<React.ComponentProps<'form'>['onSubmit']> = (
    evento,
  ) => {
    evento.preventDefault();
    const encontrados = validarProposta(valores);
    if (Object.keys(encontrados).length > 0) {
      setErrosLocais(encontrados);
      focarPrimeiroErro(encontrados);
      return;
    }
    setErrosLocais(null);
    const dados = new FormData();
    for (const [campo, valor] of Object.entries(valores)) {
      if (Array.isArray(valor))
        valor.forEach((item) => dados.append(campo, item));
      else dados.set(campo, valor);
    }
    dados.set('origem', origem);
    const armadilha = evento.currentTarget.elements.namedItem('site');
    dados.set(
      'site',
      armadilha instanceof HTMLInputElement ? armadilha.value : '',
    );
    startTransition(() => acao(dados));
  };

  const texto_ = (campo: CampoDeTexto) => ({
    name: campo,
    value: valores[campo],
    'data-campo': campo,
    onBlur: () => conferir(campo),
  });

  return (
    <form
      ref={formulario}
      action={acao}
      onSubmit={aoEnviar}
      noValidate
      className="grid gap-12"
    >
      <input type="hidden" name="origem" value={origem} />
      {/* Armadilha para robôs: fora da tela e fora da navegação por teclado. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Bloco numero="01" titulo="Contato">
        <Campo
          id="proposta-nome"
          rotulo="Nome"
          erro={erros.nome}
          className="md:col-span-2"
        >
          {(aria) => (
            <Input
              {...aria}
              {...texto_('nome')}
              autoComplete="name"
              onChange={(e) => mudar('nome', e.target.value)}
              className={controle}
            />
          )}
        </Campo>
        <Campo
          id="proposta-email"
          rotulo="E-mail corporativo"
          erro={erros.email}
        >
          {(aria) => (
            <Input
              {...aria}
              {...texto_('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              onChange={(e) => mudar('email', e.target.value)}
              className={controle}
            />
          )}
        </Campo>
        <Campo id="proposta-celular" rotulo="Celular" erro={erros.celular}>
          {(aria) => (
            <Input
              {...aria}
              {...texto_('celular')}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              onChange={(e) =>
                mudar('celular', formatarCelular(e.target.value))
              }
              className={controle}
            />
          )}
        </Campo>
      </Bloco>

      <Bloco numero="02" titulo="Empresa">
        <Campo
          id="proposta-empresa"
          rotulo="Empresa"
          erro={erros.empresa}
          className="md:col-span-2"
        >
          {(aria) => (
            <Input
              {...aria}
              {...texto_('empresa')}
              autoComplete="organization"
              onChange={(e) => mudar('empresa', e.target.value)}
              className={controle}
            />
          )}
        </Campo>
        <Campo
          id="proposta-cnpj"
          rotulo="CNPJ"
          erro={erros.cnpj}
          dica="Aceita CNPJ só com números ou com letras."
        >
          {(aria) => (
            <Input
              {...aria}
              {...texto_('cnpj')}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="00.000.000/0000-00"
              onChange={(e) => mudar('cnpj', formatarCnpj(e.target.value))}
              className={cn(controle, 'font-doc-mono tabular-nums')}
            />
          )}
        </Campo>
        <Campo id="proposta-cargo" rotulo="Cargo" erro={erros.cargo}>
          {(aria) => (
            <NativeSelect
              {...aria}
              {...texto_('cargo')}
              onChange={(e) => mudar('cargo', e.target.value)}
              className={seletor}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {CARGOS.map((cargo) => (
                <NativeSelectOption key={cargo} value={cargo}>
                  {cargo}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Campo>
        <Campo
          id="proposta-tamanho"
          rotulo="Tamanho da empresa"
          erro={erros.tamanho}
        >
          {(aria) => (
            <NativeSelect
              {...aria}
              {...texto_('tamanho')}
              onChange={(e) => mudar('tamanho', e.target.value)}
              className={seletor}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {TAMANHOS.map((tamanho) => (
                <NativeSelectOption key={tamanho} value={tamanho}>
                  {tamanho} funcionários
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Campo>
        <Campo id="proposta-uf" rotulo="Estado" erro={erros.uf}>
          {(aria) => (
            <NativeSelect
              {...aria}
              {...texto_('uf')}
              autoComplete="address-level1"
              onChange={(e) => mudar('uf', e.target.value)}
              className={seletor}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {UFS.map(([sigla, nome]) => (
                <NativeSelectOption key={sigla} value={sigla}>
                  {nome}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Campo>
      </Bloco>

      <Bloco numero="03" titulo="Treinamento">
        <FieldSet
          className="gap-3 md:col-span-2"
          aria-describedby={
            erros.treinamentos ? 'proposta-treinamentos-erro' : undefined
          }
        >
          <FieldLegend
            variant="label"
            className="mb-0 text-sm font-semibold text-doc-ink"
          >
            Treinamentos
          </FieldLegend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {treinamentos.map((opcao, indice) => {
              const marcado = valores.treinamentos.includes(opcao.valor);
              return (
                <label
                  key={opcao.valor}
                  className="flex min-h-12 cursor-pointer items-center gap-3 border border-doc-rule-strong bg-doc-sheet px-3 has-data-checked:border-doc-ink"
                >
                  <Checkbox
                    name="treinamentos"
                    value={opcao.valor}
                    checked={marcado}
                    onCheckedChange={(checked) =>
                      alternarTreinamento(opcao.valor, checked)
                    }
                    data-campo={indice === 0 ? 'treinamentos' : undefined}
                    aria-invalid={erros.treinamentos ? true : undefined}
                    className="doc-focus size-5 rounded-none border-doc-ink-muted bg-doc-sheet focus-visible:ring-0 data-checked:border-sl-black data-checked:bg-sl-gold data-checked:text-sl-black"
                  />
                  <span className="font-doc-mono text-sm font-semibold">
                    {opcao.rotulo}
                  </span>
                </label>
              );
            })}
          </div>
          {erros.treinamentos ? (
            <p
              id="proposta-treinamentos-erro"
              className="text-sm text-doc-error"
            >
              {erros.treinamentos}
            </p>
          ) : null}
        </FieldSet>

        <Campo
          id="proposta-participantes"
          rotulo="Nº de participantes"
          erro={erros.participantes}
        >
          {(aria) => (
            <Input
              {...aria}
              {...texto_('participantes')}
              type="text"
              inputMode="numeric"
              onChange={(e) =>
                mudar('participantes', e.target.value.replace(/\D/g, ''))
              }
              className={cn(controle, 'font-doc-mono tabular-nums')}
            />
          )}
        </Campo>
        <Campo
          id="proposta-modalidade"
          rotulo="Modalidade"
          erro={erros.modalidade}
        >
          {(aria) => (
            <NativeSelect
              {...aria}
              {...texto_('modalidade')}
              onChange={(e) => mudar('modalidade', e.target.value)}
              className={seletor}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {MODALIDADES.map((modalidade) => (
                <NativeSelectOption key={modalidade} value={modalidade}>
                  {modalidade}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Campo>
        <Campo id="proposta-prazo" rotulo="Prazo" opcional erro={erros.prazo}>
          {(aria) => (
            <NativeSelect
              {...aria}
              {...texto_('prazo')}
              onChange={(e) => mudar('prazo', e.target.value)}
              className={seletor}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {PRAZOS.map((prazo) => (
                <NativeSelectOption key={prazo} value={prazo}>
                  {prazo}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Campo>
        <Campo
          id="proposta-mensagem"
          rotulo="Mensagem"
          opcional
          erro={erros.mensagem}
          className="md:col-span-2"
        >
          {(aria) => (
            <Textarea
              {...aria}
              {...texto_('mensagem')}
              rows={4}
              onChange={(e) => mudar('mensagem', e.target.value)}
              className={cn(controle, 'h-auto min-h-32 py-3')}
            />
          )}
        </Campo>
      </Bloco>

      <div className="grid gap-5 border-t border-doc-ink pt-6">
        <p className="max-w-measure text-sm leading-relaxed text-doc-ink-muted">
          Usamos estes dados só para preparar e enviar a proposta.
        </p>
        <p
          aria-live="polite"
          className="text-sm font-semibold text-doc-error empty:hidden"
        >
          {resumo}
        </p>
        <div>
          <button
            type="submit"
            disabled={enviando}
            className={botao({
              tamanho: 'lg',
              className:
                'w-full disabled:cursor-wait disabled:opacity-80 sm:w-auto',
            })}
          >
            {enviando ? (
              <>
                <span aria-hidden="true">
                  <Spinner />
                </span>
                Enviando…
              </>
            ) : (
              'Solicitar proposta'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Grupo de campos com o título numerado, como a seção de um documento. */
function Bloco({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <FieldSet className="gap-6">
      <FieldLegend className="mb-0 flex w-full items-baseline gap-3 border-b border-doc-ink pb-3">
        <span className="font-doc-mono text-sm font-semibold text-doc-mark">
          {numero}
        </span>
        <span className="font-heading text-lg font-bold">{titulo}</span>
      </FieldLegend>
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">{children}</div>
    </FieldSet>
  );
}

/** Rótulo, controle, dica e erro de um campo, ligados por id e aria. */
function Campo({
  id,
  rotulo,
  opcional = false,
  erro,
  dica,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  erro?: string;
  dica?: string;
  className?: string;
  children: (aria: {
    id: string;
    'aria-invalid': true | undefined;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}) {
  const idDaDica = `${id}-dica`;
  const idDoErro = `${id}-erro`;
  const descricao =
    [dica ? idDaDica : null, erro ? idDoErro : null]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <Field className={cn('gap-2', className)}>
      <FieldLabel htmlFor={id} className="text-sm font-semibold text-doc-ink">
        {rotulo}
        {opcional ? (
          <span className="font-normal text-doc-ink-muted">(opcional)</span>
        ) : null}
      </FieldLabel>
      {children({
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descricao,
      })}
      {dica ? (
        <FieldDescription id={idDaDica} className="text-sm text-doc-ink-muted">
          {dica}
        </FieldDescription>
      ) : null}
      {erro ? (
        <p id={idDoErro} className="text-sm text-doc-error">
          {erro}
        </p>
      ) : null}
    </Field>
  );
}
