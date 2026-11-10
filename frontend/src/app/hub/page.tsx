'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, FileText, Inbox, Link2, Zap } from 'lucide-react';
import { useUsuario } from '@/lib/sessao';
import { formatarDataHora, formatarMoeda, formatarNumero } from '@/lib/formato';
import ModalGerarLink from '@/components/ui/ModalGerarLink';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao, classesDeBotao } from '@/components/ui/Botao';
import { Indicador } from '@/components/ui/Indicador';
import { Aviso, CarregandoArea, EstadoVazio } from '@/components/ui/Feedback';
import { divergenciasComProtheus, empresaDaFatura, localDaFatura } from '@/features/faturas/fatura';
import type { LinhaDeFatura } from '@/features/faturas/ListaDeFaturas';
import { PainelDeProcessamento } from '@/features/faturas/PainelDeProcessamento';
import { situacaoDaFatura } from '@/features/faturas/processamento';
import { precisaDeAtencao, resumoMensal, variacao } from '@/features/faturas/indicadores';
import { SeloDeOrigem, SeloDeSituacao } from '@/features/faturas/Selos';
import { useFaturas } from '@/features/faturas/useFaturas';

export default function Painel() {
  const usuario = useUsuario();
  const [gerandoLink, setGerandoLink] = useState(false);

  if (!usuario) return null;

  return (
    <>
      {usuario.role === 'ADMIN' ? (
        <PainelAdministrativo aoGerarLink={() => setGerandoLink(true)} />
      ) : (
        <PainelDeColeta aoGerarLink={() => setGerandoLink(true)} />
      )}
      <ModalGerarLink isOpen={gerandoLink} onClose={() => setGerandoLink(false)} />
    </>
  );
}

/** Quem não é administrador só gera links de coleta: a lista de faturas é restrita. */
function PainelDeColeta({ aoGerarLink }: { aoGerarLink: () => void }) {
  return (
    <div className="animate-rise space-y-5">
      <CabecalhoDePagina titulo="Painel" descricao="Colete faturas de energia das filiais pelos links de coleta." />
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-tech/12 text-tech">
          <Link2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="titulo-secao">Gerar link de coleta</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Crie o link de uma empresa ou filial e envie a quem vai anexar as faturas. As faturas enviadas entram
            direto na fila de leitura.
          </p>
        </div>
        <Botao variante="primario" icone={Link2} onClick={aoGerarLink}>
          Gerar link
        </Botao>
      </div>
    </div>
  );
}

function PainelAdministrativo({ aoGerarLink }: { aoGerarLink: () => void }) {
  const router = useRouter();
  const { faturas, processamento, agora, isLoading, isError } = useFaturas();

  const linhas = useMemo<LinhaDeFatura[]>(
    () => (faturas ?? []).map((fatura) => ({ fatura, situacao: situacaoDaFatura(fatura, processamento) })),
    [faturas, processamento],
  );
  const mensal = useMemo(() => resumoMensal(linhas, agora), [linhas, agora]);
  const pendentes = useMemo(() => linhas.filter(precisaDeAtencao), [linhas]);
  const recentes = useMemo(
    () => [...linhas].sort((a, b) => b.fatura.createdAt.localeCompare(a.fatura.createdAt)).slice(0, 8),
    [linhas],
  );

  const abrirFatura = (id: string) => router.push(`/hub/invoices?fatura=${id}`);
  const comErro = pendentes.filter(({ situacao }) => situacao !== 'divergente').length;
  const divergentes = pendentes.length - comErro;
  const { atual, anterior, nomeAtual, nomeAnterior } = mensal;

  return (
    <div className="animate-rise space-y-5">
      <CabecalhoDePagina titulo="Painel" descricao="Acompanhe o que chegou, o que está em leitura e o que precisa de conferência.">
        <Botao icone={Link2} onClick={aoGerarLink}>
          Gerar link de coleta
        </Botao>
        <Link href="/hub/invoices" className={classesDeBotao('primario')}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          Ver faturas
        </Link>
      </CabecalhoDePagina>

      {isError && <Aviso tipo="erro">Não foi possível carregar as faturas. Recarregue a página para tentar de novo.</Aviso>}

      {isLoading ? (
        <CarregandoArea rotulo="Carregando painel" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              rotulo={`Recebidas em ${nomeAtual}`}
              valor={formatarNumero(atual.recebidas)}
              icone={Inbox}
              rodape={`${atual.doProtheus} do Protheus · ${atual.porLink} por link`}
            />
            <Indicador
              rotulo={`Valor lido em ${nomeAtual}`}
              valor={formatarMoeda(atual.valor)}
              icone={Banknote}
              rodape={<Comparacao atual={atual.valor} anterior={anterior.valor} mes={nomeAnterior} />}
            />
            <Indicador
              rotulo={`Consumo em ${nomeAtual}`}
              valor={`${formatarNumero(Math.round(atual.consumoKwh))} kWh`}
              icone={Zap}
              rodape={<Comparacao atual={atual.consumoKwh} anterior={anterior.consumoKwh} mes={nomeAnterior} />}
            />
            <Indicador
              rotulo="Precisam de atenção"
              valor={formatarNumero(pendentes.length)}
              icone={pendentes.length > 0 ? AlertTriangle : CheckCircle2}
              destaque={comErro > 0 ? 'perigo' : divergentes > 0 ? 'alerta' : 'tech'}
              rodape={pendentes.length > 0 ? `${comErro} com erro · ${divergentes} divergentes` : 'Nenhuma pendência'}
              onClick={() => router.push('/hub/invoices?visao=atencao')}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Bloco
              titulo="Precisam de atenção"
              acao={pendentes.length > 0 && <LinkDoBloco href="/hub/invoices?visao=atencao">Ver todas</LinkDoBloco>}
              className="xl:col-span-2"
            >
              {pendentes.length === 0 ? (
                <EstadoVazio
                  icone={CheckCircle2}
                  titulo="Tudo em dia"
                  descricao="Nenhuma fatura com erro de leitura ou divergência com o Protheus."
                />
              ) : (
                <ul className="divide-y divide-hairline">
                  {pendentes.slice(0, 6).map((linha) => (
                    <li key={linha.fatura.id}>
                      <button
                        type="button"
                        onClick={() => abrirFatura(linha.fatura.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-raised/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-graphite">
                            {empresaDaFatura(linha.fatura) || '—'}
                            <span className="font-normal text-muted"> · {localDaFatura(linha.fatura) || 'local não informado'}</span>
                          </p>
                          <p className="truncate text-xs text-muted">{motivoDaPendencia(linha)}</p>
                        </div>
                        <SeloDeSituacao situacao={linha.situacao} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>

            <div className="space-y-5">
              {processamento.emAndamento.length + processamento.naFila.length > 0 ? (
                <PainelDeProcessamento situacao={processamento} agora={agora} abertoDeInicio />
              ) : (
                <div className="card flex items-center gap-3 px-4 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                  <div>
                    <h2 className="titulo-secao">Processamento</h2>
                    <p className="text-xs text-muted">Fila vazia: nenhuma fatura aguardando leitura.</p>
                  </div>
                </div>
              )}

              <Bloco titulo={`Valor por empresa em ${nomeAtual}`}>
                <ValorPorEmpresa empresas={mensal.porEmpresa} />
              </Bloco>
            </div>
          </div>

          <Bloco titulo="Recebidas recentemente" acao={<LinkDoBloco href="/hub/invoices">Ver todas as faturas</LinkDoBloco>}>
            {recentes.length === 0 ? (
              <EstadoVazio
                icone={FileText}
                titulo="Nenhuma fatura recebida"
                descricao="As faturas chegam pela integração com o Protheus ou pelos links de coleta."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Empresa / local</th>
                      <th>Emitente</th>
                      <th className="text-right">Valor</th>
                      <th>Origem</th>
                      <th>Situação</th>
                      <th>Recebida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentes.map(({ fatura, situacao }) => (
                      <tr key={fatura.id} onClick={() => abrirFatura(fatura.id)} className="cursor-pointer">
                        <td>
                          <span className="block max-w-[240px] truncate font-semibold text-graphite">
                            {empresaDaFatura(fatura) || '—'}
                          </span>
                          <span className="block max-w-[240px] truncate text-xs text-muted">{localDaFatura(fatura) || '—'}</span>
                        </td>
                        <td className="max-w-[220px] truncate text-graphite/90">
                          {fatura.emitente || <span className="text-muted">{fatura.xmlFileName || '—'}</span>}
                        </td>
                        <td className="numero font-semibold text-white">
                          {situacao === 'concluida' || situacao === 'divergente' ? formatarMoeda(fatura.valorFatura) : '—'}
                        </td>
                        <td>
                          <SeloDeOrigem fatura={fatura} />
                        </td>
                        <td>
                          <SeloDeSituacao situacao={situacao} />
                        </td>
                        <td className="whitespace-nowrap text-xs tabular-nums text-muted">{formatarDataHora(fatura.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Bloco>
        </>
      )}
    </div>
  );
}

function motivoDaPendencia({ fatura, situacao }: LinhaDeFatura) {
  if (situacao === 'divergente') return divergenciasComProtheus(fatura)[0];
  if (situacao === 'erro') return fatura.errorReason || 'Falha na leitura do arquivo.';
  if (situacao === 'parada') return 'O processamento começou e não terminou.';
  return 'A fila de processamento não anda.';
}

function Comparacao({ atual, anterior, mes }: { atual: number; anterior: number; mes: string }) {
  const percentual = variacao(atual, anterior);
  if (percentual === null) return <>Sem base em {mes}</>;
  const sinal = percentual > 0 ? '+' : '';
  return (
    <>
      {sinal}
      {percentual.toFixed(0)}% em relação a {mes}
    </>
  );
}

interface BlocoProps {
  titulo: string;
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}

function Bloco({ titulo, acao, className = '', children }: BlocoProps) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 className="titulo-secao">{titulo}</h2>
        {acao}
      </header>
      {children}
    </section>
  );
}

function LinkDoBloco({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-xs font-semibold text-tech hover:text-tech-100">
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** Barras horizontais de uma série só: o comprimento compara, o valor fica escrito ao lado. */
function ValorPorEmpresa({ empresas }: { empresas: { empresa: string; valor: number }[] }) {
  if (empresas.length === 0) {
    return <p className="px-4 py-6 text-center text-[13px] text-muted">Nenhuma fatura lida neste mês ainda.</p>;
  }

  const visiveis = empresas.slice(0, 5);
  const restantes = empresas.slice(5);
  const maior = visiveis[0].valor || 1;

  return (
    <ul className="space-y-3 px-4 py-4">
      {visiveis.map(({ empresa, valor }) => (
        <li key={empresa} title={`${empresa}: ${formatarMoeda(valor)}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-graphite">{empresa}</span>
            <span className="shrink-0 font-semibold tabular-nums text-white">{formatarMoeda(valor)}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-r bg-white/[0.05]">
            <div className="h-full rounded-r-[4px] bg-tech" style={{ width: `${Math.max((valor / maior) * 100, 1)}%` }} />
          </div>
        </li>
      ))}
      {restantes.length > 0 && (
        <li className="text-xs text-muted">
          + {restantes.length} {restantes.length === 1 ? 'empresa' : 'empresas'} (
          {formatarMoeda(restantes.reduce((soma, { valor }) => soma + valor, 0))})
        </li>
      )}
    </ul>
  );
}
