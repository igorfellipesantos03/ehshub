'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ENV } from '@/config/env';
import { CHAVE_STATE_SSO } from '@/lib/sso';
import { CarregandoPagina } from '@/components/ui/Feedback';

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

  return <CarregandoPagina rotulo="Entrando pelo CentralHub" />;
}
