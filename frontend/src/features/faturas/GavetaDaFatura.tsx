'use client';

import type { ReactNode } from 'react';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { Gaveta } from '@/components/ui/Modal';
import { Botao } from '@/components/ui/Botao';
import { Aviso } from '@/components/ui/Feedback';
import { formatarDataEmissao, formatarDataHora, formatarMoeda } from '@/lib/formato';
import {
  GRUPOS_DE_DETALHE,
  divergenciasComProtheus,
  documentoProtheus,
  empresaDaFatura,
  formatarConsumo,
  formatarDetalhe,
  localDaFatura,
  temDetalhamento,
  type Fatura,
} from './fatura';
import { formatarEspera, type Situacao } from './processamento';
import { SeloDeOrigem, SeloDeSituacao } from './Selos';

interface GavetaDaFaturaProps {
  fatura: Fatura;
  situacao: Situacao;
  agora: Date;
  aoFechar: () => void;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoBaixar: () => void;
}

export function GavetaDaFatura({ fatura, situacao, agora, aoFechar, aoEditar, aoExcluir, aoBaixar }: GavetaDaFaturaProps) {
  const documento = documentoProtheus(fatura);
  const divergencias = divergenciasComProtheus(fatura);
  const lida = situacao === 'concluida' || situacao === 'divergente';

  return (
    <Gaveta
      titulo={empresaDaFatura(fatura) || 'Fatura'}
      descricao={localDaFatura(fatura) || 'Local não especificado'}
      aoFechar={aoFechar}
      faixa={
        <>
          <SeloDeSituacao situacao={situacao} />
          <SeloDeOrigem fatura={fatura} />
          {fatura.mesReferencia && <span className="text-xs text-muted">Referência {fatura.mesReferencia}</span>}
        </>
      }
      rodape={
        <>
          <Botao variante="alerta" icone={Trash2} onClick={aoExcluir} className="mr-auto">
            Excluir
          </Botao>
          {fatura.filePath && (
            <Botao icone={Download} onClick={aoBaixar}>
              Baixar arquivo
            </Botao>
          )}
          <Botao variante="primario" icone={Pencil} onClick={aoEditar}>
            Editar
          </Botao>
        </>
      }
    >
      <div className="space-y-6">
        <AvisoDaSituacao fatura={fatura} situacao={situacao} agora={agora} />

        {divergencias.length > 0 && (
          <Aviso tipo="alerta">
            Os dados extraídos não batem com o documento de entrada no Protheus.
            {'\n'}
            {divergencias.map((texto) => `• ${texto}`).join('\n')}
          </Aviso>
        )}

        {lida && (
          <div className="grid grid-cols-2 overflow-hidden rounded-card border border-hairline">
            <div className="bg-deep/60 px-4 py-3">
              <p className="eyebrow">Valor da fatura</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">{formatarMoeda(fatura.valorFatura)}</p>
            </div>
            <div className="border-l border-hairline bg-deep/60 px-4 py-3">
              <p className="eyebrow">Consumo total</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">{formatarConsumo(fatura.consumoKwh)}</p>
            </div>
          </div>
        )}

        <Secao titulo="Fatura">
          <Dado rotulo="Emitente" largo>
            {fatura.emitente || '—'}
          </Dado>
          <Dado rotulo="Nº da fatura">
            <span className="font-mono">{fatura.faturaNumber || '—'}</span>
          </Dado>
          <Dado rotulo="Data de emissão">{formatarDataEmissao(fatura.dataEmissao)}</Dado>
        </Secao>

        {temDetalhamento(fatura) &&
          GRUPOS_DE_DETALHE.map((grupo) => (
            <Secao key={grupo.titulo} titulo={grupo.titulo}>
              {grupo.campos.map(({ campo, rotulo, tipo }) => (
                <Dado key={campo} rotulo={rotulo}>
                  {formatarDetalhe(fatura[campo], tipo)}
                </Dado>
              ))}
            </Secao>
          ))}

        {fatura.origem === 'PROTHEUS' && (
          <Secao titulo="Documento de entrada no Protheus">
            <Dado rotulo="Documento / série">
              <span className="font-mono">
                {documento?.documento || '—'}
                {documento?.serie ? ` / ${documento.serie}` : ''}
              </span>
            </Dado>
            <Dado rotulo="Fornecedor / loja">
              <span className="font-mono">{documento ? `${documento.fornecedor} / ${documento.loja}` : '—'}</span>
            </Dado>
            <Dado rotulo="Filial">{documento?.filial || '—'}</Dado>
            <Dado rotulo="Incluído por">{fatura.usuarioProtheus || '—'}</Dado>
            <Dado rotulo="Valor bruto">
              {fatura.valorBrutoProtheus !== null && fatura.valorBrutoProtheus !== undefined
                ? formatarMoeda(fatura.valorBrutoProtheus)
                : '—'}
            </Dado>
            <Dado rotulo="Emissão">{formatarDataEmissao(fatura.emissaoProtheus ?? null)}</Dado>
          </Secao>
        )}

        <Secao titulo="Recebimento">
          <Dado rotulo="Enviada por">{fatura.senderName}</Dado>
          <Dado rotulo="Recebida em">
            <span className="tabular-nums">{formatarDataHora(fatura.createdAt)}</span>
          </Dado>
          <Dado rotulo="Arquivo" largo>
            {fatura.filePath ? (
              <button
                type="button"
                onClick={aoBaixar}
                className="group inline-flex max-w-full items-center gap-2 text-left text-tech-100 hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted group-hover:text-tech" aria-hidden="true" />
                <span className="truncate">{fatura.xmlFileName || 'Arquivo anexado'}</span>
              </button>
            ) : (
              '—'
            )}
          </Dado>
        </Secao>
      </div>
    </Gaveta>
  );
}

function AvisoDaSituacao({ fatura, situacao, agora }: { fatura: Fatura; situacao: Situacao; agora: Date }) {
  switch (situacao) {
    case 'erro':
      return <Aviso tipo="erro">{fatura.errorReason || 'Falha no processamento desta fatura.'}</Aviso>;
    case 'parada':
      return (
        <Aviso tipo="erro">
          O processamento começou há {formatarEspera(fatura.processamentoIniciadoEm as string, agora)} e não terminou.
          Confira a execução no n8n.
        </Aviso>
      );
    case 'filaParada':
      return <Aviso tipo="erro">A fila do n8n não anda. Confira se o fluxo de processamento está ativo.</Aviso>;
    case 'processando':
      return (
        <Aviso>
          Sendo lida pela IA há {formatarEspera(fatura.processamentoIniciadoEm as string, agora)}. Os dados aparecem
          aqui assim que terminar.
        </Aviso>
      );
    case 'naFila':
      return (
        <Aviso>
          Aguardando na fila de processamento há {formatarEspera(fatura.createdAt, agora)}.
        </Aviso>
      );
    default:
      return null;
  }
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-hairline pb-2 text-[13px] font-bold text-white">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">{children}</dl>
    </section>
  );
}

function Dado({ rotulo, children, largo = false }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  return (
    <div className={`min-w-0 ${largo ? 'col-span-2' : ''}`}>
      <dt className="eyebrow">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-graphite">{children}</dd>
    </div>
  );
}
