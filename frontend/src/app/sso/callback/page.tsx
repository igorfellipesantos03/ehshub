'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { CHAVE_STATE_SSO } from '@/lib/sso';

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
        localStorage.setItem('@EHS:token', data.token);
        localStorage.setItem('@EHS:user', JSON.stringify(data.user));
        router.replace('/hub');
      })
      .catch((err) => {
        setErro(err.response?.data?.error || err.message || 'Não foi possível entrar pelo CentralHub.');
      });
  }, [params, router]);

  if (!erro) {
    return (
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Entrando pelo CentralHub…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0B1120] p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
      <h1 className="mt-3 text-lg font-bold text-white">Login não concluído</h1>
      <p className="mt-2 text-sm text-slate-400">{erro}</p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Entrar com e-mail e senha
      </Link>
    </div>
  );
}

export default function SsoCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-blue-500" />}>
        <Callback />
      </Suspense>
    </div>
  );
}
