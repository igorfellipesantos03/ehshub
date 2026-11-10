'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { iniciarSessao } from '@/lib/sessao';
import { CHAVE_STATE_SSO } from '@/lib/sso';
import { classesDeBotao } from '@/components/ui/Botao';
import { CarregandoPagina, Spinner } from '@/components/ui/Feedback';

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState('');
  // Em desenvolvimento o React monta o efeito duas vezes, e o código é de uso único.
  const jaTrocou = useRef(false);

  useEffect(() => {
    if (jaTrocou.current) return;
    jaTrocou.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const stateEsperado = sessionStorage.getItem(CHAVE_STATE_SSO);
    sessionStorage.removeItem(CHAVE_STATE_SSO);

    const trocarCodigo = async () => {
      if (!code || !state || state !== stateEsperado) {
        throw new Error('Não foi possível confirmar o login pelo CentralHub. Tente novamente.');
      }
      const { data } = await api.post('/auth/sso', { code });
      return data;
    };

    trocarCodigo()
      .then((data) => {
        iniciarSessao(data.token, data.user);
        router.replace('/hub');
      })
      .catch((err) => {
        setErro(err.response?.data?.error || err.message || 'Não foi possível entrar pelo CentralHub.');
      });
  }, [params, router]);

  if (!erro) return <CarregandoPagina rotulo="Entrando pelo CentralHub" />;

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="card w-full max-w-md p-7 text-center">
        <AlertCircle className="mx-auto h-9 w-9 text-danger-200" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-bold text-white">Login não concluído</h1>
        <p className="mt-1.5 text-sm text-muted">{erro}</p>
        <Link href="/login" className={classesDeBotao('primario', 'mt-6')}>
          Entrar com e-mail e senha
        </Link>
      </div>
    </div>
  );
}

export default function SsoCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted">
          <Spinner />
        </div>
      }
    >
      <Callback />
    </Suspense>
  );
}
