'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Calendar, FileText, LayoutGrid, Link2, List, MapPin, SearchX, X } from 'lucide-react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import ModalGerarLink from '@/components/ui/ModalGerarLink';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao } from '@/components/ui/Botao';
import { Confirmacao } from '@/components/ui/Modal';
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso';
import { Aviso, EstadoVazio, Spinner } from '@/components/ui/Feedback';
import { emissaoIso, empresaDaFatura, type Fatura } from '@/features/faturas/fatura';
import { GradeDeFaturas, TabelaDeFaturas } from '@/features/faturas/ListaDeFaturas';
import { ModalVerFatura } from '@/features/faturas/ModalVerFatura';
import { ModalEditarFatura } from '@/features/faturas/ModalEditarFatura';

// Fatura em processamento há mais que isso é tratada como travada.
const MINUTOS_PARA_TRAVAR = 2;

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [empresa, setEmpresa] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [modo, setModo] = useState<'grade' | 'tabela'>('grade');
  const [soProblemas, setSoProblemas] = useState(false);

  const [gerandoLink, setGerandoLink] = useState(false);
  const [vendo, setVendo] = useState<Fatura | null>(null);
  const [editando, setEditando] = useState<Fatura | null>(null);
  const [excluindo, setExcluindo] = useState<Fatura | null>(null);
  const [erroDeDownload, setErroDeDownload] = useState(false);
  const [agora, setAgora] = useState(() => new Date());

  const { data: faturas, isLoading, isError } = useQuery<Fatura[]>({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoice/uploads')).data,
  });

  // Atualizações em tempo real (Socket.io).
  useEffect(() => {
    socket.connect();
    const recarregar = () => queryClient.invalidateQueries({ queryKey: ['invoices'] });

    socket.on('invoice_created', recarregar);
    socket.on('invoice_updated', recarregar);

    return () => {
      socket.off('invoice_created', recarregar);
      socket.off('invoice_updated', recarregar);
      socket.disconnect();
    };
  }, [queryClient]);

  // O relógio anda sozinho para as faturas travadas aparecerem sem recarregar a página.
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 15000);
    return () => clearInterval(intervalo);
  }, []);

  const salvar = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Fatura> }) =>
      (await api.put(`/invoice/${id}`, dados)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setEditando(null);
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invoice/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setExcluindo(null);
      setVendo(null);
    },
  });

  const empresas = useMemo(
    () => [...new Set((faturas ?? []).map(empresaDaFatura).filter(Boolean))].sort(),
    [faturas],
  );

  // Os locais dependem da empresa escolhida.
  const locais = useMemo(() => {
    if (!faturas || !empresa) return [];
    const daEmpresa = faturas.filter((fatura) => empresaDaFatura(fatura) === empresa && fatura.local);
    return [...new Set(daEmpresa.map((fatura) => fatura.local as string))].sort();
  }, [faturas, empresa]);

  const filtradas = useMemo(() => {
    return (faturas ?? []).filter((fatura) => {
      if (empresa && empresaDaFatura(fatura) !== empresa) return false;
      if (local && fatura.local !== local) return false;
      if (dataInicial || dataFinal) {
        const emissao = emissaoIso(fatura.dataEmissao);
        if (!emissao) return false;
        if (dataInicial && emissao < dataInicial) return false;
        if (dataFinal && emissao > dataFinal) return false;
      }
      return true;
    });
  }, [faturas, empresa, local, dataInicial, dataFinal]);

  // Com problema: erro de processamento ou processando há tempo demais.
  const comProblema = useMemo(() => {
    const ids = new Set<string>();
    for (const fatura of faturas ?? []) {
      const minutos = (agora.getTime() - new Date(fatura.createdAt).getTime()) / 60000;
      if (fatura.status === 'ERRO_PROCESSAMENTO' || (fatura.status === 'PROCESSANDO' && minutos > MINUTOS_PARA_TRAVAR)) {
        ids.add(fatura.id);
      }
    }
    return ids;
  }, [faturas, agora]);

  // Fora do modo "só problemas", quem ainda está processando normalmente não aparece.
  const visiveis = useMemo(() => {
    if (soProblemas) return (faturas ?? []).filter((fatura) => comProblema.has(fatura.id));
    return filtradas.filter((fatura) => fatura.status !== 'PROCESSANDO' || comProblema.has(fatura.id));
  }, [faturas, filtradas, soProblemas, comProblema]);

  const temFiltro = Boolean(empresa || local || dataInicial || dataFinal || soProblemas);

  function limparFiltros() {
    setEmpresa(null);
    setLocal(null);
    setDataInicial('');
    setDataFinal('');
    setSoProblemas(false);
  }

  async function baixar(fatura: Fatura) {
    setErroDeDownload(false);
    try {
      const response = await api.get(`/invoice/${fatura.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fatura.xmlFileName || 'arquivo';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErroDeDownload(true);
    }
  }

  const acoes = {
    comProblema: (fatura: Fatura) => comProblema.has(fatura.id),
    aoAbrir: setVendo,
    aoEditar: (fatura: Fatura) => {
      salvar.reset();
      setEditando(fatura);
    },
    aoExcluir: (fatura: Fatura) => {
      excluir.reset();
      setExcluindo(fatura);
    },
    aoBaixar: baixar,
  };

  return (
    <div className="animate-rise">
      <CabecalhoDePagina
        titulo="Faturas"
        descricao="Faturas recebidas pelos links de coleta, com os dados extraídos automaticamente de cada arquivo."
      >
        {comProblema.size > 0 && (
          <Botao
            variante={soProblemas ? 'perigo' : 'alerta'}
            icone={AlertTriangle}
            onClick={() => setSoProblemas((atual) => !atual)}
            aria-pressed={soProblemas}
          >
            {soProblemas
              ? 'Voltar para todas'
              : `${comProblema.size} ${comProblema.size === 1 ? 'fatura com problema' : 'faturas com problema'}`}
          </Botao>
        )}
        <Botao icone={Link2} onClick={() => router.push('/hub/links')}>
          Gerenciar links
        </Botao>
        <Botao variante="primario" icone={Link2} onClick={() => setGerandoLink(true)}>
          Gerar link de coleta
        </Botao>
      </CabecalhoDePagina>

      {erroDeDownload && (
        <Aviso tipo="erro" className="mt-5">
          O arquivo desta fatura não está disponível para download.
        </Aviso>
      )}

      {(empresas.length > 0 || temFiltro) && (
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <FiltroSuspenso
            icone={Building2}
            rotuloTodos="Todas as empresas"
            opcoes={empresas}
            valor={empresa}
            aoMudar={(nova) => {
              setEmpresa(nova);
              setLocal(null);
            }}
          />

          {empresa && locais.length > 0 && (
            <FiltroSuspenso icone={MapPin} rotuloTodos="Todos os locais" opcoes={locais} valor={local} aoMudar={setLocal} />
          )}

          <div className="flex h-10 items-center gap-2 rounded-xl border border-hairline px-3 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="date"
              value={dataInicial}
              onChange={(evento) => setDataInicial(evento.target.value)}
              aria-label="Emissão a partir de"
              className="bg-transparent text-graphite focus:outline-none"
            />
            <span className="text-muted">até</span>
            <input
              type="date"
              value={dataFinal}
              onChange={(evento) => setDataFinal(evento.target.value)}
              aria-label="Emissão até"
              className="bg-transparent text-graphite focus:outline-none"
            />
          </div>

          {temFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-muted transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtros
            </button>
          )}

          <span className="ml-auto text-[13px] tabular-nums text-muted">
            {visiveis.length} {visiveis.length === 1 ? 'fatura' : 'faturas'}
          </span>

          <div className="flex rounded-xl border border-hairline p-1" role="group" aria-label="Modo de exibição">
            <BotaoDeModo icone={LayoutGrid} rotulo="Exibir em cartões" ativo={modo === 'grade'} onClick={() => setModo('grade')} />
            <BotaoDeModo icone={List} rotulo="Exibir em tabela" ativo={modo === 'tabela'} onClick={() => setModo('tabela')} />
          </div>
        </div>
      )}

      <div className="mt-5">
        {isLoading ? (
          <div className="flex justify-center py-24 text-muted" role="status" aria-label="Carregando faturas">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <Aviso tipo="erro">Não foi possível carregar as faturas. Recarregue a página para tentar de novo.</Aviso>
        ) : !faturas?.length ? (
          <div className="card">
            <EstadoVazio
              icone={FileText}
              titulo="Nenhuma fatura recebida"
              descricao="Gere um link de coleta e envie para a filial. Assim que um arquivo for anexado, a fatura aparece aqui."
            >
              <Botao variante="tech" icone={Link2} onClick={() => setGerandoLink(true)}>
                Criar primeiro link
              </Botao>
            </EstadoVazio>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="card">
            <EstadoVazio icone={SearchX} titulo="Nenhuma fatura encontrada" descricao="Nenhuma fatura corresponde aos filtros aplicados.">
              {temFiltro && (
                <button type="button" onClick={limparFiltros} className="text-sm font-semibold text-tech hover:underline">
                  Limpar filtros
                </button>
              )}
            </EstadoVazio>
          </div>
        ) : modo === 'tabela' ? (
          <TabelaDeFaturas faturas={visiveis} {...acoes} />
        ) : (
          <GradeDeFaturas faturas={visiveis} {...acoes} />
        )}
      </div>

      <ModalGerarLink isOpen={gerandoLink} onClose={() => setGerandoLink(false)} />

      {vendo && (
        <ModalVerFatura
          fatura={vendo}
          aoFechar={() => setVendo(null)}
          aoBaixar={() => baixar(vendo)}
          aoEditar={() => {
            salvar.reset();
            setEditando(vendo);
            setVendo(null);
          }}
        />
      )}

      {editando && (
        <ModalEditarFatura
          fatura={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(dados) => salvar.mutate({ id: editando.id, dados })}
          salvando={salvar.isPending}
          erro={salvar.isError ? 'Não foi possível salvar as alterações. Tente novamente.' : null}
        />
      )}

      {excluindo && (
        <Confirmacao
          titulo="Excluir fatura?"
          rotuloConfirmar="Excluir"
          variante="perigo"
          aoConfirmar={() => excluir.mutate(excluindo.id)}
          aoFechar={() => setExcluindo(null)}
          carregando={excluir.isPending}
          erro={excluir.isError ? 'Não foi possível excluir a fatura. Tente novamente.' : null}
        >
          <p>
            O registro de <strong className="text-white">{empresaDaFatura(excluindo) || 'empresa não informada'}</strong>
            {excluindo.faturaNumber && <> (fatura nº {excluindo.faturaNumber})</>} será excluído permanentemente. Esta
            ação não pode ser desfeita.
          </p>
        </Confirmacao>
      )}
    </div>
  );
}

interface BotaoDeModoProps {
  icone: typeof List;
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
}

function BotaoDeModo({ icone: Icone, rotulo, ativo, onClick }: BotaoDeModoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors ${
        ativo ? 'bg-tech/15 text-tech-100' : 'text-muted hover:bg-raised hover:text-white'
      }`}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
