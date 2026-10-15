'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Botao, type VarianteDeBotao } from './Botao';
import { Aviso } from './Feedback';

interface ModalProps {
  titulo: string;
  descricao?: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}

/**
 * Janela modal. Vai por portal para o <body>: as páginas têm animação de
 * entrada com `transform`, que prenderia o `position: fixed` dentro delas.
 */
export function Modal({ titulo, descricao, aoFechar, children, rodape, largura = 'max-w-lg' }: ModalProps) {
  const tituloId = useId();
  const caixaRef = useRef<HTMLDivElement>(null);
  // Em ref: quem usa costuma passar uma função nova a cada render, e o efeito
  // abaixo (que também põe o foco no primeiro campo) só deve rodar ao abrir.
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => evento.key === 'Escape' && aoFecharRef.current();
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco no primeiro campo; sem campo, na própria caixa.
    const primeiro = caixaRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button[data-autofoco]',
    );
    (primeiro ?? caixaRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return createPortal(
    <div className="scheme-dark fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="animate-surgir absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={aoFechar} />

      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`animate-rise relative flex max-h-[92dvh] w-full ${largura} flex-col overflow-hidden rounded-t-card bg-surface text-graphite shadow-lift focus:outline-none sm:rounded-card`}
      >
        <header className="flex items-start gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="titulo-secao">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-[13.5px] text-muted">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-hairline px-5 py-3.5">{rodape}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmacaoProps {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  variante?: VarianteDeBotao;
  aoConfirmar: () => void;
  aoFechar: () => void;
  carregando?: boolean;
  erro?: string | null;
}

/** Confirmação de uma ação, com o erro da API exibido dentro da própria janela. */
export function Confirmacao({
  titulo,
  children,
  rotuloConfirmar,
  variante = 'primario',
  aoConfirmar,
  aoFechar,
  carregando = false,
  erro,
}: ConfirmacaoProps) {
  return (
    <Modal
      titulo={titulo}
      largura="max-w-md"
      aoFechar={carregando ? () => {} : aoFechar}
      rodape={
        <>
          <Botao onClick={aoFechar} disabled={carregando}>
            Cancelar
          </Botao>
          <Botao variante={variante} onClick={aoConfirmar} carregando={carregando} data-autofoco>
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <div className="space-y-3 text-[14px] leading-relaxed text-graphite/90">
        {children}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </div>
    </Modal>
  );
}
