import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, type LucideIcon } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function CarregandoPagina({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-2 text-muted" role="status">
      <Spinner />
      <span className="text-sm">{rotulo}…</span>
    </div>
  );
}

/** Carregamento dentro de um card ou de uma área da página. */
export function CarregandoArea({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex justify-center py-20 text-muted" role="status" aria-label={rotulo}>
      <Spinner className="h-7 w-7" />
    </div>
  );
}

const ESTILOS_DE_AVISO = {
  erro: { caixa: 'border-danger/30 bg-danger/12 text-red-200', icone: AlertCircle },
  sucesso: { caixa: 'border-success/30 bg-success/12 text-emerald-200', icone: CheckCircle2 },
  info: { caixa: 'border-tech/30 bg-tech/10 text-tech-100', icone: Info },
  alerta: { caixa: 'border-amber/35 bg-amber/10 text-amber', icone: AlertTriangle },
};

interface AvisoProps {
  tipo?: keyof typeof ESTILOS_DE_AVISO;
  children: ReactNode;
  className?: string;
}

export function Aviso({ tipo = 'info', children, className = '' }: AvisoProps) {
  const { caixa, icone: Icone } = ESTILOS_DE_AVISO[tipo];

  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-control border px-3.5 py-2.5 text-[13px] font-medium leading-relaxed ${caixa} ${className}`}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 whitespace-pre-line">{children}</span>
    </div>
  );
}

interface EstadoVazioProps {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}

export function EstadoVazio({ icone: Icone, titulo, descricao, children }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="rounded-card border border-hairline bg-deep p-3 text-muted">
        <Icone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-graphite">{titulo}</p>
        {descricao && <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}

export const TONS_DE_SELO = {
  neutro: 'bg-white/[0.06] text-muted',
  tech: 'bg-tech/12 text-tech-100',
  sucesso: 'bg-success/12 text-emerald-200',
  alerta: 'bg-amber/12 text-amber',
  perigo: 'bg-danger/15 text-danger-200',
};

export type TomDeSelo = keyof typeof TONS_DE_SELO;

interface SeloProps {
  tom?: TomDeSelo;
  icone?: LucideIcon;
  /** Bolinha colorida à esquerda, para status. */
  ponto?: boolean;
  children: ReactNode;
}

const CORES_DO_PONTO: Record<TomDeSelo, string> = {
  neutro: 'bg-muted',
  tech: 'bg-tech',
  sucesso: 'bg-success',
  alerta: 'bg-amber',
  perigo: 'bg-danger-200',
};

export function Selo({ tom = 'neutro', icone: Icone, ponto = false, children }: SeloProps) {
  return (
    <span className={`pill ${TONS_DE_SELO[tom]}`}>
      {ponto && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CORES_DO_PONTO[tom]}`} aria-hidden="true" />}
      {Icone && <Icone className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}
