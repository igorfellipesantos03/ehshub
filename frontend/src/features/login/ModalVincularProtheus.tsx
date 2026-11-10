'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { atualizarUsuario } from '@/lib/sessao';
import { Modal } from '@/components/ui/Modal';
import { Botao } from '@/components/ui/Botao';
import { Input } from '@/components/ui/Campo';
import { Aviso } from '@/components/ui/Feedback';

interface ModalVincularProtheusProps {
  /** Chamado ao fechar, com ou sem vínculo feito. */
  aoFechar: () => void;
  /** Depois do login a pergunta vem antes do formulário; pelo menu do usuário vai direto. */
  perguntarAntes?: boolean;
}

/**
 * Vincula o usuário do Protheus à conta. Com o vínculo, a pessoa entra no EHS
 * Hub direto pelo CentralHub (SSO). A senha vai só para o backend, que confere
 * no Protheus e a descarta.
 */
export function ModalVincularProtheus({ aoFechar, perguntarAntes = false }: ModalVincularProtheusProps) {
  const formularioId = useId();
  const [etapa, setEtapa] = useState<'pergunta' | 'formulario' | 'feito'>(perguntarAntes ? 'pergunta' : 'formulario');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  const vincular = useMutation({
    mutationFn: async () => api.post('/auth/protheus/link', { username: usuario.trim(), password: senha }),
    onSuccess: () => {
      atualizarUsuario({ protheusLinked: true });
      setEtapa('feito');
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    vincular.mutate();
  }

  const erro = vincular.isError
    ? (isAxiosError(vincular.error) && (vincular.error.response?.data as { error?: string } | undefined)?.error) ||
      'Não foi possível vincular. Confira o usuário e a senha e tente novamente.'
    : null;

  if (etapa === 'pergunta') {
    return (
      <Modal
        key="pergunta"
        titulo="Você tem login no Protheus?"
        aoFechar={aoFechar}
        largura="max-w-md"
        rodape={
          <>
            <Botao onClick={aoFechar}>Agora não</Botao>
            <Botao variante="primario" onClick={() => setEtapa('formulario')} data-autofoco>
              Vincular Protheus
            </Botao>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-graphite/90">
          Vinculando seu usuário do Protheus, você passa a entrar no EHS Hub direto pelo CentralHub, sem digitar senha.
        </p>
      </Modal>
    );
  }

  if (etapa === 'feito') {
    return (
      <Modal
        key="feito"
        titulo="Protheus vinculado"
        aoFechar={aoFechar}
        largura="max-w-md"
        rodape={
          <Botao variante="primario" onClick={aoFechar} data-autofoco>
            Continuar
          </Botao>
        }
      >
        <Aviso tipo="sucesso">A partir de agora você também pode entrar pelo CentralHub.</Aviso>
      </Modal>
    );
  }

  return (
    // `key` por etapa: cada etapa é uma janela nova, e o foco vai para o primeiro campo dela.
    <Modal
      key="formulario"
      titulo="Vincular usuário do Protheus"
      descricao="Use o mesmo usuário e senha do Protheus."
      aoFechar={vincular.isPending ? () => {} : aoFechar}
      largura="max-w-md"
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={vincular.isPending}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form={formularioId}
            variante="primario"
            icone={KeyRound}
            carregando={vincular.isPending}
            disabled={!usuario.trim() || !senha}
          >
            Vincular
          </Botao>
        </>
      }
    >
      <form id={formularioId} onSubmit={enviar} className="space-y-4">
        <Input
          rotulo="Usuário do Protheus"
          placeholder="nome.sobrenome"
          autoComplete="off"
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
        />
        <Input
          rotulo="Senha do Protheus"
          type="password"
          autoComplete="off"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>
    </Modal>
  );
}
