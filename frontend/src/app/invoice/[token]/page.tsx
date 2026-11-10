'use client';

import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Building2, FileText, Link2Off, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { formatarMoeda } from '@/lib/formato';
import { Botao } from '@/components/ui/Botao';
import { CONTROLE, Input } from '@/components/ui/Campo';
import { Aviso, CarregandoPagina, Selo, type TomDeSelo } from '@/components/ui/Feedback';
import { formatarConsumo } from '@/features/faturas/fatura';

const LOCAIS_POR_EMPRESA: Record<string, string[]> = {
  BR163: ['BSO01', 'BSO02', 'BSO03', 'BSO04', 'PP01', 'PP02', 'PP03', 'SEDE ADM - Relógio 01', 'SEDE ADM - Relógio 02', 'SEDE ADM - Relógio 03', 'SEDE ADM - Relógio 04'],
  MT100: ['P01', 'P02', 'BSO', 'GALPÃO CONSERVA', 'ESTAÇÃO DE RÁDIO BASE', 'BALANÇA', 'SEDE ADM'],
  MT246: ['P01', 'P02', 'P03', 'P04', 'ESCRITÓRIO/GALPÃO', 'ESTAÇÃO RÁDIO BASE', 'BALANÇA'],
  MT320: ['P01', 'P02', 'P03', 'BSO02', 'GALPÃO CONSERVA', 'BALANÇA 01', 'BALANÇA 03'],
  'ÁGUAS DE ITAPEMA': ['ADM', 'ÁGUA', 'ESGOTO'],
  SANETRAT: ['ADM'],
  ALEGRETE: ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'LUZ DE BELÉM': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'CARAGUÁ LUZ': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'ÁGUAS DO SERTÃO': ['ÁGUA', 'ESGOTO', 'ADM'],
  'URBELUZ BOA VISTA': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
};

const locaisDaEmpresa = (empresa: string) => {
  const nome = empresa.toUpperCase();
  return Object.entries(LOCAIS_POR_EMPRESA).find(([chave]) => nome.includes(chave))?.[1] ?? [];
};

const CHAVE_DO_NOME = 'ehs:nome-do-enviante';
const TAMANHO_MAXIMO = 15 * 1024 * 1024; // O mesmo limite do backend (config/multer.ts).
const EXTENSOES_ACEITAS = ['.pdf', '.xml', '.json'];

const mensagemDaApi = (falha: unknown, padrao: string) =>
  (isAxiosError(falha) && (falha.response?.data as { error?: string } | undefined)?.error) || padrao;

interface DadosDoLink {
  valid: boolean;
  reason?: string;
  empresa?: string;
  filial?: string | null;
}

/** Resultado de um arquivo enviado nesta visita. */
interface Envio {
  chave: string;
  nome: string;
  estado: 'enviando' | 'recebido' | 'falhou';
  faturaId?: string;
  /** XML/JSON são lidos na hora; PDF entra na fila do n8n. */
  dados?: StatusDaFatura;
  erro?: string;
}

interface StatusDaFatura {
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO_PROCESSAMENTO' | 'MANUAL';
  processamentoIniciadoEm?: string | null;
  errorReason?: string | null;
  emitente?: string | null;
  faturaNumber?: string | null;
  valorFatura?: number;
  consumoKwh?: number | null;
}

const lerNomeLembrado = () => {
  try {
    return localStorage.getItem(CHAVE_DO_NOME) ?? '';
  } catch {
    return '';
  }
};

export default function EnvioDeFaturas() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const { data: link, isLoading } = useQuery<DadosDoLink>({
    queryKey: ['invoice-token', token],
    queryFn: async () => (await api.get(`/invoice/validate/${token}`)).data,
    enabled: Boolean(token),
  });

  const [envios, setEnvios] = useState<Envio[]>([]);

  // O backend avisa quando o n8n termina: atualiza na hora, sem esperar o próximo ciclo da consulta.
  const temPendente = envios.some((envio) => envio.faturaId && envio.estado === 'recebido');
  useEffect(() => {
    if (!temPendente) return;
    socket.connect();
    const aoAtualizar = (fatura: { id?: string }) => {
      if (fatura?.id) queryClient.invalidateQueries({ queryKey: ['envio', fatura.id] });
    };
    socket.on('invoice_updated', aoAtualizar);
    return () => {
      socket.off('invoice_updated', aoAtualizar);
      socket.disconnect();
    };
  }, [temPendente, queryClient]);

  if (isLoading) return <CarregandoPagina />;

  if (!link?.valid) {
    return (
      <Pagina>
        <div className="card p-7 text-center">
          <Link2Off className="mx-auto h-9 w-9 text-danger-200" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-white">Link indisponível</h1>
          <p className="mt-1.5 text-sm text-muted">
            {link?.reason || 'Este link não é válido.'} Peça um novo link a quem enviou este.
          </p>
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <FormularioDeEnvio
        token={token}
        empresa={link.empresa ?? ''}
        filial={link.filial ?? null}
        aoEnviar={(novos) => setEnvios((atuais) => [...novos, ...atuais])}
        aoAtualizar={(chave, mudanca) =>
          setEnvios((atuais) => atuais.map((envio) => (envio.chave === chave ? { ...envio, ...mudanca } : envio)))
        }
      />

      {envios.length > 0 && (
        <section className="card mt-4 overflow-hidden" aria-label="Arquivos enviados">
          <header className="border-b border-hairline px-5 py-3">
            <h2 className="titulo-secao">Enviados agora</h2>
            <p className="mt-0.5 text-xs text-muted">
              Os PDFs entram numa fila de leitura automática. Pode fechar esta página: o processamento continua.
            </p>
          </header>
          <ul className="divide-y divide-hairline">
            {envios.map((envio) => (
              <ItemEnviado key={envio.chave} envio={envio} />
            ))}
          </ul>
        </section>
      )}
    </Pagina>
  );
}

function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl flex-1">
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo_da_jamile.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <span className="leading-none">
            <span className="block text-base font-extrabold tracking-[-0.02em] text-white">
              EHS <span className="text-tech">Hub</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted">Envio de faturas de energia</span>
          </span>
        </div>
        {children}
      </div>
      <p className="mt-10 text-center text-xs text-ink-400">Conasa Infraestrutura S.A.</p>
    </div>
  );
}

interface FormularioProps {
  token: string;
  empresa: string;
  filial: string | null;
  aoEnviar: (envios: Envio[]) => void;
  aoAtualizar: (chave: string, mudanca: Partial<Envio>) => void;
}

function FormularioDeEnvio({ token, empresa, filial, aoEnviar, aoAtualizar }: FormularioProps) {
  const locais = locaisDaEmpresa(empresa);
  const [nome, setNome] = useState(lerNomeLembrado);
  const [local, setLocal] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [recusados, setRecusados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const seletorRef = useRef<HTMLInputElement>(null);
  const localId = useId();

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const aceitos: File[] = [];
    const fora: string[] = [];
    for (const arquivo of Array.from(lista)) {
      const extensaoOk = EXTENSOES_ACEITAS.some((extensao) => arquivo.name.toLowerCase().endsWith(extensao));
      if (!extensaoOk) fora.push(`${arquivo.name}: formato não aceito`);
      else if (arquivo.size > TAMANHO_MAXIMO) fora.push(`${arquivo.name}: maior que 15 MB`);
      else aceitos.push(arquivo);
    }
    setRecusados(fora);
    // Mesmo nome e tamanho = mesmo arquivo escolhido de novo.
    setArquivos((atuais) => [
      ...atuais,
      ...aceitos.filter((novo) => !atuais.some((a) => a.name === novo.name && a.size === novo.size)),
    ]);
    if (seletorRef.current) seletorRef.current.value = '';
  }

  function aoSoltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastando(false);
    adicionar(evento.dataTransfer.files);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    try {
      localStorage.setItem(CHAVE_DO_NOME, nome.trim());
    } catch {
      // Sem storage: só não lembra o nome.
    }

    const lote = arquivos.map((arquivo, indice) => ({
      arquivo,
      envio: { chave: `${Date.now()}-${indice}`, nome: arquivo.name, estado: 'enviando' } as Envio,
    }));
    aoEnviar(lote.map(({ envio }) => envio));
    setArquivos([]);
    setRecusados([]);
    setEnviando(true);

    // Um por vez: o backend grava e enfileira cada arquivo na ordem em que chegou.
    for (const { arquivo, envio } of lote) {
      const pdf = arquivo.name.toLowerCase().endsWith('.pdf');
      const formulario = new FormData();
      formulario.append(pdf ? 'pdf' : 'xml', arquivo);
      formulario.append('token', token);
      formulario.append('senderName', nome.trim());
      if (local) formulario.append('local', local);

      try {
        const { data } = await api.post(pdf ? '/invoice/upload-pdf' : '/invoice/upload', formulario);
        aoAtualizar(
          envio.chave,
          pdf
            ? { estado: 'recebido', faturaId: data.faturaId }
            : { estado: 'recebido', dados: { status: 'MANUAL', ...data.data } },
        );
      } catch (falha) {
        aoAtualizar(envio.chave, { estado: 'falhou', erro: mensagemDaApi(falha, 'Não foi possível enviar o arquivo.') });
      }
    }
    setEnviando(false);
  }

  const podeEnviar = nome.trim() && arquivos.length > 0 && (locais.length === 0 || local) && !enviando;

  return (
    <form onSubmit={enviar} className="card overflow-hidden">
      <header className="border-b border-hairline px-5 py-4">
        <h1 className="text-lg font-bold text-white">Enviar faturas de energia</h1>
        <p className="mt-1 flex items-center gap-2 text-[13px] text-muted">
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {empresa}
            {filial && ` · ${filial}`}
          </span>
        </p>
      </header>

      <div className="space-y-4 px-5 py-5">
        <Input
          rotulo="Seu nome"
          required
          autoComplete="name"
          placeholder="Nome de quem está enviando"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />

        {locais.length > 0 && (
          <div>
            <label htmlFor={localId} className="mb-1.5 block text-[13px] font-semibold text-graphite">
              Local da fatura
            </label>
            <select id={localId} required value={local} onChange={(evento) => setLocal(evento.target.value)} className={CONTROLE}>
              <option value="">Selecione o local…</option>
              {locais.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
            {arquivos.length > 1 && (
              <span className="mt-1.5 block text-xs text-muted">O local vale para todos os arquivos deste envio.</span>
            )}
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-graphite">Arquivos</span>
          <label
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-6 py-8 text-center transition-colors ${
              arrastando ? 'border-tech bg-tech/10' : 'border-hairline bg-deep/50 hover:border-tech/50 hover:bg-deep'
            }`}
          >
            <Upload className={`h-7 w-7 ${arrastando ? 'text-tech' : 'text-muted'}`} aria-hidden="true" />
            <span className="mt-2.5 text-sm font-semibold text-graphite">Clique para escolher ou arraste os arquivos</span>
            <span className="mt-1 text-xs text-muted">PDF, XML ou JSON · até 15 MB cada · vários de uma vez</span>
            <input
              ref={seletorRef}
              type="file"
              multiple
              accept=".pdf,application/pdf,.xml,application/xml,text/xml,.json,application/json"
              onChange={(evento) => adicionar(evento.target.files)}
              className="sr-only"
            />
          </label>
        </div>

        {recusados.length > 0 && <Aviso tipo="alerta">{`Arquivos não adicionados:\n${recusados.join('\n')}`}</Aviso>}

        {arquivos.length > 0 && (
          <ul className="divide-y divide-hairline rounded-card border border-hairline">
            {arquivos.map((arquivo) => (
              <li key={`${arquivo.name}-${arquivo.size}`} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-graphite">{arquivo.name}</span>
                <span className="text-xs tabular-nums text-muted">{(arquivo.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={() => setArquivos((atuais) => atuais.filter((a) => a !== arquivo))}
                  aria-label={`Remover ${arquivo.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-danger/15 hover:text-danger-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-end gap-3 border-t border-hairline bg-deep/60 px-5 py-3">
        <Botao type="submit" variante="primario" icone={Upload} carregando={enviando} disabled={!podeEnviar}>
          {arquivos.length > 1 ? `Enviar ${arquivos.length} faturas` : 'Enviar fatura'}
        </Botao>
      </footer>
    </form>
  );
}

const ESTADOS_DO_ENVIO: Record<string, { rotulo: string; tom: TomDeSelo }> = {
  enviando: { rotulo: 'Enviando', tom: 'neutro' },
  falhou: { rotulo: 'Falha no envio', tom: 'perigo' },
  naFila: { rotulo: 'Na fila', tom: 'neutro' },
  processando: { rotulo: 'Processando', tom: 'tech' },
  concluida: { rotulo: 'Concluída', tom: 'sucesso' },
  erro: { rotulo: 'Erro na leitura', tom: 'perigo' },
};

function ItemEnviado({ envio }: { envio: Envio }) {
  // PDFs: consulta o status até a leitura terminar (o socket adianta quando pode).
  const { data } = useQuery<StatusDaFatura>({
    queryKey: ['envio', envio.faturaId],
    queryFn: async () => (await api.get(`/invoice/status/${envio.faturaId}`)).data,
    enabled: Boolean(envio.faturaId),
    refetchInterval: (consulta) => (consulta.state.data?.status === 'PROCESSANDO' || !consulta.state.data ? 5000 : false),
  });

  const fatura = envio.dados ?? data;
  const chave =
    envio.estado !== 'recebido'
      ? envio.estado
      : !fatura || fatura.status === 'PROCESSANDO'
        ? fatura?.processamentoIniciadoEm
          ? 'processando'
          : 'naFila'
        : fatura.status === 'ERRO_PROCESSAMENTO'
          ? 'erro'
          : 'concluida';
  const { rotulo, tom } = ESTADOS_DO_ENVIO[chave];

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-graphite">{envio.nome}</span>
        <Selo tom={tom} ponto>
          {rotulo}
        </Selo>
      </div>
      {chave === 'concluida' && fatura && (
        <p className="mt-1 pl-7 text-xs text-muted">
          {[fatura.emitente, fatura.faturaNumber && `Nº ${fatura.faturaNumber}`].filter(Boolean).join(' · ')}
          {' · '}
          <span className="font-semibold text-graphite">{formatarMoeda(fatura.valorFatura ?? 0)}</span>
          {fatura.consumoKwh ? ` · ${formatarConsumo(fatura.consumoKwh)}` : ''}
        </p>
      )}
      {chave === 'erro' && (
        <p className="mt-1 pl-7 text-xs text-danger-200">{fatura?.errorReason || 'Não foi possível ler este arquivo.'}</p>
      )}
      {chave === 'falhou' && <p className="mt-1 pl-7 text-xs text-danger-200">{envio.erro}</p>}
    </li>
  );
}
