'use client';

import { useMemo, useSyncExternalStore } from 'react';

export interface UsuarioDaSessao {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'REVIEWER' | 'USER';
}

const CHAVE_TOKEN = '@EHS:token';
const CHAVE_USUARIO = '@EHS:user';

export const encerrarSessao = () => {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
};

// O evento `storage` avisa quando outra aba entra ou sai da conta.
function assinar(aoMudar: () => void) {
  window.addEventListener('storage', aoMudar);
  return () => window.removeEventListener('storage', aoMudar);
}

export type EstadoDaSessao = 'verificando' | 'ativa' | 'ausente';

/** Se há token salvo. No servidor (e na hidratação) ainda não dá para saber: 'verificando'. */
export function useSessao(): EstadoDaSessao {
  return useSyncExternalStore(
    assinar,
    () => (localStorage.getItem(CHAVE_TOKEN) ? 'ativa' : 'ausente'),
    () => 'verificando',
  );
}

/** Usuário logado, lido do localStorage. `null` no servidor ou sem sessão. */
export function useUsuario(): UsuarioDaSessao | null {
  const bruto = useSyncExternalStore(
    assinar,
    () => localStorage.getItem(CHAVE_USUARIO),
    () => null,
  );

  return useMemo(() => {
    try {
      return bruto ? (JSON.parse(bruto) as UsuarioDaSessao) : null;
    } catch {
      return null;
    }
  }, [bruto]);
}
