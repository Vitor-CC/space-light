'use client';

import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { href: '#sobre', label: 'A Space Light' },
  { href: '#treinamentos', label: 'Treinamentos' },
  { href: '#metodo', label: 'Como fazemos' },
  { href: '#contato', label: 'Contato' },
  { href: '/cliente/login', label: 'Área do Cliente' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center border border-white/20 text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div className="fixed inset-x-0 top-[76px] z-40 max-h-[calc(100vh-76px)] overflow-y-auto border-b border-white/10 bg-black/95 backdrop-blur-xl">
          <nav aria-label="Navegação mobile" className="page-shell flex flex-col py-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-4 text-sm font-extrabold uppercase tracking-[0.1em] text-white/80 hover:text-[#f2ad19]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contato"
              onClick={() => setOpen(false)}
              className="mt-4 mb-2 inline-flex h-12 items-center justify-center gap-2 bg-[#f2ad19] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-black hover:bg-[#ff9900]"
            >
              Solicitar proposta <ArrowUpRight className="size-4" />
            </a>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
