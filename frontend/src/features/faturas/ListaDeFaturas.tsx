'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown, Download } from 'lucide-react';
import { BotaoDeIcone } from '@/components/ui/Botao';
import { formatarDataEmissao, formatarDataHora, formatarMoeda } from '@/lib/formato';
import { empresaDaFatura, emissaoIso, formatarConsumo, localDaFatura, type Fatura } from './fatura';
import type { Situacao } from './processamento';
import { SeloDeOrigem, SeloDeSituacao } from './Selos';

export interface LinhaDeFatura {
  fatura: Fatura;
  situacao: Situacao;
}

export type CampoDeOrdenacao = 'recebida' | 'empresa' | 'emissao' | 'consumo' | 'valor';

export interface Ordenacao {
  campo: CampoDeOrdenacao;
  direcao: 'asc' | 'desc';
}

const VALOR_PARA_ORDENAR: Record<CampoDeOrdenacao, (fatura: Fatura) => string | number> = {
  recebida: (fatura) => fatura.createdAt,
  empresa: (fatura) => `${empresaDaFatura(fatura)} ${localDaFatura(fatura)}`.toLowerCase(),
  emissao: (fatura) => emissaoIso(fatura.dataEmissao) ?? '',
  consumo: (fatura) => fatura.consumoKwh ?? -1,
  valor: (fatura) => fatura.valorFatura,
};

export function ordenarLinhas(linhas: LinhaDeFatura[], { campo, direcao }: Ordenacao) {
  const valor = VALOR_PARA_ORDENAR[campo];
  const sinal = direcao === 'asc' ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const x = valor(a.fatura);
    const y = valor(b.fatura);
    return (x < y ? -1 : x > y ? 1 : 0) * sinal;
  });
}

// Só faturas já lidas têm valor, consumo e emitente; as outras mostram o arquivo.
const foiLida = (situacao: Situacao) => situacao === 'concluida' || situacao === 'divergente';

interface TabelaProps {
  linhas: LinhaDeFatura[];
  ordenacao: Ordenacao;
  aoOrdenar: (campo: CampoDeOrdenacao) => void;
  aoAbrir: (fatura: Fatura) => void;
  aoBaixar: (fatura: Fatura) => void;
}

export function TabelaDeFaturas({ linhas, ordenacao, aoOrdenar, aoAbrir, aoBaixar }: TabelaProps) {
  const cabecalho = (campo: CampoDeOrdenacao, rotulo: string, numero = false) => (
    <CabecalhoOrdenavel campo={campo} rotulo={rotulo} ordenacao={ordenacao} aoOrdenar={aoOrdenar} numero={numero} />
  );

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="tabela">
          <thead>
            <tr>
              {cabecalho('empresa', 'Empresa / local')}
              <th>Emitente</th>
              <th>UC</th>
              {cabecalho('emissao', 'Emissão')}
              {cabecalho('consumo', 'Consumo', true)}
              {cabecalho('valor', 'Valor', true)}
              <th>Origem</th>
              <th>Situação</th>
              {cabecalho('recebida', 'Recebida')}
              <th>
                <span className="sr-only">Arquivo</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ fatura, situacao }) => {
              const lida = foiLida(situacao);
              return (
                <tr
                  key={fatura.id}
                  onClick={() => aoAbrir(fatura)}
                  onKeyDown={(evento) => evento.key === 'Enter' && aoAbrir(fatura)}
                  tabIndex={0}
                  className="cursor-pointer"
                >
                  <td>
                    <span className="block max-w-[220px] truncate font-semibold text-graphite" title={empresaDaFatura(fatura)}>
                      {empresaDaFatura(fatura) || '—'}
                    </span>
                    <span className="block max-w-[220px] truncate text-xs text-muted" title={localDaFatura(fatura)}>
                      {localDaFatura(fatura) || '—'}
                    </span>
                  </td>
                  <td>
                    {lida ? (
                      <>
                        <span className="block max-w-[200px] truncate text-graphite/90" title={fatura.emitente ?? ''}>
                          {fatura.emitente || '—'}
                        </span>
                        <span className="block font-mono text-xs text-muted">
                          {fatura.faturaNumber ? `Nº ${fatura.faturaNumber}` : '—'}
                        </span>
                      </>
                    ) : (
                      <span className="block max-w-[200px] truncate text-xs text-muted" title={fatura.xmlFileName ?? ''}>
                        {fatura.xmlFileName || '—'}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap font-mono text-xs text-graphite/90">{fatura.numeroUc || '—'}</td>
                  <td className="whitespace-nowrap tabular-nums text-graphite/90">
                    {formatarDataEmissao(fatura.dataEmissao)}
                    {fatura.mesReferencia && <span className="block text-xs text-muted">Ref. {fatura.mesReferencia}</span>}
                  </td>
                  <td className="numero text-graphite/90">{lida ? formatarConsumo(fatura.consumoKwh) : '—'}</td>
                  <td className="numero font-semibold text-white">{lida ? formatarMoeda(fatura.valorFatura) : '—'}</td>
                  <td>
                    <SeloDeOrigem fatura={fatura} />
                  </td>
                  <td>
                    <SeloDeSituacao situacao={situacao} />
                  </td>
                  <td className="whitespace-nowrap text-xs tabular-nums text-muted">{formatarDataHora(fatura.createdAt)}</td>
                  <td className="w-px" onClick={(evento) => evento.stopPropagation()}>
                    {fatura.filePath && (
                      <BotaoDeIcone icone={Download} rotulo="Baixar arquivo original" onClick={() => aoBaixar(fatura)} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* No celular a tabela vira uma lista de duas linhas por fatura. */}
      <ul className="divide-y divide-hairline md:hidden">
        {linhas.map(({ fatura, situacao }) => (
          <li key={fatura.id}>
            <button type="button" onClick={() => aoAbrir(fatura)} className="w-full px-4 py-3 text-left hover:bg-raised/50">
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-graphite">{empresaDaFatura(fatura) || '—'}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {foiLida(situacao) ? formatarMoeda(fatura.valorFatura) : '—'}
                </span>
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
                <span className="min-w-0 truncate">
                  {[localDaFatura(fatura), fatura.mesReferencia && `Ref. ${fatura.mesReferencia}`].filter(Boolean).join(' · ') ||
                    '—'}
                </span>
                <SeloDeSituacao situacao={situacao} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

interface CabecalhoOrdenavelProps {
  campo: CampoDeOrdenacao;
  rotulo: string;
  ordenacao: Ordenacao;
  aoOrdenar: (campo: CampoDeOrdenacao) => void;
  numero?: boolean;
}

function CabecalhoOrdenavel({ campo, rotulo, ordenacao, aoOrdenar, numero = false }: CabecalhoOrdenavelProps) {
  const ativo = ordenacao.campo === campo;
  const Icone = !ativo ? ChevronsUpDown : ordenacao.direcao === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={numero ? 'text-right' : undefined}
      aria-sort={ativo ? (ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(campo)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-white ${ativo ? 'text-graphite' : ''}`}
      >
        {rotulo}
        <Icone className={`h-3 w-3 ${ativo ? 'text-tech' : 'opacity-50'}`} aria-hidden="true" />
      </button>
    </th>
  );
}
