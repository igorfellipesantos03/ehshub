'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ENV } from '@/config/env';
import { CHAVE_STATE_SSO } from '@/lib/sso';

/**
 * Início do login pelo CentralHub — é este endereço (/sso) que vai cadastrado
 * como link no CentralHub. Gera um `state` aleatório, guarda na aba e manda o
 * navegador para o CentralHub; o callback só aceita a volta com o mesmo state,
 * o que impede alguém de "logar" a vítima na conta dele com um link forjado.
 */
export default function IniciarSso() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('@EHS:token')) {
      router.replace('/hub');
      return;
    }

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(CHAVE_STATE_SSO, state);

    const destino = new URL('/sso/autorizar', ENV.CENTRALHUB_URL);
    destino.searchParams.set('client_id', ENV.SSO_CLIENT_ID);
    destino.searchParams.set('redirect_uri', `${window.location.origin}/sso/callback`);
    destino.searchParams.set('state', state);

    window.location.replace(destino.toString());
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-[#020617] text-slate-300">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      <span className="text-sm font-medium">Entrando pelo CentralHub…</span>
    </div>
  );
}
