import type { TomDeSelo } from '@/components/ui/Feedback';
import { divergenciasComProtheus, type Fatura } from './fatura';

// Prazo para uma fatura sair da fila ou terminar depois de começar (OCR + IA).
export const MINUTOS_PARA_TRAVAR = 10;

export interface SituacaoDoProcessamento {
  /** Já tiradas da fila pelo n8n e ainda dentro do prazo. */
  emAndamento: Fatura[];
  /** Esperando no RabbitMQ, na ordem de chegada. */
  naFila: Fatura[];
  /** Minutos sem nenhuma fatura sair da fila, quando passa do prazo. */
  filaParadaHa: number | null;
  /** Erro de processamento, travadas no meio do pipeline ou presas numa fila parada. */
  comProblema: Set<string>;
}

const minutosEntre = (inicio: number, fim: Date) => (fim.getTime() - inicio) / 60000;

/**
 * O n8n processa uma fatura por vez, então esperar na fila não é problema:
 * o prazo conta a partir de quando o n8n começou cada uma. A fila só é
 * considerada parada se nada sair dela dentro do prazo.
 */
export function situacaoDoProcessamento(faturas: Fatura[], agora: Date): SituacaoDoProcessamento {
  const emAndamento: Fatura[] = [];
  const naFila: Fatura[] = [];
  const comProblema = new Set<string>();
  let ultimoInicio = 0;

  for (const fatura of faturas) {
    const inicio = fatura.processamentoIniciadoEm ? new Date(fatura.processamentoIniciadoEm).getTime() : null;
    if (inicio) ultimoInicio = Math.max(ultimoInicio, inicio);

    if (fatura.status === 'ERRO_PROCESSAMENTO') {
      comProblema.add(fatura.id);
    } else if (fatura.status === 'PROCESSANDO') {
      if (!inicio) naFila.push(fatura);
      else if (minutosEntre(inicio, agora) > MINUTOS_PARA_TRAVAR) comProblema.add(fatura.id);
      else emAndamento.push(fatura);
    }
  }

  naFila.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let filaParadaHa: number | null = null;
  if (naFila.length > 0) {
    const desde = Math.max(ultimoInicio, new Date(naFila[0].createdAt).getTime());
    const minutos = minutosEntre(desde, agora);
    if (minutos > MINUTOS_PARA_TRAVAR) {
      filaParadaHa = Math.floor(minutos);
      for (const fatura of naFila) comProblema.add(fatura.id);
    }
  }

  return { emAndamento, naFila, filaParadaHa, comProblema };
}

export const formatarEspera = (desde: string, agora: Date) => {
  const minutos = Math.floor(minutosEntre(new Date(desde).getTime(), agora));
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${minutos} min`;
  const resto = minutos % 60;
  return `${Math.floor(minutos / 60)} h${resto ? ` ${resto} min` : ''}`;
};

/** Em que pé a fatura está, do ponto de vista de quem confere. */
export type Situacao = 'concluida' | 'divergente' | 'erro' | 'parada' | 'filaParada' | 'processando' | 'naFila';

export const SITUACOES: Record<Situacao, { rotulo: string; tom: TomDeSelo }> = {
  concluida: { rotulo: 'Concluída', tom: 'sucesso' },
  divergente: { rotulo: 'Divergente', tom: 'alerta' },
  erro: { rotulo: 'Erro na leitura', tom: 'perigo' },
  parada: { rotulo: 'Processamento parado', tom: 'perigo' },
  filaParada: { rotulo: 'Fila parada', tom: 'perigo' },
  processando: { rotulo: 'Processando', tom: 'tech' },
  naFila: { rotulo: 'Na fila', tom: 'neutro' },
};

export function situacaoDaFatura(fatura: Fatura, processamento: SituacaoDoProcessamento): Situacao {
  if (fatura.status === 'ERRO_PROCESSAMENTO') return 'erro';
  if (fatura.status === 'PROCESSANDO') {
    if (processamento.comProblema.has(fatura.id)) return fatura.processamentoIniciadoEm ? 'parada' : 'filaParada';
    return fatura.processamentoIniciadoEm ? 'processando' : 'naFila';
  }
  // CONCLUIDO (lida pela IA) ou MANUAL (XML lido direto no envio).
  return divergenciasComProtheus(fatura).length > 0 ? 'divergente' : 'concluida';
}

export const SITUACOES_COM_PROBLEMA: Situacao[] = ['erro', 'parada', 'filaParada'];
