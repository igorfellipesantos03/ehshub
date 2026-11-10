'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Botao, type VarianteDeBotao } from './Botao';
import { Aviso } from './Feedback';

// Janelas abertas, da mais antiga para a do topo (ex: edição aberta por cima da gaveta).
const janelasAbertas: object[] = [];

/**
 * Comportamento comum de janela: Esc fecha só a do topo, a página atrás não
 * rola e o foco vai para o primeiro campo (sem campo, para a própria caixa).
 */
function useJanela(aoFechar: () => void) {
  const caixaRef = useRef<HTMLDivElement>(null);
  // Em ref: quem usa costuma passar uma função nova a cada render, e o efeito
  // abaixo só deve rodar ao abrir.
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    const esta = {};
    janelasAbertas.push(esta);
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && janelasAbertas[janelasAbertas.length - 1] === esta) aoFecharRef.current();
    };
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const primeiro = caixaRef.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofoco]');
    (primeiro ?? caixaRef.current)?.focus();

    return () => {
      janelasAbertas.splice(janelasAbertas.indexOf(esta), 1);
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return caixaRef;
}

interface CabecalhoDaJanelaProps {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  aoFechar: () => void;
}

function CabecalhoDaJanela({ id, titulo, descricao, aoFechar }: CabecalhoDaJanelaProps) {
  return (
    <header className="flex items-start gap-3 border-b border-hairline px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="titulo-secao text-base">
          {titulo}
        </h2>
        {descricao && <div className="mt-0.5 text-[13px] text-muted">{descricao}</div>}
      </div>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-white"
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    </header>
  );
}

interface ModalProps {
  titulo: string;
  descricao?: ReactNode;
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
  const caixaRef = useJanela(aoFechar);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="animate-surgir absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={aoFechar} />

      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`animate-rise relative flex max-h-[92dvh] w-full ${largura} flex-col overflow-hidden rounded-t-card bg-surface text-graphite shadow-lift focus:outline-none sm:rounded-card`}
      >
        <CabecalhoDaJanela id={tituloId} titulo={titulo} descricao={descricao} aoFechar={aoFechar} />

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-hairline bg-deep/60 px-5 py-3">{rodape}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface GavetaProps extends ModalProps {
  /** Linha logo abaixo do cabeçalho (selos, situação). */
  faixa?: ReactNode;
}

/** Painel que desliza da direita: detalhe de um registro sem perder a lista de vista. */
export function Gaveta({ titulo, descricao, faixa, aoFechar, children, rodape, largura = 'max-w-xl' }: GavetaProps) {
  const tituloId = useId();
  const caixaRef = useJanela(aoFechar);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="animate-surgir absolute inset-0 bg-night/70 backdrop-blur-[2px]" onClick={aoFechar} />

      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`animate-deslizar-direita relative flex h-dvh w-full ${largura} flex-col border-l border-hairline bg-surface text-graphite shadow-lift focus:outline-none`}
      >
        <CabecalhoDaJanela id={tituloId} titulo={titulo} descricao={descricao} aoFechar={aoFechar} />
        {faixa && <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-2.5">{faixa}</div>}

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {rodape && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-hairline bg-deep/60 px-5 py-3">{rodape}</footer>
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
      <div className="space-y-3 text-sm leading-relaxed text-graphite/90">
        {children}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </div>
    </Modal>
  );
}
