'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAgora } from '@/lib/tempoReal';
import type { Fatura } from './fatura';
import { situacaoDoProcessamento } from './processamento';

/**
 * Todas as faturas (a API só entrega para administradores) e a situação da
 * fila do n8n. O tempo real fica no AppShell; aqui só se lê o cache.
 */
export function useFaturas(habilitado = true) {
  const consulta = useQuery<Fatura[]>({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoice/uploads')).data,
    enabled: habilitado,
  });
  const agora = useAgora();

  const processamento = useMemo(() => situacaoDoProcessamento(consulta.data ?? [], agora), [consulta.data, agora]);

  return { ...consulta, faturas: consulta.data, processamento, agora };
}
