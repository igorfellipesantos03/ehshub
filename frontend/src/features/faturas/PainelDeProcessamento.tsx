'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Aviso, Selo } from '@/components/ui/Feedback';
import { empresaDaFatura, localDaFatura, type Fatura } from './fatura';
import { formatarEspera, type SituacaoDoProcessamento } from './processamento';
import { SeloDeOrigem } from './Selos';

interface PainelProps {
  situacao: SituacaoDoProcessamento;
  agora: Date;
  /** Já começa com a fila à mostra (no Painel); na lista de faturas começa recolhido. */
  abertoDeInicio?: boolean;
}

// Mostra o que o n8n está processando e o que ainda espera na fila.
export function PainelDeProcessamento({ situacao, agora, abertoDeInicio = false }: PainelProps) {
  const [aberto, setAberto] = useState(abertoDeInicio);
  const { emAndamento, naFila, filaParadaHa } = situacao;

  if (emAndamento.length === 0 && naFila.length === 0) return null;

  const parada = filaParadaHa !== null;

  return (
    <section className="card overflow-hidden" aria-label="Faturas em processamento">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/50"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {!parada && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tech opacity-60" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${parada ? 'bg-danger-200' : 'bg-tech'}`} />
        </span>
        <h2 className="titulo-secao">Processamento</h2>
        <span className="flex flex-wrap items-center gap-1.5" aria-live="polite">
          {emAndamento.length > 0 && <Selo tom="tech">{emAndamento.length} em andamento</Selo>}
          {naFila.length > 0 && <Selo>{naFila.length} na fila</Selo>}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-muted">
          {aberto ? 'Ocultar' : 'Ver fila'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {parada && (
        <Aviso tipo="erro" className="mx-4 mb-3">
          A fila não anda há {filaParadaHa} min. Confira se o fluxo de processamento do n8n está ativo.
        </Aviso>
      )}

      {aberto && (
        <ol className="divide-y divide-hairline border-t border-hairline">
          {emAndamento.map((fatura) => (
            <ItemDaFila
              key={fatura.id}
              fatura={fatura}
              situacao={`Processando há ${formatarEspera(fatura.processamentoIniciadoEm as string, agora)}`}
              destaque
            />
          ))}
          {naFila.map((fatura, indice) => (
            <ItemDaFila
              key={fatura.id}
              fatura={fatura}
              situacao={`${indice + 1}º na fila · aguardando há ${formatarEspera(fatura.createdAt, agora)}`}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ItemDaFila({ fatura, situacao, destaque = false }: { fatura: Fatura; situacao: string; destaque?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-graphite" title={fatura.xmlFileName ?? ''}>
          {fatura.xmlFileName || 'Arquivo sem nome'}
        </p>
        <p className="truncate text-xs text-muted">
          {[empresaDaFatura(fatura), localDaFatura(fatura)].filter(Boolean).join(' · ') || 'Empresa não informada'}
        </p>
      </div>
      <SeloDeOrigem fatura={fatura} />
      <span className={`text-xs tabular-nums ${destaque ? 'font-semibold text-tech-100' : 'text-muted'}`}>{situacao}</span>
    </li>
  );
}
