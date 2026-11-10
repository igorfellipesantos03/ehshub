'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

export const CONTROLE =
  'h-10 w-full rounded-control border border-hairline bg-ground/60 px-3 text-sm text-graphite transition-colors placeholder:text-muted/60 focus:border-tech focus:outline-none focus:ring-4 focus:ring-tech/10 disabled:cursor-not-allowed disabled:opacity-50';

interface CampoProps {
  id: string;
  rotulo: ReactNode;
  dica?: string;
  children: ReactNode;
}

/** Rótulo, controle e a linha de apoio. O rótulo aponta para o controle por `htmlFor`. */
export function Campo({ id, rotulo, dica, children }: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-graphite">
        {rotulo}
      </label>
      {children}
      {dica && (
        <span id={`${id}-dica`} className="mt-1.5 block text-xs text-muted">
          {dica}
        </span>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: ReactNode;
  dica?: string;
}

export function Input({ rotulo, dica, className = '', ...rest }: InputProps) {
  const id = useId();

  return (
    <Campo id={id} rotulo={rotulo} dica={dica}>
      <input
        id={id}
        className={`${CONTROLE} ${className}`}
        aria-describedby={dica ? `${id}-dica` : undefined}
        {...rest}
      />
    </Campo>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: ReactNode;
  dica?: string;
}

export function Select({ rotulo, dica, className = '', children, ...rest }: SelectProps) {
  const id = useId();

  return (
    <Campo id={id} rotulo={rotulo} dica={dica}>
      <select
        id={id}
        className={`${CONTROLE} ${className}`}
        aria-describedby={dica ? `${id}-dica` : undefined}
        {...rest}
      >
        {children}
      </select>
    </Campo>
  );
}

interface CampoDeBuscaProps {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
  className?: string;
}

/** Busca da barra de filtros, com o botão de limpar quando há texto. */
export function CampoDeBusca({ valor, aoMudar, placeholder, className = '' }: CampoDeBuscaProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${CONTROLE} h-9 pl-9 pr-8 text-[13px] [&::-webkit-search-cancel-button]:hidden`}
      />
      {valor && (
        <button
          type="button"
          onClick={() => aoMudar('')}
          aria-label="Limpar busca"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
