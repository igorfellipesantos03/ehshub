'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Copy, Link2, SearchX, Shield, ShieldOff, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import ModalGerarLink from '@/components/ui/ModalGerarLink';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao, BotaoDeIcone } from '@/components/ui/Botao';
import { CampoDeBusca } from '@/components/ui/Campo';
import { Confirmacao } from '@/components/ui/Modal';
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso';
import { Aviso, CarregandoArea, EstadoVazio, Selo } from '@/components/ui/Feedback';
import { normalizarBusca } from '@/features/faturas/fatura';
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
  const [busca, setBusca] = useState('');
  const [gerando, setGerando] = useState(false);
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null);
  const [exclusao, setExclusao] = useState<Exclusao | null>(null);

  const { data: links, isLoading, isError } = useQuery<LinkColeta[]>({
    queryKey: ['links'],
    queryFn: async () => (await api.get('/invoice/links')).data,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['links'] });

  const empresas = useMemo(() => [...new Set((links ?? []).map((link) => link.empresa))].sort(), [links]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return (links ?? []).filter(
      (link) =>
        (!empresa || link.empresa === empresa) &&
        (!termo || normalizarBusca(`${link.empresa} ${link.filial ?? ''} ${link.token}`).includes(termo)),
    );
  }, [links, empresa, busca]);

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
    <div className="animate-rise space-y-5">
      <CabecalhoDePagina
        titulo="Links de coleta"
        descricao="Links públicos para as filiais anexarem faturas. Links bloqueados não recebem novos envios; gerar um link para uma empresa que já tem um ativo reaproveita o existente."
      >
        <Botao variante="primario" icone={Link2} onClick={() => setGerando(true)}>
          Gerar link
        </Botao>
      </CabecalhoDePagina>

      {(alternar.isError || alternarTodos.isError) && (
        <Aviso tipo="erro">Não foi possível alterar o status do link. Tente novamente.</Aviso>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-deep/40 px-3 py-2.5">
          <CampoDeBusca valor={busca} aoMudar={setBusca} placeholder="Buscar empresa, filial ou token…" className="w-full sm:w-72" />
          <FiltroSuspenso icone={Building2} rotuloTodos="Empresa" opcoes={empresas} valor={empresa} aoMudar={setEmpresa} />
          {(empresa || busca) && (
            <button
              type="button"
              onClick={() => {
                setEmpresa(null);
                setBusca('');
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-[13px] font-semibold text-muted transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 text-xs tabular-nums text-muted">
              {filtrados.length} {filtrados.length === 1 ? 'link' : 'links'}
            </span>
            <Botao
              variante="fantasma"
              icone={Check}
              onClick={() => alternarTodos.mutate(true)}
              disabled={alternarTodos.isPending || semLinksNaLista}
              title="Ativar todos os links listados"
            >
              Ativar listados
            </Botao>
            <Botao
              variante="fantasma"
              icone={ShieldOff}
              onClick={() => alternarTodos.mutate(false)}
              disabled={alternarTodos.isPending || semLinksNaLista}
              title="Bloquear todos os links listados"
            >
              Bloquear listados
            </Botao>
            <BotaoDeIcone
              icone={Trash2}
              rotulo="Excluir todos os links listados"
              variante="perigo"
              onClick={() => pedirExclusao({ tipo: 'todos', ids: filtrados.map((link) => link.id) })}
              disabled={semLinksNaLista}
            />
          </div>
        </div>

        {isLoading ? (
          <CarregandoArea rotulo="Carregando links" />
        ) : isError ? (
          <div className="p-4">
            <Aviso tipo="erro">Não foi possível carregar os links. Recarregue a página para tentar de novo.</Aviso>
          </div>
        ) : !links?.length ? (
          <EstadoVazio
            icone={Link2}
            titulo="Nenhum link gerado"
            descricao="Os links de coleta gerados aparecem aqui para você controlar o acesso."
          >
            <Botao variante="tech" icone={Link2} onClick={() => setGerando(true)}>
              Gerar o primeiro link
            </Botao>
          </EstadoVazio>
        ) : semLinksNaLista ? (
          <EstadoVazio icone={SearchX} titulo="Nenhum link encontrado" descricao="Nenhum link corresponde à busca e ao filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Empresa / filial</th>
                  <th>Link</th>
                  <th>Criado em</th>
                  <th className="text-right">Faturas</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <span className="block font-semibold text-graphite">{link.empresa}</span>
                      <span className="block text-xs text-muted">{link.filial || 'Todas as filiais'}</span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <code className="rounded-md bg-ground/70 px-2 py-0.5 font-mono text-xs text-graphite/90">
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
                    <td className="whitespace-nowrap text-xs tabular-nums text-muted">{formatarDataHora(link.createdAt)}</td>
                    <td className="numero text-graphite/90">{link.faturas?.length || 0}</td>
                    <td>
                      <Selo tom={link.isActive ? 'sucesso' : 'perigo'} ponto>
                        {link.isActive ? 'Ativo' : 'Bloqueado'}
                      </Selo>
                    </td>
                    <td className="w-px">
                      <div className="flex items-center justify-end gap-1">
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

      <ModalGerarLink isOpen={gerando} onClose={() => setGerando(false)} />

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
