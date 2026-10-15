'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CarregandoPagina } from '@/components/ui/Feedback';
import { useSessao } from '@/lib/sessao';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sessao = useSessao();

  useEffect(() => {
    if (sessao === 'ausente') router.replace('/');
  }, [sessao, router]);

  // Enquanto verifica (ou redireciona), mostra o carregamento para a tela protegida não piscar.
  if (sessao !== 'ativa') return <CarregandoPagina />;

  return <AppShell>{children}</AppShell>;
}
