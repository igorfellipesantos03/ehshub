import { empresaDaFatura } from './fatura';
import type { LinhaDeFatura } from './ListaDeFaturas';
import { SITUACOES_COM_PROBLEMA } from './processamento';

export interface ResumoDoMes {
  recebidas: number;
  doProtheus: number;
  porLink: number;
  /** Só das faturas já lidas: as outras ainda não têm valor nem consumo. */
  valor: number;
  consumoKwh: number;
}

const chaveDoMes = (data: Date) => `${data.getFullYear()}-${data.getMonth()}`;

function resumir(linhas: LinhaDeFatura[]): ResumoDoMes {
  const resumo: ResumoDoMes = { recebidas: 0, doProtheus: 0, porLink: 0, valor: 0, consumoKwh: 0 };
  for (const { fatura, situacao } of linhas) {
    resumo.recebidas += 1;
    if (fatura.origem === 'PROTHEUS') resumo.doProtheus += 1;
    else resumo.porLink += 1;
    if (situacao === 'concluida' || situacao === 'divergente') {
      resumo.valor += fatura.valorFatura || 0;
      resumo.consumoKwh += fatura.consumoKwh || 0;
    }
  }
  return resumo;
}

/** Faturas recebidas no mês corrente e no anterior, pela data de recebimento. */
export function resumoMensal(linhas: LinhaDeFatura[], agora: Date) {
  const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const chaveAtual = chaveDoMes(agora);
  const chaveAnterior = chaveDoMes(anterior);

  const doMes = (chave: string) => linhas.filter(({ fatura }) => chaveDoMes(new Date(fatura.createdAt)) === chave);
  const atuais = doMes(chaveAtual);

  return {
    atual: resumir(atuais),
    anterior: resumir(doMes(chaveAnterior)),
    nomeAtual: agora.toLocaleDateString('pt-BR', { month: 'long' }),
    nomeAnterior: anterior.toLocaleDateString('pt-BR', { month: 'long' }),
    porEmpresa: valorPorEmpresa(atuais),
  };
}

/** Empresas do mês ordenadas pelo valor lido, para o gráfico de barras. */
function valorPorEmpresa(linhas: LinhaDeFatura[]) {
  const totais = new Map<string, number>();
  for (const { fatura, situacao } of linhas) {
    if (situacao !== 'concluida' && situacao !== 'divergente') continue;
    const empresa = empresaDaFatura(fatura) || 'Empresa não informada';
    totais.set(empresa, (totais.get(empresa) ?? 0) + (fatura.valorFatura || 0));
  }
  return [...totais.entries()].map(([empresa, valor]) => ({ empresa, valor })).sort((a, b) => b.valor - a.valor);
}

/** Variação percentual; `null` quando não há base de comparação. */
export const variacao = (atual: number, anterior: number) => (anterior > 0 ? ((atual - anterior) / anterior) * 100 : null);

export const precisaDeAtencao = ({ situacao }: LinhaDeFatura) =>
  SITUACOES_COM_PROBLEMA.includes(situacao) || situacao === 'divergente';
