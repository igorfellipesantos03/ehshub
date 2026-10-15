'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { CheckCircle, Pencil, Plus, Shield, Trash2, Users, XCircle } from 'lucide-react';
import { useUserStore, type User } from '@/store/userStore';
import { CabecalhoDePagina } from '@/components/ui/CabecalhoDePagina';
import { Botao, BotaoDeIcone } from '@/components/ui/Botao';
import { Confirmacao, Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Campo';
import { Aviso, EstadoVazio, Spinner } from '@/components/ui/Feedback';
import { iniciais } from '@/lib/formato';

interface Formulario {
  name: string;
  email: string;
  password: string;
  role: User['role'];
  status: User['status'];
}

const PAPEIS: Record<User['role'], string> = {
  ADMIN: 'Administrador',
  REVIEWER: 'Revisor',
  USER: 'EHS',
};

const STATUS: Record<User['status'], { rotulo: string; estilo: string }> = {
  APPROVED: { rotulo: 'Aprovado', estilo: 'bg-success/15 text-emerald-200' },
  PENDING: { rotulo: 'Pendente', estilo: 'bg-amber/15 text-amber' },
  REJECTED: { rotulo: 'Rejeitado', estilo: 'bg-danger/15 text-danger-200' },
};

export default function UsersPage() {
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deleteUser, changeStatus } = useUserStore();

  // `null` = janela fechada; 'novo' = cadastro; usuário = edição.
  const [formularioDe, setFormularioDe] = useState<User | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function salvar(dados: Formulario) {
    try {
      if (formularioDe === 'novo') {
        await createUser(dados);
      } else if (formularioDe) {
        // Senha em branco na edição mantém a atual.
        const { password, ...semSenha } = dados;
        await updateUser(formularioDe.id, password ? dados : semSenha);
      }
      setFormularioDe(null);
    } catch {
      // O erro fica no store e aparece dentro da janela.
    }
  }

  async function excluir() {
    if (!excluindo) return;
    try {
      await deleteUser(excluindo.id);
      setExcluindo(null);
    } catch {
      // O erro fica no store e aparece dentro da janela.
    }
  }

  // Aprovar/rejeitar não abre janela: se falhar, o erro do store aparece no topo da página.
  const mudarStatus = (id: string, status: 'APPROVED' | 'REJECTED') => changeStatus(id, status).catch(() => {});

  const janelaAberta = formularioDe !== null || excluindo !== null;

  return (
    <div className="animate-rise">
      <CabecalhoDePagina
        titulo="Usuários"
        descricao="Controle de acessos, permissões e aprovação de novos registros."
      >
        <Botao variante="primario" icone={Plus} onClick={() => setFormularioDe('novo')}>
          Novo usuário
        </Botao>
      </CabecalhoDePagina>

      {error && !janelaAberta && (
        <Aviso tipo="erro" className="mt-5">
          {error}
        </Aviso>
      )}

      <div className="card mt-7 overflow-hidden">
        {isLoading && users.length === 0 ? (
          <div className="flex justify-center py-24 text-muted" role="status" aria-label="Carregando usuários">
            <Spinner className="h-8 w-8" />
          </div>
        ) : users.length === 0 ? (
          <EstadoVazio icone={Users} titulo="Nenhum usuário encontrado" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline text-[12.5px] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Usuário</th>
                  <th className="px-4 py-3 font-semibold">Permissão</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-raised/50">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tech/15 text-[13px] font-bold text-tech-100 ring-1 ring-tech/25"
                          aria-hidden="true"
                        >
                          {iniciais(user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-graphite">{user.name}</span>
                          <span className="block truncate text-xs text-muted">{user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-2 ${user.role === 'ADMIN' ? 'text-tech-100' : 'text-graphite/90'}`}>
                        <Shield
                          className={`h-4 w-4 shrink-0 ${user.role === 'ADMIN' ? 'text-tech' : 'text-muted'}`}
                          aria-hidden="true"
                        />
                        {PAPEIS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className={`pill ${STATUS[user.status]?.estilo ?? ''}`}>
                          {STATUS[user.status]?.rotulo ?? user.status}
                        </span>
                        {user.status === 'PENDING' && (
                          <>
                            <BotaoDeIcone
                              icone={CheckCircle}
                              rotulo="Aprovar usuário"
                              variante="sucesso"
                              onClick={() => mudarStatus(user.id, 'APPROVED')}
                            />
                            <BotaoDeIcone
                              icone={XCircle}
                              rotulo="Rejeitar usuário"
                              variante="perigo"
                              onClick={() => mudarStatus(user.id, 'REJECTED')}
                            />
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <BotaoDeIcone icone={Pencil} rotulo="Editar usuário" onClick={() => setFormularioDe(user)} />
                        <BotaoDeIcone
                          icone={Trash2}
                          rotulo="Excluir usuário"
                          variante="perigo"
                          onClick={() => setExcluindo(user)}
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
          aoSalvar={salvar}
          salvando={isLoading}
          erro={error}
        />
      )}

      {excluindo && (
        <Confirmacao
          titulo="Excluir usuário?"
          rotuloConfirmar="Excluir"
          variante="perigo"
          aoConfirmar={excluir}
          aoFechar={() => setExcluindo(null)}
          carregando={isLoading}
          erro={error}
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

interface ModalDeUsuarioProps {
  /** Usuário em edição; `null` para um cadastro novo. */
  usuario: User | null;
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
  // O store guarda o último erro de qualquer operação: só vale o que acontecer depois de enviar.
  const [enviado, setEnviado] = useState(false);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviado(true);
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
            onChange={(e) => setDados({ ...dados, role: e.target.value as User['role'] })}
          >
            <option value="USER">EHS (normal)</option>
            <option value="REVIEWER">Revisor</option>
            <option value="ADMIN">Administrador</option>
          </Select>
          <Select
            rotulo="Status"
            value={dados.status}
            onChange={(e) => setDados({ ...dados, status: e.target.value as User['status'] })}
          >
            <option value="APPROVED">Aprovado</option>
            <option value="PENDING">Pendente</option>
            <option value="REJECTED">Rejeitado</option>
          </Select>
        </div>

        {enviado && erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>
    </Modal>
  );
}
