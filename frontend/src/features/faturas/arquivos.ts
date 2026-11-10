import api from '@/lib/api';
import { formatarDataEmissao, formatarDataHora } from '@/lib/formato';
import { ROTULOS_DE_ORIGEM, documentoProtheus, empresaDaFatura, localDaFatura, type Fatura } from './fatura';
import { SITUACOES } from './processamento';
import type { LinhaDeFatura } from './ListaDeFaturas';

function salvarArquivo(conteudo: Blob, nome: string) {
  const url = window.URL.createObjectURL(conteudo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Baixa o PDF/XML original. Rejeita se o arquivo não estiver mais no servidor. */
export async function baixarArquivoDaFatura(fatura: Fatura) {
  const resposta = await api.get(`/invoice/${fatura.id}/download`, { responseType: 'blob' });
  salvarArquivo(new Blob([resposta.data]), fatura.xmlFileName || 'arquivo');
}

// Números no padrão do Excel em português: vírgula decimal, sem separador de milhar.
const numero = (valor: number | null | undefined, casas = 2) =>
  valor === null || valor === undefined ? '' : valor.toFixed(casas).replace('.', ',');

const COLUNAS: [string, (linha: LinhaDeFatura) => string | number | null | undefined][] = [
  ['Empresa', ({ fatura }) => empresaDaFatura(fatura)],
  ['Local', ({ fatura }) => localDaFatura(fatura)],
  ['Origem', ({ fatura }) => ROTULOS_DE_ORIGEM[fatura.origem]],
  ['Situação', ({ situacao }) => SITUACOES[situacao].rotulo],
  ['Emitente', ({ fatura }) => fatura.emitente],
  ['Nº da fatura', ({ fatura }) => fatura.faturaNumber],
  ['UC', ({ fatura }) => fatura.numeroUc],
  ['Mês de referência', ({ fatura }) => fatura.mesReferencia],
  ['Emissão', ({ fatura }) => (fatura.dataEmissao ? formatarDataEmissao(fatura.dataEmissao) : '')],
  ['Dias faturados', ({ fatura }) => fatura.diasFaturados],
  ['Consumo (kWh)', ({ fatura }) => numero(fatura.consumoKwh, 3)],
  ['Consumo ponta (kWh)', ({ fatura }) => numero(fatura.consumoPontaKwh, 3)],
  ['Consumo fora de ponta (kWh)', ({ fatura }) => numero(fatura.consumoForaPontaKwh, 3)],
  ['Demanda contratada (kW)', ({ fatura }) => numero(fatura.demandaContratadaKw, 3)],
  ['Demanda faturada (kW)', ({ fatura }) => numero(fatura.demandaFaturadaKw, 3)],
  ['Multa por ultrapassagem (R$)', ({ fatura }) => numero(fatura.multaUltrapassagem)],
  ['Reativo excedente (R$)', ({ fatura }) => numero(fatura.reativoExcedente)],
  ['Valor (R$)', ({ fatura, situacao }) => (situacao === 'concluida' || situacao === 'divergente' ? numero(fatura.valorFatura) : '')],
  ['Valor bruto no Protheus (R$)', ({ fatura }) => numero(fatura.valorBrutoProtheus)],
  ['Documento no Protheus', ({ fatura }) => documentoProtheus(fatura)?.documento],
  ['Recebida em', ({ fatura }) => formatarDataHora(fatura.createdAt)],
  ['Enviada por', ({ fatura }) => fatura.senderName],
];

const celula = (valor: string | number | null | undefined) => {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** CSV separado por ponto e vírgula, com BOM: o Excel em português abre direto, com acentos. */
export function exportarCsv(linhas: LinhaDeFatura[]) {
  const conteudo = [
    COLUNAS.map(([titulo]) => celula(titulo)).join(';'),
    ...linhas.map((linha) => COLUNAS.map(([, valor]) => celula(valor(linha))).join(';')),
  ].join('\r\n');

  const hoje = new Date().toISOString().slice(0, 10);
  salvarArquivo(new Blob(['﻿', conteudo], { type: 'text/csv;charset=utf-8' }), `faturas-${hoje}.csv`);
}
