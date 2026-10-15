import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, type LucideIcon } from 'lucide-react';

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

const ESTILOS_DE_AVISO = {
  erro: { caixa: 'border-danger/30 bg-danger/15 text-red-200', icone: AlertCircle },
  sucesso: { caixa: 'border-success/30 bg-success/15 text-emerald-200', icone: CheckCircle2 },
  info: { caixa: 'border-tech/30 bg-tech/10 text-tech-100', icone: Info },
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
      className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-[13.5px] font-medium leading-relaxed ${caixa} ${className}`}
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
      <span className="rounded-2xl bg-tech/12 p-3.5 text-tech-100">
        <Icone className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold text-graphite">{titulo}</p>
        {descricao && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}
