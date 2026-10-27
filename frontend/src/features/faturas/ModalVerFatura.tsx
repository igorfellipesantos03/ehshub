'use client';

import type { ReactNode } from 'react';
import { Calendar, Download, Paperclip, Pencil, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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

interface ModalVerFaturaProps {
  fatura: Fatura;
  aoFechar: () => void;
  aoEditar: () => void;
  aoBaixar: () => void;
}

export function ModalVerFatura({ fatura, aoFechar, aoEditar, aoBaixar }: ModalVerFaturaProps) {
  const documento = documentoProtheus(fatura);
  const divergencias = divergenciasComProtheus(fatura);

  return (
    <Modal
      titulo={empresaDaFatura(fatura) || 'Fatura'}
      descricao={localDaFatura(fatura) || 'Local não especificado'}
      aoFechar={aoFechar}
      largura="max-w-2xl"
      rodape={
        <>
          <Botao onClick={aoFechar}>Fechar</Botao>
          <Botao variante="primario" icone={Pencil} onClick={aoEditar}>
            Editar
          </Botao>
        </>
      }
    >
      <div className="space-y-6">
        {fatura.status === 'ERRO_PROCESSAMENTO' && (
          <Aviso tipo="erro">{fatura.errorReason || 'Falha no processamento desta fatura.'}</Aviso>
        )}

        {divergencias.length > 0 && (
          <Aviso tipo="alerta">
            Confira esta fatura: os dados extraídos não batem com o documento de entrada.
            {'\n'}
            {divergencias.map((texto) => `• ${texto}`).join('\n')}
          </Aviso>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Dado rotulo="Emitente" className="col-span-2">
            {fatura.emitente || '—'}
          </Dado>
          <Dado rotulo="Nº da fatura">
            <span className="font-mono">{fatura.faturaNumber || '—'}</span>
          </Dado>
          <Dado rotulo="Data de emissão">{formatarDataEmissao(fatura.dataEmissao)}</Dado>
          <Dado rotulo="Valor da fatura">
            <span className="text-xl font-bold text-emerald-300">{formatarMoeda(fatura.valorFatura)}</span>
          </Dado>
          <Dado rotulo="Consumo total">
            <span className="text-xl font-bold text-tech-100">{formatarConsumo(fatura.consumoKwh)}</span>
          </Dado>
        </dl>

        {temDetalhamento(fatura) &&
          GRUPOS_DE_DETALHE.map((grupo) => (
            <section key={grupo.titulo} className="border-t border-hairline pt-5">
              <h3 className="text-sm font-bold text-white">{grupo.titulo}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
                {grupo.campos.map(({ campo, rotulo, tipo }) => (
                  <Dado key={campo} rotulo={rotulo}>
                    {formatarDetalhe(fatura[campo], tipo)}
                  </Dado>
                ))}
              </dl>
            </section>
          ))}

        {fatura.origem === 'PROTHEUS' && (
          <section className="border-t border-hairline pt-5">
            <h3 className="text-sm font-bold text-white">Documento de entrada no Protheus</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <Dado rotulo="Documento / série">
                <span className="font-mono">
                  {documento?.documento || '—'}
                  {documento?.serie ? ` / ${documento.serie}` : ''}
                </span>
              </Dado>
              <Dado rotulo="Fornecedor / loja">
                <span className="font-mono">
                  {documento ? `${documento.fornecedor} / ${documento.loja}` : '—'}
                </span>
              </Dado>
              <Dado rotulo="Filial">{documento?.filial || '—'}</Dado>
              <Dado rotulo="Incluído por">{fatura.usuarioProtheus || '—'}</Dado>
              <Dado rotulo="Valor bruto no Protheus">
                {fatura.valorBrutoProtheus !== null && fatura.valorBrutoProtheus !== undefined
                  ? formatarMoeda(fatura.valorBrutoProtheus)
                  : '—'}
              </Dado>
              <Dado rotulo="Emissão no Protheus">{formatarDataEmissao(fatura.emissaoProtheus ?? null)}</Dado>
            </dl>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-5 text-[13px] text-muted">
          <span className="flex min-w-0 items-center gap-2">
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Enviado por {fatura.senderName}</span>
          </span>
          <span className="flex items-center gap-2 tabular-nums">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            {formatarDataHora(fatura.createdAt)}
          </span>
        </div>

        {fatura.filePath && (
          <button
            type="button"
            onClick={aoBaixar}
            className="group flex w-full items-center gap-3 rounded-card border border-hairline px-4 py-3 text-left transition-colors hover:border-tech/40 hover:bg-raised"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tech/12 text-tech-100">
              <Paperclip className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-graphite">
                {fatura.xmlFileName || 'Arquivo anexado'}
              </span>
              <span className="block text-xs text-muted">Baixar o arquivo original</span>
            </span>
            <Download className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-tech" aria-hidden="true" />
          </button>
        )}
      </div>
    </Modal>
  );
}

function Dado({ rotulo, children, className = '' }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="eyebrow">{rotulo}</dt>
      <dd className="mt-1 break-words text-[15px] font-medium text-graphite">{children}</dd>
    </div>
  );
}
