'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Link2 } from 'lucide-react';
import { ASSETS, BRANCHES } from '@/lib/constants';
import api from '@/lib/api';
import { Modal } from './Modal';
import { Botao, BotaoDeIcone } from './Botao';
import { Select } from './Campo';
import { Aviso } from './Feedback';

interface ModalGerarLinkProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalGerarLink({ isOpen, onClose }: ModalGerarLinkProps) {
  // O conteúdo só existe enquanto a janela está aberta: reabrir começa do zero.
  if (!isOpen) return null;
  return <GerarLink aoFechar={onClose} />;
}

function GerarLink({ aoFechar }: { aoFechar: () => void }) {
  const queryClient = useQueryClient();
  const [empresa, setEmpresa] = useState('');
  const [filial, setFilial] = useState('');
  const [urlGerada, setUrlGerada] = useState('');
  const [jaExistia, setJaExistia] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const filiais = BRANCHES[empresa] || null;

  const gerar = useMutation({
    mutationFn: async () => {
      const ativo = ASSETS.find((item) => item.id === empresa);
      const response = await api.post('/invoice/links', {
        empresa: ativo ? `${ativo.id} - ${ativo.name}` : empresa,
        filial: filial || null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUrlGerada(data.url);
      setJaExistia(Boolean(data.existing));
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });

  const copiar = async () => {
    await navigator.clipboard.writeText(urlGerada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Modal
      titulo="Gerar link de coleta"
      descricao="Selecione a empresa e gere o link para o envio de faturas."
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar}>{urlGerada ? 'Fechar' : 'Cancelar'}</Botao>
          {!urlGerada && (
            <Botao
              variante="primario"
              icone={Link2}
              onClick={() => gerar.mutate()}
              disabled={!empresa}
              carregando={gerar.isPending}
            >
              Gerar link
            </Botao>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Select
          rotulo="Empresa"
          value={empresa}
          disabled={Boolean(urlGerada)}
          onChange={(evento) => {
            setEmpresa(evento.target.value);
            setFilial('');
          }}
        >
          <option value="">Selecione a empresa…</option>
          {ASSETS.map((ativo) => (
            <option key={ativo.id} value={ativo.id}>
              {ativo.id} - {ativo.name}
            </option>
          ))}
        </Select>

        {filiais && (
          <Select
            rotulo="Filial"
            value={filial}
            disabled={Boolean(urlGerada)}
            onChange={(evento) => setFilial(evento.target.value)}
          >
            <option value="">Selecione a filial…</option>
            {filiais.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        )}

        {urlGerada && (
          <div className="space-y-2.5">
            <Aviso tipo={jaExistia ? 'info' : 'sucesso'}>
              {jaExistia
                ? 'Já existe um link ativo para esta empresa e filial. O link existente foi recuperado.'
                : 'Novo link criado com sucesso.'}
            </Aviso>

            <div className="flex items-center gap-2 rounded-control border border-hairline bg-ground/60 py-1.5 pl-3.5 pr-1.5">
              <input
                type="text"
                readOnly
                value={urlGerada}
                aria-label="Link gerado"
                className="min-w-0 flex-1 truncate bg-transparent text-sm text-graphite focus:outline-none"
              />
              <BotaoDeIcone
                icone={copiado ? Check : Copy}
                rotulo={copiado ? 'Link copiado' : 'Copiar link'}
                variante={copiado ? 'sucesso' : 'tech'}
                onClick={copiar}
              />
            </div>
          </div>
        )}

        {gerar.isError && <Aviso tipo="erro">Erro ao gerar o link. Tente novamente.</Aviso>}

        {!urlGerada && (
          <p className="text-[13px] leading-relaxed text-muted">
            O link gerado é permanente e pode ser enviado ao fornecedor para anexar faturas. Se já existir um link
            ativo para a mesma empresa e filial, ele é reutilizado.
          </p>
        )}
      </div>
    </Modal>
  );
}
