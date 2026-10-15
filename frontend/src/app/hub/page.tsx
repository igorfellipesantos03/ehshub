'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Link2, ListChecks, Users } from 'lucide-react';
import CartaoHub from '@/components/ui/CartaoHub';
import ModalGerarLink from '@/components/ui/ModalGerarLink';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { useUsuario } from '@/lib/sessao';

export default function Hub() {
  const router = useRouter();
  const usuario = useUsuario();
  const [modalAberto, setModalAberto] = useState(false);
  const admin = usuario?.role === 'ADMIN';

  return (
    <div className="animate-rise">
      <CabecalhoDePagina titulo="Painel central" descricao="Selecione o módulo que deseja acessar." />

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoHub
          title="Gerar link de coleta"
          description="Crie um link público para coleta de faturas de uma empresa ou filial."
          icon={Link2}
          onClick={() => setModalAberto(true)}
        />
        <CartaoHub
          title="Faturas"
          description="Acompanhe as faturas recebidas e os dados extraídos de cada uma."
          icon={FileText}
          onClick={() => router.push('/hub/invoices')}
        />
        {admin && (
          <>
            <CartaoHub
              title="Links de coleta"
              description="Bloqueie, reative ou exclua os links já gerados."
              icon={ListChecks}
              onClick={() => router.push('/hub/links')}
            />
            <CartaoHub
              title="Usuários"
              description="Controle acessos, permissões e aprovação de novos registros."
              icon={Users}
              onClick={() => router.push('/hub/users')}
            />
          </>
        )}
      </div>

      <ModalGerarLink isOpen={modalAberto} onClose={() => setModalAberto(false)} />
    </div>
  );
}
