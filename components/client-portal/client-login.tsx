'use client';

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CLIENT_SESSION_KEY,
  DEMO_CLIENT_EMAIL,
  DEMO_CLIENT_PASSWORD,
  clientPortalData,
  isDemoCredentials,
} from '@/lib/client-portal-data';

export function ClientLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.sessionStorage.getItem(CLIENT_SESSION_KEY)) {
      router.replace('/cliente');
    }
  }, [router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!isDemoCredentials(email, password)) {
      setError('E-mail ou senha inválidos. Use os dados demonstrativos abaixo.');
      return;
    }

    window.sessionStorage.setItem(
      CLIENT_SESSION_KEY,
      JSON.stringify({
        clientId: clientPortalData.organization.id,
        authenticatedAt: new Date().toISOString(),
      }),
    );
    router.push('/cliente');
  }

  function fillDemoCredentials() {
    setEmail(DEMO_CLIENT_EMAIL);
    setPassword(DEMO_CLIENT_PASSWORD);
    setError('');
  }

  return (
    <main className="grid min-h-screen bg-[#080808] text-white lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src="/images/brand-v2/heroes/space-light-hero-02-brand-v2.png"
          alt="Treinamento prático conduzido pela Space Light Engenharia"
          fill
          priority
          sizes="55vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.25),rgba(0,0,0,.82)),linear-gradient(0deg,rgba(0,0,0,.96),transparent_62%)]" />
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <a href="/" aria-label="Voltar ao site da Space Light" className="w-fit">
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt="Space Light Engenharia"
              width={232}
              height={84}
              className="h-14 w-auto brightness-0 invert"
            />
          </a>

          <div className="max-w-2xl">
            <span className="eyebrow text-[#f2ad19]">Portal corporativo</span>
            <h1 className="mt-6 text-[clamp(3.5rem,6vw,7rem)] font-black uppercase leading-[0.86] tracking-[-0.07em]">
              Tudo do seu treinamento em um só lugar.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/68">
              Consulte registros, fotos, documentos e certificados organizados pela Space Light para a sua empresa.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-[#f5f5f2] text-[#0b0b0b]">
        <header className="flex h-[76px] items-center justify-between border-b border-black/10 px-5 sm:px-8 lg:hidden">
          <a href="/" aria-label="Space Light Engenharia — início">
            <Image
              src="/images/branding/space-light-logo-oficial.png"
              alt="Space Light Engenharia"
              width={232}
              height={84}
              className="h-11 w-auto object-contain"
            />
          </a>
          <a
            href="/"
            className="flex size-11 items-center justify-center border border-black/15"
            aria-label="Voltar ao site"
          >
            <ArrowLeft className="size-4" />
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-14 xl:px-24">
          <div className="w-full max-w-[520px]">
            <div className="flex size-14 items-center justify-center bg-black text-[#f2ad19]">
              <LockKeyhole className="size-6" />
            </div>
            <span className="eyebrow mt-8 block text-[#8a6107]">Área do Cliente</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.055em] sm:text-5xl">
              Acesse seu portal
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#666] sm:text-base">
              Entre com o acesso corporativo enviado pela Space Light. Participantes dos treinamentos não possuem conta individual.
            </p>

            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  E-mail corporativo
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="nome@empresa.com.br"
                  className="h-14 rounded-none border-black/20 bg-white px-4 text-base focus-visible:ring-[#f2ad19]/40"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  Senha
                </span>
                <span className="relative block">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="h-14 rounded-none border-black/20 bg-white px-4 pr-14 text-base focus-visible:ring-[#f2ad19]/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-black/48 transition hover:text-black"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </span>
              </label>

              {error ? (
                <p role="alert" className="border-l-4 border-[#c32020] bg-[#c32020]/8 px-4 py-3 text-sm text-[#8f1717]">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-14 w-full rounded-none bg-[#f2ad19] px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-black hover:bg-[#ff9900]"
              >
                Entrar na Área do Cliente <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="mt-7 border border-black/12 bg-white p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#8a6107]" />
                <div className="min-w-0">
                  <strong className="text-sm">Acesso demonstrativo</strong>
                  <p className="mt-1 text-xs leading-relaxed text-[#666]">
                    Use os dados abaixo para conhecer o portal. A autenticação segura será conectada ao backend antes do uso com documentos reais.
                  </p>
                  <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-[70px_1fr]">
                    <dt className="font-bold text-[#666]">E-mail</dt>
                    <dd className="break-all font-mono">{DEMO_CLIENT_EMAIL}</dd>
                    <dt className="font-bold text-[#666]">Senha</dt>
                    <dd className="font-mono">{DEMO_CLIENT_PASSWORD}</dd>
                  </dl>
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a6107] underline underline-offset-4 hover:text-black"
                  >
                    Preencher acesso demonstrativo
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-7 text-center text-xs text-[#777]">
              Precisa de ajuda? Fale com a equipe Space Light pelo WhatsApp.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
