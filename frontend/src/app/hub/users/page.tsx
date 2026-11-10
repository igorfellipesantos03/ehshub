'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CheckCircle, Pencil, Plus, SearchX, Trash2, Users, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao, BotaoDeIcone } from '@/components/ui/Botao';
import { CampoDeBusca, Input, Select } from '@/components/ui/Campo';
import { Confirmacao, Modal } from '@/components/ui/Modal';
import { Aviso, CarregandoArea, EstadoVazio, Selo, type TomDeSelo } from '@/components/ui/Feedback';
import { normalizarBusca } from '@/features/faturas/fatura';
import { formatarDataHora, iniciais } from '@/lib/formato';

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'REVIEWER' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface Formulario {
  name: string;
  email: string;
  password: string;
  role: Usuario['role'];
  status: Usuario['status'];
}

const PAPEIS: Record<Usuario['role'], string> = {
  ADMIN: 'Administrador',
  REVIEWER: 'Revisor',
  USER: 'EHS',
};

const STATUS: Record<Usuario['status'], { rotulo: string; tom: TomDeSelo }> = {
  APPROVED: { rotulo: 'Aprovado', tom: 'sucesso' },
  PENDING: { rotulo: 'Pendente', tom: 'alerta' },
  REJECTED: { rotulo: 'Rejeitado', tom: 'perigo' },
};

const mensagemDaApi = (falha: unknown, padrao: string) =>
  (isAxiosError(falha) && (falha.response?.data as { error?: string } | undefined)?.error) || padrao;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<'todos' | 'pendentes'>('todos');
  const [busca, setBusca] = useState('');
  // `null` = janela fechada; 'novo' = cadastro; usuário = edição.
  const [formularioDe, setFormularioDe] = useState<Usuario | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<Usuario | null>(null);

  const { data: usuarios, isLoading, isError } = useQuery<Usuario[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const salvar = useMutation({
    mutationFn: async (dados: Formulario) => {
      if (formularioDe === 'novo') return api.post('/users', dados);
      // Senha em branco na edição mantém a atual.
      const { password, ...semSenha } = dados;
      return api.put(`/users/${(formularioDe as Usuario).id}`, password ? dados : semSenha);
    },
    onSuccess: () => {
      recarregar();
      setFormularioDe(null);
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      recarregar();
      setExcluindo(null);
    },
  });

  // Aprovar/rejeitar não abre janela: se falhar, o erro aparece no topo da página.
  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: recarregar,
  });

  const pendentes = (usuarios ?? []).filter((usuario) => usuario.status === 'PENDING').length;

  const listados = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return (usuarios ?? []).filter(
      (usuario) =>
        (aba === 'todos' || usuario.status === 'PENDING') &&
        (!termo || normalizarBusca(`${usuario.name} ${usuario.email}`).includes(termo)),
    );
  }, [usuarios, aba, busca]);

  return (
    <div className="animate-rise space-y-5">
      <CabecalhoDePagina titulo="Usuários" descricao="Acessos ao EHS Hub, permissões e aprovação de novos cadastros.">
        <Botao
          variante="primario"
          icone={Plus}
          onClick={() => {
            salvar.reset();
            setFormularioDe('novo');
          }}
        >
          Novo usuário
        </Botao>
      </CabecalhoDePagina>

      {mudarStatus.isError && (
        <Aviso tipo="erro">{mensagemDaApi(mudarStatus.error, 'Não foi possível mudar o status do usuário.')}</Aviso>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-3">
          <div className="flex gap-1" role="tablist" aria-label="Usuários">
            <Aba ativa={aba === 'todos'} onClick={() => setAba('todos')} contagem={usuarios?.length ?? 0}>
              Todos
            </Aba>
            <Aba ativa={aba === 'pendentes'} onClick={() => setAba('pendentes')} contagem={pendentes} alerta>
              Aguardando aprovação
            </Aba>
          </div>
          <CampoDeBusca valor={busca} aoMudar={setBusca} placeholder="Buscar nome ou e-mail…" className="mb-2.5 w-full sm:mb-0 sm:ml-auto sm:w-64" />
        </div>

        {isLoading ? (
          <CarregandoArea rotulo="Carregando usuários" />
        ) : isError ? (
          <div className="p-4">
            <Aviso tipo="erro">Não foi possível carregar os usuários. Recarregue a página para tentar de novo.</Aviso>
          </div>
        ) : listados.length === 0 ? (
          busca ? (
            <EstadoVazio icone={SearchX} titulo="Nenhum usuário encontrado" descricao="Ninguém corresponde à busca." />
          ) : (
            <EstadoVazio
              icone={Users}
              titulo={aba === 'pendentes' ? 'Nenhum cadastro aguardando' : 'Nenhum usuário'}
              descricao={aba === 'pendentes' ? 'Os pedidos de acesso feitos na tela de login aparecem aqui.' : undefined}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Permissão</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {listados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tech/15 text-[11px] font-bold text-tech-100 ring-1 ring-tech/25"
                          aria-hidden="true"
                        >
                          {iniciais(usuario.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-graphite">{usuario.name}</span>
                          <span className="block truncate text-xs text-muted">{usuario.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className={usuario.role === 'ADMIN' ? 'font-semibold text-tech-100' : 'text-graphite/90'}>
                      {PAPEIS[usuario.role] ?? usuario.role}
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Selo tom={STATUS[usuario.status]?.tom} ponto>
                          {STATUS[usuario.status]?.rotulo ?? usuario.status}
                        </Selo>
                        {usuario.status === 'PENDING' && (
                          <>
                            <BotaoDeIcone
                              icone={CheckCircle}
                              rotulo="Aprovar usuário"
                              variante="sucesso"
                              onClick={() => mudarStatus.mutate({ id: usuario.id, status: 'APPROVED' })}
                              disabled={mudarStatus.isPending}
                            />
                            <BotaoDeIcone
                              icone={XCircle}
                              rotulo="Rejeitar usuário"
                              variante="perigo"
                              onClick={() => mudarStatus.mutate({ id: usuario.id, status: 'REJECTED' })}
                              disabled={mudarStatus.isPending}
                            />
                          </>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs tabular-nums text-muted">
                      {usuario.createdAt ? formatarDataHora(usuario.createdAt) : '—'}
                    </td>
                    <td className="w-px">
                      <div className="flex items-center justify-end gap-1">
                        <BotaoDeIcone
                          icone={Pencil}
                          rotulo="Editar usuário"
                          onClick={() => {
                            salvar.reset();
                            setFormularioDe(usuario);
                          }}
                        />
                        <BotaoDeIcone
                          icone={Trash2}
                          rotulo="Excluir usuário"
                          variante="perigo"
                          onClick={() => {
                            excluir.reset();
                            setExcluindo(usuario);
                          }}
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

      {formularioDe !== null && (
        <ModalDeUsuario
          usuario={formularioDe === 'novo' ? null : formularioDe}
          aoFechar={() => setFormularioDe(null)}
          aoSalvar={(dados) => salvar.mutate(dados)}
          salvando={salvar.isPending}
          erro={salvar.isError ? mensagemDaApi(salvar.error, 'Não foi possível salvar o usuário.') : null}
        />
      )}

      {excluindo && (
        <Confirmacao
          titulo="Excluir usuário?"
          rotuloConfirmar="Excluir"
          variante="perigo"
          aoConfirmar={() => excluir.mutate(excluindo.id)}
          aoFechar={() => setExcluindo(null)}
          carregando={excluir.isPending}
          erro={excluir.isError ? mensagemDaApi(excluir.error, 'Não foi possível excluir o usuário.') : null}
        >
          <p>
            <strong className="text-white">{excluindo.name}</strong> perde o acesso ao sistema permanentemente. Esta
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
  alerta?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

interface ModalDeUsuarioProps {
  /** Usuário em edição; `null` para um cadastro novo. */
  usuario: Usuario | null;
  aoFechar: () => void;
  aoSalvar: (dados: Formulario) => void;
  salvando: boolean;
  erro: string | null;
}

function ModalDeUsuario({ usuario, aoFechar, aoSalvar, salvando, erro }: ModalDeUsuarioProps) {
  const formularioId = useId();
  const [dados, setDados] = useState<Formulario>({
    name: usuario?.name ?? '',
    email: usuario?.email ?? '',
    password: '',
    role: usuario?.role ?? 'USER',
    status: usuario?.status ?? 'APPROVED',
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    aoSalvar(dados);
  }

  return (
    <Modal
      titulo={usuario ? 'Editar usuário' : 'Novo usuário'}
      aoFechar={salvando ? () => {} : aoFechar}
      largura="max-w-md"
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={formularioId} variante="primario" carregando={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id={formularioId} onSubmit={enviar} className="space-y-4">
        <Input
          rotulo="Nome"
          required
          value={dados.name}
          onChange={(e) => setDados({ ...dados, name: e.target.value })}
          placeholder="Nome completo"
        />
        <Input
          rotulo="E-mail"
          type="email"
          required
          value={dados.email}
          onChange={(e) => setDados({ ...dados, email: e.target.value })}
          placeholder="email@conasa.com.br"
        />
        <Input
          rotulo="Senha"
          type="password"
          required={!usuario}
          value={dados.password}
          onChange={(e) => setDados({ ...dados, password: e.target.value })}
          dica={usuario ? 'Deixe em branco para manter a senha atual.' : undefined}
          autoComplete="new-password"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            rotulo="Permissão"
            value={dados.role}
            onChange={(e) => setDados({ ...dados, role: e.target.value as Usuario['role'] })}
          >
            <option value="USER">EHS (normal)</option>
            <option value="REVIEWER">Revisor</option>
            <option value="ADMIN">Administrador</option>
          </Select>
          <Select
            rotulo="Status"
            value={dados.status}
            onChange={(e) => setDados({ ...dados, status: e.target.value as Usuario['status'] })}
          >
            <option value="APPROVED">Aprovado</option>
            <option value="PENDING">Pendente</option>
            <option value="REJECTED">Rejeitado</option>
          </Select>
        </div>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>
    </Modal>
  );
}
