'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';

interface FiltroSuspensoProps {
  icone: LucideIcon;
  /** Texto da opção que não filtra nada (ex: "Todas as empresas"). */
  rotuloTodos: string;
  opcoes: string[];
  /** Opção escolhida; `null` quando não há filtro. */
  valor: string | null;
  aoMudar: (valor: string | null) => void;
}

/** Botão de filtro com lista suspensa de uma escolha só. */
export function FiltroSuspenso({ icone: Icone, rotuloTodos, opcoes, valor, aoMudar }: FiltroSuspensoProps) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

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

  const escolher = (novo: string | null) => {
    aoMudar(novo);
    setAberto(false);
  };

  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={`flex h-9 max-w-[260px] items-center gap-2 rounded-control border px-3 text-[13px] font-medium transition-colors ${
          valor ? 'border-tech/40 bg-tech/10 text-tech-100' : 'border-hairline bg-surface text-graphite hover:bg-raised'
        }`}
      >
        <Icone className={`h-4 w-4 shrink-0 ${valor ? 'text-tech' : 'text-muted'}`} aria-hidden="true" />
        <span className="truncate">{valor ?? rotuloTodos}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <ul
          role="listbox"
          className="animate-rise absolute left-0 top-full z-50 mt-1.5 max-h-72 w-72 overflow-y-auto rounded-card bg-raised p-1 shadow-lift"
        >
          {[null, ...opcoes].map((opcao) => {
            const selecionada = opcao === valor;
            return (
              <li key={opcao ?? '__todos__'} role="option" aria-selected={selecionada}>
                <button
                  type="button"
                  onClick={() => escolher(opcao)}
                  className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                    selecionada ? 'bg-tech/15 text-tech-100' : 'text-graphite hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="truncate">{opcao ?? rotuloTodos}</span>
                  {selecionada && <Check className="h-4 w-4 shrink-0 text-tech" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
