import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface IndicadorProps {
  rotulo: string;
  valor: ReactNode;
  icone: LucideIcon;
  /** Linha de apoio: comparação, período ou contexto do número. */
  rodape?: ReactNode;
  destaque?: 'tech' | 'alerta' | 'perigo';
  onClick?: () => void;
}

const CORES_DO_ICONE = {
  tech: 'text-tech',
  alerta: 'text-amber',
  perigo: 'text-danger-200',
};

/** Número-chave do painel. Com `onClick`, vira atalho para a lista filtrada. */
export function Indicador({ rotulo, valor, icone: Icone, rodape, destaque = 'tech', onClick }: IndicadorProps) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{rotulo}</span>
        <Icone className={`h-4 w-4 shrink-0 ${CORES_DO_ICONE[destaque]}`} strokeWidth={2} aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight text-white">{valor}</p>
      {rodape && <div className="mt-1 truncate text-xs text-muted">{rodape}</div>}
    </>
  );

  if (!onClick) return <div className="card p-4">{conteudo}</div>;

  return (
    <button type="button" onClick={onClick} className="card p-4 text-left transition-colors hover:bg-raised">
      {conteudo}
    </button>
  );
}
