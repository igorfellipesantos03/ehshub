import type { ReactNode } from 'react';

interface CabecalhoDePaginaProps {
  titulo: string;
  descricao?: string;
  /** Ações da página, alinhadas à direita do título. */
  children?: ReactNode;
}

export function CabecalhoDePagina({ titulo, descricao, children }: CabecalhoDePaginaProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="titulo-pagina">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
