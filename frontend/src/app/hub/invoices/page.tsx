'use client';

import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, FileSpreadsheet, FileText, Inbox, Link2, MapPin, SearchX, X } from 'lucide-react';
import api from '@/lib/api';
import { useUsuario } from '@/lib/sessao';
import ModalGerarLink from '@/components/ui/ModalGerarLink';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao } from '@/components/ui/Botao';
import { CampoDeBusca } from '@/components/ui/Campo';
import { Confirmacao } from '@/components/ui/Modal';
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso';
import { Paginacao } from '@/components/ui/Paginacao';
import { Aviso, CarregandoArea, EstadoVazio } from '@/components/ui/Feedback';
import {
  ROTULOS_DE_ORIGEM,
  emissaoIso,
  empresaDaFatura,
  localDaFatura,
  normalizarBusca,
  textoDeBusca,
  type Fatura,
  type OrigemDaFatura,
} from '@/features/faturas/fatura';
import {
  ordenarLinhas,
  TabelaDeFaturas,
  type CampoDeOrdenacao,
  type LinhaDeFatura,
  type Ordenacao,
} from '@/features/faturas/ListaDeFaturas';
import { GavetaDaFatura } from '@/features/faturas/GavetaDaFatura';
import { ModalEditarFatura } from '@/features/faturas/ModalEditarFatura';
import { PainelDeProcessamento } from '@/features/faturas/PainelDeProcessamento';
import { situacaoDaFatura } from '@/features/faturas/processamento';
import { precisaDeAtencao } from '@/features/faturas/indicadores';
import { baixarArquivoDaFatura, exportarCsv } from '@/features/faturas/arquivos';
import { useFaturas } from '@/features/faturas/useFaturas';

const POR_PAGINA = 50;

type Visao = 'todas' | 'atencao' | 'processamento';

const VISOES: Record<Visao, (linha: LinhaDeFatura) => boolean> = {
  todas: () => true,
  atencao: precisaDeAtencao,
  processamento: ({ situacao }) => situacao === 'processando' || situacao === 'naFila',
};

const ehVisao = (valor: string | null): valor is Visao => valor !== null && valor in VISOES;

export default function InvoicesPage() {
  // useSearchParams pede um Suspense acima dele para a página poder ser pré-renderizada.
  return (
    <Suspense fallback={<CarregandoArea rotulo="Carregando faturas" />}>
      <Faturas />
    </Suspense>
  );
}

function Faturas() {
  const queryClient = useQueryClient();
  const usuario = useUsuario();
  const admin = usuario?.role === 'ADMIN';
  const parametros = useSearchParams();
  const { faturas, processamento, agora, isLoading, isError } = useFaturas(admin);

  // O Painel abre esta tela já numa visão (ex: ?visao=atencao).
  const [visao, setVisao] = useState<Visao>(() => {
    const pedida = parametros.get('visao');
    return ehVisao(pedida) ? pedida : 'todas';
  });
  const [busca, setBusca] = useState('');
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [origem, setOrigem] = useState<OrigemDaFatura | null>(null);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({ campo: 'recebida', direcao: 'desc' });
  const [pagina, setPagina] = useState(1);

  const [gerandoLink, setGerandoLink] = useState(false);
  // Guarda o id: a gaveta acompanha a fatura quando ela muda em tempo real. O Painel abre uma direto (?fatura=id).
  const [vendoId, setVendoId] = useState<string | null>(() => parametros.get('fatura'));
  const [editando, setEditando] = useState<Fatura | null>(null);
  const [excluindo, setExcluindo] = useState<Fatura | null>(null);
  const [erroDeDownload, setErroDeDownload] = useState(false);

  // Qualquer mudança de filtro volta para a primeira página.
  function filtrar(aplicar: () => void) {
    aplicar();
    setPagina(1);
  }

  const salvar = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Fatura> }) => (await api.put(`/invoice/${id}`, dados)).data,
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
      setVendoId(null);
    },
  });

  const linhas = useMemo<LinhaDeFatura[]>(
    () => (faturas ?? []).map((fatura) => ({ fatura, situacao: situacaoDaFatura(fatura, processamento) })),
    [faturas, processamento],
  );

  const contagem = useMemo(
    () => ({
      todas: linhas.length,
      atencao: linhas.filter(VISOES.atencao).length,
      processamento: linhas.filter(VISOES.processamento).length,
    }),
    [linhas],
  );

  const empresas = useMemo(() => [...new Set(linhas.map(({ fatura }) => empresaDaFatura(fatura)).filter(Boolean))].sort(), [linhas]);

  // Os locais dependem da empresa escolhida.
  const locais = useMemo(() => {
    if (!empresa) return [];
    const daEmpresa = linhas.filter(({ fatura }) => empresaDaFatura(fatura) === empresa);
    return [...new Set(daEmpresa.map(({ fatura }) => localDaFatura(fatura)).filter(Boolean))].sort();
  }, [linhas, empresa]);

  const filtradas = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    const resultado = linhas.filter((linha) => {
      const { fatura } = linha;
      if (!VISOES[visao](linha)) return false;
      if (empresa && empresaDaFatura(fatura) !== empresa) return false;
      if (local && localDaFatura(fatura) !== local) return false;
      if (origem && fatura.origem !== origem) return false;
      if (dataInicial || dataFinal) {
        const emissao = emissaoIso(fatura.dataEmissao);
        if (!emissao) return false;
        if (dataInicial && emissao < dataInicial) return false;
        if (dataFinal && emissao > dataFinal) return false;
      }
      if (termo && !textoDeBusca(fatura).includes(termo)) return false;
      return true;
    });
    return ordenarLinhas(resultado, ordenacao);
  }, [linhas, visao, empresa, local, origem, dataInicial, dataFinal, busca, ordenacao]);

  const totalDePaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalDePaginas);
  const daPagina = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const vendo = linhas.find(({ fatura }) => fatura.id === vendoId) ?? null;
  const temFiltro = Boolean(busca || empresa || local || origem || dataInicial || dataFinal);

  function limparFiltros() {
    filtrar(() => {
      setBusca('');
      setEmpresa(null);
      setLocal(null);
      setOrigem(null);
      setDataInicial('');
      setDataFinal('');
    });
  }

  function ordenarPor(campo: CampoDeOrdenacao) {
    setOrdenacao((atual) =>
      atual.campo === campo
        ? { campo, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo, direcao: campo === 'empresa' ? 'asc' : 'desc' },
    );
  }

  async function baixar(fatura: Fatura) {
    setErroDeDownload(false);
    try {
      await baixarArquivoDaFatura(fatura);
    } catch {
      setErroDeDownload(true);
    }
  }

  if (usuario && !admin) {
    return <Aviso tipo="info">A lista de faturas é restrita a administradores.</Aviso>;
  }

  return (
    <div className="animate-rise space-y-5">
      <CabecalhoDePagina
        titulo="Faturas"
        descricao="Faturas recebidas do Protheus e dos links de coleta, com os dados lidos automaticamente de cada arquivo."
      >
        <Botao icone={FileSpreadsheet} onClick={() => exportarCsv(filtradas)} disabled={filtradas.length === 0}>
          Exportar CSV
        </Botao>
        <Botao icone={Link2} onClick={() => setGerandoLink(true)}>
          Gerar link de coleta
        </Botao>
      </CabecalhoDePagina>

      {erroDeDownload && <Aviso tipo="erro">O arquivo desta fatura não está disponível para download.</Aviso>}

      <PainelDeProcessamento situacao={processamento} agora={agora} />

      <div className="card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-hairline px-3" role="tablist" aria-label="Visão das faturas">
          <Aba ativa={visao === 'todas'} contagem={contagem.todas} onClick={() => filtrar(() => setVisao('todas'))}>
            Todas
          </Aba>
          <Aba
            ativa={visao === 'atencao'}
            contagem={contagem.atencao}
            alerta
            onClick={() => filtrar(() => setVisao('atencao'))}
          >
            Precisam de atenção
          </Aba>
          <Aba
            ativa={visao === 'processamento'}
            contagem={contagem.processamento}
            onClick={() => filtrar(() => setVisao('processamento'))}
          >
            Em processamento
          </Aba>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-deep/40 px-3 py-2.5">
          <CampoDeBusca
            valor={busca}
            aoMudar={(valor) => filtrar(() => setBusca(valor))}
            placeholder="Buscar emitente, nº, UC, documento…"
            className="w-full sm:w-72"
          />
          <FiltroSuspenso
            icone={Building2}
            rotuloTodos="Empresa"
            opcoes={empresas}
            valor={empresa}
            aoMudar={(nova) =>
              filtrar(() => {
                setEmpresa(nova);
                setLocal(null);
              })
            }
          />
          {empresa && locais.length > 0 && (
            <FiltroSuspenso
              icone={MapPin}
              rotuloTodos="Local"
              opcoes={locais}
              valor={local}
              aoMudar={(novo) => filtrar(() => setLocal(novo))}
            />
          )}
          <FiltroSuspenso
            icone={Inbox}
            rotuloTodos="Origem"
            opcoes={Object.values(ROTULOS_DE_ORIGEM)}
            valor={origem ? ROTULOS_DE_ORIGEM[origem] : null}
            aoMudar={(rotulo) =>
              filtrar(() => {
                const escolhida = (Object.keys(ROTULOS_DE_ORIGEM) as OrigemDaFatura[]).find(
                  (chave) => ROTULOS_DE_ORIGEM[chave] === rotulo,
                );
                setOrigem(escolhida ?? null);
              })
            }
          />
          <div
            className={`flex h-9 items-center gap-2 rounded-control border px-2.5 text-[13px] ${
              dataInicial || dataFinal ? 'border-tech/40 bg-tech/10' : 'border-hairline bg-surface'
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="text-muted">Emissão</span>
            <input
              type="date"
              value={dataInicial}
              onChange={(evento) => filtrar(() => setDataInicial(evento.target.value))}
              aria-label="Emissão a partir de"
              className="bg-transparent text-graphite focus:outline-none"
            />
            <span className="text-muted">até</span>
            <input
              type="date"
              value={dataFinal}
              onChange={(evento) => filtrar(() => setDataFinal(evento.target.value))}
              aria-label="Emissão até"
              className="bg-transparent text-graphite focus:outline-none"
            />
          </div>
          {temFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-[13px] font-semibold text-muted transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar
            </button>
          )}
          <span className="ml-auto text-xs tabular-nums text-muted">
            {filtradas.length} {filtradas.length === 1 ? 'fatura' : 'faturas'}
          </span>
        </div>

        {isLoading || !usuario ? (
          <CarregandoArea rotulo="Carregando faturas" />
        ) : isError ? (
          <div className="p-4">
            <Aviso tipo="erro">Não foi possível carregar as faturas. Recarregue a página para tentar de novo.</Aviso>
          </div>
        ) : linhas.length === 0 ? (
          <EstadoVazio
            icone={FileText}
            titulo="Nenhuma fatura recebida"
            descricao="As faturas chegam pela integração com o Protheus ou pelos links de coleta enviados às filiais."
          />
        ) : filtradas.length === 0 ? (
          <EstadoVazio
            icone={SearchX}
            titulo="Nenhuma fatura encontrada"
            descricao={
              visao === 'atencao' && !temFiltro
                ? 'Nenhuma fatura com erro ou divergência. Tudo em dia.'
                : 'Nenhuma fatura corresponde à busca e aos filtros aplicados.'
            }
          >
            {temFiltro && (
              <button type="button" onClick={limparFiltros} className="text-sm font-semibold text-tech hover:underline">
                Limpar filtros
              </button>
            )}
          </EstadoVazio>
        ) : (
          <>
            <TabelaDeFaturas
              linhas={daPagina}
              ordenacao={ordenacao}
              aoOrdenar={ordenarPor}
              aoAbrir={(fatura) => setVendoId(fatura.id)}
              aoBaixar={baixar}
            />
            <Paginacao pagina={paginaAtual} totalDeItens={filtradas.length} porPagina={POR_PAGINA} aoMudar={setPagina} />
          </>
        )}
      </div>

      <ModalGerarLink isOpen={gerandoLink} onClose={() => setGerandoLink(false)} />

      {vendo && (
        <GavetaDaFatura
          fatura={vendo.fatura}
          situacao={vendo.situacao}
          agora={agora}
          aoFechar={() => setVendoId(null)}
          aoBaixar={() => baixar(vendo.fatura)}
          aoEditar={() => {
            salvar.reset();
            setEditando(vendo.fatura);
          }}
          aoExcluir={() => {
            excluir.reset();
            setExcluindo(vendo.fatura);
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

interface AbaProps {
  ativa: boolean;
  contagem: number;
  /** Contagem em destaque quando há algo a resolver. */
  alerta?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Aba({ ativa, contagem, alerta = false, onClick, children }: AbaProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={onClick}
      className={`relative flex h-11 shrink-0 items-center gap-2 px-3 text-[13px] font-semibold transition-colors ${
        ativa ? 'text-white' : 'text-muted hover:text-graphite'
      }`}
    >
      {children}
      <span
        className={`rounded-md px-1.5 text-[11px] tabular-nums leading-5 ${
          alerta && contagem > 0 ? 'bg-amber/15 text-amber' : 'bg-white/[0.06] text-muted'
        }`}
      >
        {contagem}
      </span>
      {ativa && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-tech" aria-hidden="true" />}
    </button>
  );
}
