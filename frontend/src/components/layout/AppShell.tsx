'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  House,
  Link2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { encerrarSessao, useUsuario, type UsuarioDaSessao } from '@/lib/sessao';
import { iniciais, primeiroNome } from '@/lib/formato';

const CHAVE_RECOLHIDA = 'ehs:menu-recolhido';

interface ItemDoMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Casa só com o caminho exato (a página inicial é prefixo de todas as outras). */
  exato?: boolean;
  somenteAdmin?: boolean;
}

const ITENS_DO_MENU: ItemDoMenu[] = [
  { href: '/hub', rotulo: 'Início', icone: House, exato: true },
  { href: '/hub/invoices', rotulo: 'Faturas', icone: FileText },
  { href: '/hub/links', rotulo: 'Links de coleta', icone: Link2, somenteAdmin: true },
  { href: '/hub/users', rotulo: 'Usuários', icone: Users, somenteAdmin: true },
];

const PAPEIS: Record<string, string> = {
  ADMIN: 'Administrador',
  REVIEWER: 'Revisor',
  USER: 'EHS',
};

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDA) === '1';
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  // O shell só é montado no navegador, depois de conferida a sessão: dá para ler o storage direto.
  const [recolhida, setRecolhida] = useState(lerPreferencia);
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();

  function alternar() {
    setRecolhida((atual) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, atual ? '0' : '1');
      } catch {
        // Sem storage (aba anônima bloqueada): só não lembra a escolha.
      }
      return !atual;
    });
  }

  function sair() {
    encerrarSessao();
    router.push('/login');
  }

  const itens = ITENS_DO_MENU.filter((item) => !item.somenteAdmin || usuario?.role === 'ADMIN');

  return (
    <div className="scheme-dark flex min-h-dvh">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-hairline bg-surface/70 transition-[width] duration-300 ease-out lg:block ${
          recolhida ? 'w-[76px]' : 'w-[264px]'
        }`}
      >
        <BarraLateral itens={itens} pathname={pathname} recolhida={recolhida} aoAlternar={alternar} aoSair={sair} />
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-surgir absolute inset-0 bg-night/75 backdrop-blur-[2px]"
            onClick={() => setMenuAberto(false)}
          />
          <div className="animate-deslizar absolute inset-y-0 left-0 w-[280px] bg-surface shadow-lift">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-xl p-1.5 text-muted hover:bg-raised hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <BarraLateral
              itens={itens}
              pathname={pathname}
              recolhida={false}
              aoSair={sair}
              aoNavegar={() => setMenuAberto(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Cabecalho usuario={usuario} aoAbrirMenu={() => setMenuAberto(true)} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface BarraLateralProps {
  itens: ItemDoMenu[];
  pathname: string;
  recolhida: boolean;
  aoAlternar?: () => void;
  aoSair: () => void;
  /** No celular, navegar fecha o menu. */
  aoNavegar?: () => void;
}

function BarraLateral({ itens, pathname, recolhida, aoAlternar, aoSair, aoNavegar }: BarraLateralProps) {
  return (
    <nav className="flex h-full flex-col px-3 py-4" aria-label="Menu principal">
      <div className={`flex h-12 items-center gap-2.5 px-1.5 ${recolhida ? 'justify-center' : ''}`}>
        <Image src="/logo_da_jamile.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" priority />
        {!recolhida && (
          <span className="leading-none">
            <span className="block text-[19px] font-extrabold tracking-[-0.02em] text-white">
              EHS <span className="text-tech">Hub</span>
            </span>
            <span className="mt-1 block text-xs text-muted">Conasa</span>
          </span>
        )}
      </div>

      <ul className="mt-8 space-y-1">
        {itens.map((item) => {
          const ativo = item.exato ? pathname === item.href : pathname.startsWith(item.href);
          const Icone = item.icone;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={aoNavegar}
                title={recolhida ? item.rotulo : undefined}
                aria-label={recolhida ? item.rotulo : undefined}
                aria-current={ativo ? 'page' : undefined}
                className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-150 ${
                  recolhida ? 'justify-center' : ''
                } ${
                  ativo
                    ? 'bg-ink font-semibold text-white shadow-soft'
                    : 'font-medium text-graphite/85 hover:bg-raised hover:text-white'
                }`}
              >
                <Icone
                  className={`h-[19px] w-[19px] shrink-0 ${
                    ativo ? 'text-tech' : 'text-muted transition-colors group-hover:text-white'
                  }`}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                {!recolhida && <span className="truncate">{item.rotulo}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-1 border-t border-hairline pt-3">
        {aoAlternar && (
          <BotaoDoMenu
            icone={recolhida ? PanelLeftOpen : PanelLeftClose}
            rotulo={recolhida ? 'Expandir menu' : 'Recolher menu'}
            recolhida={recolhida}
            onClick={aoAlternar}
            aria-expanded={!recolhida}
          />
        )}
        <BotaoDoMenu icone={LogOut} rotulo="Sair" recolhida={recolhida} onClick={aoSair} perigo />
      </div>
    </nav>
  );
}

interface BotaoDoMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icone: LucideIcon;
  rotulo: string;
  recolhida: boolean;
  perigo?: boolean;
}

function BotaoDoMenu({ icone: Icone, rotulo, recolhida, perigo, ...rest }: BotaoDoMenuProps) {
  return (
    <button
      type="button"
      title={recolhida ? rotulo : undefined}
      aria-label={recolhida ? rotulo : undefined}
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
        recolhida ? 'justify-center' : ''
      } ${
        perigo ? 'text-muted hover:bg-danger/15 hover:text-red-200' : 'text-muted hover:bg-raised hover:text-white'
      }`}
      {...rest}
    >
      <Icone className="h-[19px] w-[19px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
      {!recolhida && <span className="truncate">{rotulo}</span>}
    </button>
  );
}

function Cabecalho({ usuario, aoAbrirMenu }: { usuario: UsuarioDaSessao | null; aoAbrirMenu: () => void }) {
  const nomeCompleto = usuario?.name || usuario?.email || '';
  const nome = primeiroNome(nomeCompleto);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ground/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={aoAbrirMenu}
          className="-ml-1 rounded-xl p-2 text-muted transition-colors hover:bg-raised hover:text-white lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <p className="truncate text-[17px] font-semibold text-white">
          Olá{nome && ','} <span className="text-tech">{nome}</span>
        </p>

        {usuario && (
          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block max-w-[220px] truncate text-sm font-semibold text-graphite">{nomeCompleto}</span>
              <span className="block text-xs text-muted">{PAPEIS[usuario.role ?? ''] ?? 'Usuário'}</span>
            </span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-tech/15 text-[13px] font-bold text-tech-100 ring-1 ring-tech/25"
              aria-hidden="true"
            >
              {iniciais(nomeCompleto)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
