'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  FileText,
  KeyRound,
  LayoutDashboard,
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
import { iniciais } from '@/lib/formato';
import { useTempoReal } from '@/lib/tempoReal';
import { useFaturas } from '@/features/faturas/useFaturas';
import { ModalVincularProtheus } from '@/features/login/ModalVincularProtheus';

const CHAVE_RECOLHIDA = 'ehs:menu-recolhido';

interface ItemDoMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Casa só com o caminho exato (o painel é prefixo de todas as outras). */
  exato?: boolean;
  somenteAdmin?: boolean;
}

const SECOES_DO_MENU: { titulo: string; itens: ItemDoMenu[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/hub', rotulo: 'Painel', icone: LayoutDashboard, exato: true },
      { href: '/hub/invoices', rotulo: 'Faturas', icone: FileText, somenteAdmin: true },
    ],
  },
  {
    titulo: 'Coleta',
    itens: [{ href: '/hub/links', rotulo: 'Links de coleta', icone: Link2, somenteAdmin: true }],
  },
  {
    titulo: 'Administração',
    itens: [{ href: '/hub/users', rotulo: 'Usuários', icone: Users, somenteAdmin: true }],
  },
];

const PAPEIS: Record<string, string> = {
  ADMIN: 'Administrador',
  REVIEWER: 'Revisor',
  USER: 'EHS',
};

const itemAtivo = (item: ItemDoMenu, pathname: string) =>
  item.exato ? pathname === item.href : pathname.startsWith(item.href);

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
  const [vinculando, setVinculando] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();
  const admin = usuario?.role === 'ADMIN';

  useTempoReal(admin);

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

  const secoes = SECOES_DO_MENU.map((secao) => ({
    ...secao,
    itens: secao.itens.filter((item) => !item.somenteAdmin || admin),
  })).filter((secao) => secao.itens.length > 0);

  const paginaAtual = secoes.flatMap((secao) => secao.itens).find((item) => itemAtivo(item, pathname));

  return (
    <div className="flex min-h-dvh">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-hairline bg-surface/60 transition-[width] duration-300 ease-out lg:block ${
          recolhida ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <BarraLateral secoes={secoes} pathname={pathname} recolhida={recolhida} aoAlternar={alternar} />
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-surgir absolute inset-0 bg-night/75 backdrop-blur-[2px]" onClick={() => setMenuAberto(false)} />
          <div className="animate-deslizar absolute inset-y-0 left-0 w-[260px] bg-surface shadow-lift">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3.5 rounded-control p-1.5 text-muted hover:bg-raised hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <BarraLateral secoes={secoes} pathname={pathname} recolhida={false} aoNavegar={() => setMenuAberto(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-ground/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="-ml-1 rounded-control p-2 text-muted transition-colors hover:bg-raised hover:text-white lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="hidden text-muted sm:inline">EHS Hub</span>
              <span className="hidden text-hairline sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-white">{paginaAtual?.rotulo ?? 'Painel'}</span>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {admin && <IndicadorDaFila />}
              {usuario && <MenuDoUsuario usuario={usuario} aoVincular={() => setVinculando(true)} aoSair={sair} />}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      {vinculando && <ModalVincularProtheus aoFechar={() => setVinculando(false)} />}
    </div>
  );
}

interface BarraLateralProps {
  secoes: { titulo: string; itens: ItemDoMenu[] }[];
  pathname: string;
  recolhida: boolean;
  aoAlternar?: () => void;
  /** No celular, navegar fecha o menu. */
  aoNavegar?: () => void;
}

function BarraLateral({ secoes, pathname, recolhida, aoAlternar, aoNavegar }: BarraLateralProps) {
  return (
    <nav className="flex h-full flex-col px-3 py-3" aria-label="Menu principal">
      <Link
        href="/hub"
        onClick={aoNavegar}
        className={`flex h-10 items-center gap-2.5 rounded-control px-1.5 ${recolhida ? 'justify-center' : ''}`}
      >
        <Image src="/logo_da_jamile.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
        {!recolhida && (
          <span className="leading-none">
            <span className="block text-base font-extrabold tracking-[-0.02em] text-white">
              EHS <span className="text-tech">Hub</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted">Central de faturas · Conasa</span>
          </span>
        )}
      </Link>

      <div className="mt-6 space-y-5">
        {secoes.map((secao) => (
          <div key={secao.titulo}>
            {recolhida ? (
              <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-3 text-[11px] font-semibold text-ink-400">{secao.titulo}</p>
            )}
            <ul className="space-y-0.5">
              {secao.itens.map((item) => {
                const ativo = itemAtivo(item, pathname);
                const Icone = item.icone;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={aoNavegar}
                      title={recolhida ? item.rotulo : undefined}
                      aria-label={recolhida ? item.rotulo : undefined}
                      aria-current={ativo ? 'page' : undefined}
                      className={`group relative flex h-9 items-center gap-3 rounded-control px-3 text-[13px] transition-colors duration-150 ${
                        recolhida ? 'justify-center' : ''
                      } ${ativo ? 'bg-raised font-semibold text-white' : 'font-medium text-graphite/80 hover:bg-raised/60 hover:text-white'}`}
                    >
                      {ativo && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-tech" aria-hidden="true" />}
                      <Icone
                        className={`h-[18px] w-[18px] shrink-0 ${ativo ? 'text-tech' : 'text-muted transition-colors group-hover:text-white'}`}
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      {!recolhida && <span className="truncate">{item.rotulo}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {aoAlternar && (
        <div className="mt-auto border-t border-hairline pt-2">
          <button
            type="button"
            onClick={aoAlternar}
            aria-expanded={!recolhida}
            title={recolhida ? 'Expandir menu' : undefined}
            aria-label={recolhida ? 'Expandir menu' : undefined}
            className={`flex h-9 w-full items-center gap-3 rounded-control px-3 text-[13px] font-medium text-muted transition-colors hover:bg-raised hover:text-white ${
              recolhida ? 'justify-center' : ''
            }`}
          >
            {recolhida ? (
              <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
            )}
            {!recolhida && 'Recolher menu'}
          </button>
        </div>
      )}
    </nav>
  );
}

/** Situação da fila do n8n, visível de qualquer tela. Leva para as faturas. */
function IndicadorDaFila() {
  const { processamento } = useFaturas();
  const { emAndamento, naFila, filaParadaHa } = processamento;
  const total = emAndamento.length + naFila.length;

  if (total === 0) return null;

  const parada = filaParadaHa !== null;

  return (
    <Link
      href="/hub/invoices"
      title={parada ? `A fila não anda há ${filaParadaHa} min` : 'Faturas sendo lidas pelo n8n'}
      className={`hidden h-8 items-center gap-2 rounded-control border px-2.5 text-xs font-semibold transition-colors sm:flex ${
        parada
          ? 'border-danger/40 bg-danger/10 text-danger-200 hover:bg-danger/20'
          : 'border-tech/30 bg-tech/10 text-tech-100 hover:bg-tech/20'
      }`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {!parada && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tech opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${parada ? 'bg-danger-200' : 'bg-tech'}`} />
      </span>
      <span className="tabular-nums">
        {parada ? 'Fila parada' : `${total} em processamento`}
      </span>
    </Link>
  );
}

interface MenuDoUsuarioProps {
  usuario: UsuarioDaSessao;
  aoVincular: () => void;
  aoSair: () => void;
}

function MenuDoUsuario({ usuario, aoVincular, aoSair }: MenuDoUsuarioProps) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const nome = usuario.name || usuario.email || '';
  const papel = PAPEIS[usuario.role ?? ''] ?? 'Usuário';

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!caixaRef.current?.contains(evento.target as Node)) setAberto(false);
    };
    const aoTeclar = (evento: KeyboardEvent) => evento.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="flex h-9 items-center gap-2.5 rounded-control pl-1 pr-2 transition-colors hover:bg-raised"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-tech/15 text-[11px] font-bold text-tech-100 ring-1 ring-tech/25"
          aria-hidden="true"
        >
          {iniciais(nome)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[180px] truncate text-[13px] font-semibold text-graphite">{nome}</span>
          <span className="block text-[11px] text-muted">{papel}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {aberto && (
        <div role="menu" className="animate-rise absolute right-0 top-full z-50 mt-1.5 w-64 rounded-card bg-raised p-1 shadow-lift">
          <div className="border-b border-hairline px-3 py-2.5 md:hidden">
            <p className="truncate text-[13px] font-semibold text-white">{nome}</p>
            <p className="text-xs text-muted">{papel}</p>
          </div>
          {!usuario.protheusLinked && (
            <ItemDoMenuDoUsuario
              icone={KeyRound}
              onClick={() => {
                setAberto(false);
                aoVincular();
              }}
            >
              Vincular usuário do Protheus
            </ItemDoMenuDoUsuario>
          )}
          <ItemDoMenuDoUsuario icone={LogOut} onClick={aoSair} perigo>
            Sair
          </ItemDoMenuDoUsuario>
        </div>
      )}
    </div>
  );
}

interface ItemDoMenuDoUsuarioProps {
  icone: LucideIcon;
  onClick: () => void;
  perigo?: boolean;
  children: ReactNode;
}

function ItemDoMenuDoUsuario({ icone: Icone, onClick, perigo = false, children }: ItemDoMenuDoUsuarioProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-[13px] font-medium transition-colors ${
        perigo ? 'text-graphite hover:bg-danger/15 hover:text-red-200' : 'text-graphite hover:bg-white/[0.06]'
      }`}
    >
      <Icone className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      {children}
    </button>
  );
}
