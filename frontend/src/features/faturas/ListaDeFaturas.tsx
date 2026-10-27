'use client';

import { AlertTriangle, Building2, Calendar, Download, Pencil, Trash2, User } from 'lucide-react';
import { BotaoDeIcone } from '@/components/ui/Botao';
import { formatarDataEmissao, formatarDataHora, formatarMoeda } from '@/lib/formato';
import { ROTULOS_DE_ORIGEM, empresaDaFatura, formatarConsumo, localDaFatura, type Fatura } from './fatura';

export interface AcoesDaLista {
  /** Faturas com erro ou paradas no processamento. */
  comProblema: (fatura: Fatura) => boolean;
  aoAbrir: (fatura: Fatura) => void;
  aoEditar: (fatura: Fatura) => void;
  aoExcluir: (fatura: Fatura) => void;
  aoBaixar: (fatura: Fatura) => void;
}

interface ListaProps extends AcoesDaLista {
  faturas: Fatura[];
}

function SeloDeProblema({ fatura }: { fatura: Fatura }) {
  return (
    <span className="pill bg-danger/15 text-danger-200">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {fatura.status === 'ERRO_PROCESSAMENTO' ? 'Erro no processamento' : 'Processamento parado'}
    </span>
  );
}

export function SeloDeOrigem({ fatura }: { fatura: Fatura }) {
  const protheus = fatura.origem === 'PROTHEUS';
  return (
    <span className={`pill ${protheus ? 'bg-tech/15 text-tech-100' : 'bg-white/[0.06] text-muted'}`}>
      {protheus ? ROTULOS_DE_ORIGEM.PROTHEUS : 'Link'}
    </span>
  );
}

// As ações ficam dentro de uma linha/cartão clicável: o clique nelas não deve abrir a fatura.
function Acoes({ fatura, aoEditar, aoExcluir, aoBaixar }: { fatura: Fatura } & Omit<AcoesDaLista, 'comProblema' | 'aoAbrir'>) {
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(evento) => evento.stopPropagation()}>
      {fatura.filePath && (
        <BotaoDeIcone icone={Download} rotulo="Baixar arquivo original" variante="tech" onClick={() => aoBaixar(fatura)} />
      )}
      <BotaoDeIcone icone={Pencil} rotulo="Editar fatura" onClick={() => aoEditar(fatura)} />
      <BotaoDeIcone icone={Trash2} rotulo="Excluir fatura" variante="perigo" onClick={() => aoExcluir(fatura)} />
    </div>
  );
}

export function TabelaDeFaturas({ faturas, comProblema, aoAbrir, ...acoes }: ListaProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-[12.5px] text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Empresa</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Emitente</th>
              <th className="px-4 py-3 font-semibold">UC</th>
              <th className="px-4 py-3 font-semibold">Emissão</th>
              <th className="px-4 py-3 text-right font-semibold">Consumo</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-5 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {faturas.map((fatura) => {
              const problema = comProblema(fatura);
              return (
                <tr
                  key={fatura.id}
                  onClick={() => aoAbrir(fatura)}
                  className={`cursor-pointer transition-colors hover:bg-raised/50 ${problema ? 'bg-danger/[0.06]' : ''}`}
                >
                  <td className="px-5 py-3">
                    <span className="block max-w-[220px] truncate font-semibold text-graphite" title={empresaDaFatura(fatura)}>
                      {empresaDaFatura(fatura) || '—'}
                    </span>
                    <span className="block max-w-[220px] truncate text-xs text-muted" title={localDaFatura(fatura)}>
                      {localDaFatura(fatura) || '—'}
                    </span>
                    {problema && (
                      <span className="mt-1 block">
                        <SeloDeProblema fatura={fatura} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SeloDeOrigem fatura={fatura} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[220px] truncate text-graphite/90" title={fatura.emitente ?? ''}>
                      {fatura.emitente || '—'}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      {fatura.faturaNumber ? `Nº ${fatura.faturaNumber}` : '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-graphite/90">
                    {fatura.numeroUc || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                    {formatarDataEmissao(fatura.dataEmissao)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-tech-100">
                    {formatarConsumo(fatura.consumoKwh)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-emerald-300">
                    {formatarMoeda(fatura.valorFatura)}
                  </td>
                  <td className="px-5 py-3">
                    <Acoes fatura={fatura} {...acoes} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GradeDeFaturas({ faturas, comProblema, aoAbrir, ...acoes }: ListaProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {faturas.map((fatura) => {
        const problema = comProblema(fatura);
        return (
          <article
            key={fatura.id}
            onClick={() => aoAbrir(fatura)}
            className={`card flex cursor-pointer flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
              problema ? 'ring-1 ring-danger/50' : ''
            }`}
          >
            <header className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  problema ? 'bg-danger/15 text-danger-200' : 'bg-tech/12 text-tech-100'
                }`}
              >
                {problema ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Building2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-white" title={empresaDaFatura(fatura)}>
                  {empresaDaFatura(fatura) || '—'}
                </h3>
                <p className="truncate text-[13px] text-muted">{localDaFatura(fatura) || 'Local não especificado'}</p>
              </div>
              <SeloDeOrigem fatura={fatura} />
            </header>

            {problema && (
              <div className="mt-3">
                <SeloDeProblema fatura={fatura} />
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2 min-w-0">
                <dt className="text-xs text-muted">Emitente</dt>
                <dd className="truncate font-medium text-graphite" title={fatura.emitente ?? ''}>
                  {fatura.emitente || '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted">Nº da fatura</dt>
                <dd className="truncate font-mono text-[13px] text-graphite">{fatura.faturaNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Emissão</dt>
                <dd className="tabular-nums text-graphite">{formatarDataEmissao(fatura.dataEmissao)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Valor</dt>
                <dd className="text-base font-bold tabular-nums text-emerald-300">{formatarMoeda(fatura.valorFatura)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Consumo</dt>
                <dd className="text-base font-bold tabular-nums text-tech-100">{formatarConsumo(fatura.consumoKwh)}</dd>
              </div>
            </dl>

            <footer className="mt-4 flex items-center gap-3 border-t border-hairline pt-3.5">
              <div className="min-w-0 flex-1 space-y-0.5 text-xs text-muted">
                <p className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{fatura.senderName}</span>
                </p>
                <p className="flex items-center gap-1.5 tabular-nums">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formatarDataHora(fatura.createdAt)}
                </p>
              </div>
              <Acoes fatura={fatura} {...acoes} />
            </footer>
          </article>
        );
      })}
    </div>
  );
}
