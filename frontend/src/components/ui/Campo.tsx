'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

const CONTROLE =
  'w-full rounded-control border border-hairline bg-ground/60 px-3.5 py-2.5 text-sm text-graphite transition-colors placeholder:text-muted/60 focus:border-tech focus:outline-none focus:ring-4 focus:ring-tech/10 disabled:cursor-not-allowed disabled:opacity-50';

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
        <span id={`${id}-dica`} className="mt-1.5 block text-[13px] text-muted">
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
