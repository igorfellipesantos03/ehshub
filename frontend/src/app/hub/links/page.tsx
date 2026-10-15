'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Copy, Link2, SearchX, Shield, ShieldOff, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao, BotaoDeIcone } from '@/components/ui/Botao';
import { Confirmacao } from '@/components/ui/Modal';
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso';
import { Aviso, EstadoVazio, Spinner } from '@/components/ui/Feedback';
import { formatarDataHora } from '@/lib/formato';

interface LinkColeta {
  id: string;
  token: string;
  empresa: string;
  filial: string | null;
  isActive: boolean;
  createdAt: string;
  faturas: unknown[];
}

// O que está aguardando confirmação: um link ou todos os que estão na lista.
type Exclusao = { tipo: 'um'; link: LinkColeta } | { tipo: 'todos'; ids: string[] };

export default function LinksManagementPage() {
  const queryClient = useQueryClient();
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null);
  const [exclusao, setExclusao] = useState<Exclusao | null>(null);

  const { data: links, isLoading, isError } = useQuery<LinkColeta[]>({
    queryKey: ['links'],
    queryFn: async () => (await api.get('/invoice/links')).data,
  });

  // Atualizações em tempo real (Socket.io).
  useEffect(() => {
    socket.connect();
    const recarregar = () => queryClient.invalidateQueries({ queryKey: ['links'] });
    const eventos = ['invoice_created', 'invoice_updated', 'link_created', 'link_updated'];

    eventos.forEach((evento) => socket.on(evento, recarregar));

    return () => {
      eventos.forEach((evento) => socket.off(evento, recarregar));
      socket.disconnect();
    };
  }, [queryClient]);

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['links'] });

  const empresas = useMemo(() => [...new Set((links ?? []).map((link) => link.empresa))].sort(), [links]);

  const filtrados = useMemo(
    () => (links ?? []).filter((link) => !empresa || link.empresa === empresa),
    [links, empresa],
  );

  const alternar = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/invoice/links/${id}/toggle`)).data,
    onSuccess: recarregar,
  });

  // Ativa ou bloqueia de uma vez todos os links que estão na lista.
  const alternarTodos = useMutation({
    mutationFn: async (ativar: boolean) =>
      (await api.patch('/invoice/links/toggle-all', { ids: filtrados.map((link) => link.id), activate: ativar })).data,
    onSuccess: recarregar,
  });

  const excluir = useMutation({
    mutationFn: async (alvo: Exclusao) => {
      if (alvo.tipo === 'um') {
        await api.delete(`/invoice/links/${alvo.link.id}`);
      } else {
        await api.delete('/invoice/links/bulk', { data: { ids: alvo.ids } });
      }
    },
    onSuccess: () => {
      recarregar();
      setExclusao(null);
    },
  });

  function pedirExclusao(alvo: Exclusao) {
    excluir.reset();
    setExclusao(alvo);
  }

  async function copiar(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/invoice/${token}`);
    setTokenCopiado(token);
    setTimeout(() => setTokenCopiado(null), 2000);
  }

  const semLinksNaLista = filtrados.length === 0;

  return (
    <div className="animate-rise">
      <CabecalhoDePagina
        titulo="Links de coleta"
        descricao="Links bloqueados não recebem novas faturas. Gerar um link para uma empresa que já tem um ativo reutiliza o existente."
      >
        <Botao
          icone={Check}
          onClick={() => alternarTodos.mutate(true)}
          disabled={alternarTodos.isPending || semLinksNaLista}
        >
          Ativar todos
        </Botao>
        <Botao
          icone={ShieldOff}
          onClick={() => alternarTodos.mutate(false)}
          disabled={alternarTodos.isPending || semLinksNaLista}
        >
          Bloquear todos
        </Botao>
        <Botao
          variante="alerta"
          icone={Trash2}
          onClick={() => pedirExclusao({ tipo: 'todos', ids: filtrados.map((link) => link.id) })}
          disabled={semLinksNaLista}
        >
          Excluir todos
        </Botao>
      </CabecalhoDePagina>

      {(alternar.isError || alternarTodos.isError) && (
        <Aviso tipo="erro" className="mt-5">
          Não foi possível alterar o status do link. Tente novamente.
        </Aviso>
      )}

      {empresas.length > 0 && (
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <FiltroSuspenso
            icone={Building2}
            rotuloTodos="Todas as empresas"
            opcoes={empresas}
            valor={empresa}
            aoMudar={setEmpresa}
          />

          {empresa && (
            <button
              type="button"
              onClick={() => setEmpresa(null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-muted transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtro
            </button>
          )}

          <span className="ml-auto text-[13px] tabular-nums text-muted">
            {filtrados.length} {filtrados.length === 1 ? 'link' : 'links'}
          </span>
        </div>
      )}

      <div className="card mt-5 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-24 text-muted" role="status" aria-label="Carregando links">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <Aviso tipo="erro">Não foi possível carregar os links. Recarregue a página para tentar de novo.</Aviso>
          </div>
        ) : !links?.length ? (
          <EstadoVazio
            icone={Link2}
            titulo="Nenhum link gerado"
            descricao="Os links de coleta gerados aparecem aqui para você controlar o acesso."
          />
        ) : semLinksNaLista ? (
          <EstadoVazio icone={SearchX} titulo="Nenhum link encontrado" descricao="Não há links para a empresa selecionada.">
            <button type="button" onClick={() => setEmpresa(null)} className="text-sm font-semibold text-tech hover:underline">
              Ver todos os links
            </button>
          </EstadoVazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline text-[12.5px] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Link</th>
                  <th className="px-4 py-3 font-semibold">Criado em</th>
                  <th className="px-4 py-3 text-right font-semibold">Faturas</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtrados.map((link) => (
                  <tr key={link.id} className="transition-colors hover:bg-raised/50">
                    <td className="px-5 py-3.5">
                      <span className="block font-semibold text-graphite">{link.empresa}</span>
                      {link.filial && <span className="block text-xs text-muted">{link.filial}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <code className="rounded-lg bg-ground/70 px-2 py-1 font-mono text-[12.5px] text-graphite/90">
                          /invoice/{link.token.substring(0, 8)}…
                        </code>
                        <BotaoDeIcone
                          icone={tokenCopiado === link.token ? Check : Copy}
                          rotulo={tokenCopiado === link.token ? 'Link copiado' : 'Copiar link completo'}
                          variante={tokenCopiado === link.token ? 'sucesso' : 'neutro'}
                          onClick={() => copiar(link.token)}
                        />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-muted">
                      {formatarDataHora(link.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-graphite/90">{link.faturas?.length || 0}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`pill ${link.isActive ? 'bg-success/15 text-emerald-200' : 'bg-danger/15 text-danger-200'}`}
                      >
                        {link.isActive ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <BotaoDeIcone
                          icone={link.isActive ? ShieldOff : Shield}
                          rotulo={link.isActive ? 'Bloquear link' : 'Reativar link'}
                          variante={link.isActive ? 'neutro' : 'sucesso'}
                          onClick={() => alternar.mutate(link.id)}
                          carregando={alternar.isPending && alternar.variables === link.id}
                          disabled={alternar.isPending}
                        />
                        <BotaoDeIcone
                          icone={Trash2}
                          rotulo="Excluir link"
                          variante="perigo"
                          onClick={() => pedirExclusao({ tipo: 'um', link })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {exclusao && (
        <Confirmacao
          titulo={exclusao.tipo === 'um' ? 'Excluir link?' : 'Excluir todos os links?'}
          rotuloConfirmar={exclusao.tipo === 'um' ? 'Excluir' : 'Excluir todos'}
          variante="perigo"
          aoConfirmar={() => excluir.mutate(exclusao)}
          aoFechar={() => setExclusao(null)}
          carregando={excluir.isPending}
          erro={excluir.isError ? 'Não foi possível concluir a exclusão. Tente novamente.' : null}
        >
          {exclusao.tipo === 'um' ? (
            <p>
              O link de <strong className="text-white">{exclusao.link.empresa}</strong>
              {exclusao.link.filial && <> ({exclusao.link.filial})</>} e todas as faturas associadas a ele serão
              excluídos permanentemente. Esta ação não pode ser desfeita.
            </p>
          ) : (
            <p>
              {exclusao.ids.length === 1 ? 'O link listado' : `Os ${exclusao.ids.length} links listados`} e todas as
              faturas associadas serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </p>
          )}
        </Confirmacao>
      )}
    </div>
  );
}
