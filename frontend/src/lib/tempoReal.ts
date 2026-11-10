'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from './socket';

// Eventos do backend que mudam faturas ou links (o Protheus exclui notas, o n8n devolve resultados).
const EVENTOS = ['invoice_created', 'invoice_updated', 'invoice_deleted', 'link_created', 'link_updated'];

/**
 * Uma conexão só para a área logada inteira: qualquer evento invalida as
 * listas, e cada tela recarrega o que estiver usando.
 */
export function useTempoReal(ativo: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ativo) return;
    socket.connect();
    const recarregar = () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['links'] });
    };

    EVENTOS.forEach((evento) => socket.on(evento, recarregar));
    return () => {
      EVENTOS.forEach((evento) => socket.off(evento, recarregar));
      socket.disconnect();
    };
  }, [ativo, queryClient]);
}

/** Relógio que anda sozinho, para esperas e prazos atualizarem sem recarregar a página. */
export function useAgora(intervaloMs = 15000) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(intervalo);
  }, [intervaloMs]);

  return agora;
}
