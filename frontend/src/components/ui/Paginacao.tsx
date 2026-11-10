import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BotaoDeIcone } from './Botao';

interface PaginacaoProps {
  pagina: number;
  totalDeItens: number;
  porPagina: number;
  aoMudar: (pagina: number) => void;
}

/** Rodapé de tabela: faixa exibida e navegação entre páginas. Some quando cabe tudo numa página. */
export function Paginacao({ pagina, totalDeItens, porPagina, aoMudar }: PaginacaoProps) {
  const totalDePaginas = Math.max(1, Math.ceil(totalDeItens / porPagina));
  if (totalDePaginas <= 1) return null;

  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, totalDeItens);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline bg-deep/60 px-4 py-2 text-xs text-muted">
      <span className="tabular-nums">
        {inicio}–{fim} de {totalDeItens}
      </span>
      <div className="flex items-center gap-1">
        <BotaoDeIcone icone={ChevronLeft} rotulo="Página anterior" onClick={() => aoMudar(pagina - 1)} disabled={pagina <= 1} />
        <span className="px-1.5 tabular-nums">
          {pagina} / {totalDePaginas}
        </span>
        <BotaoDeIcone
          icone={ChevronRight}
          rotulo="Próxima página"
          onClick={() => aoMudar(pagina + 1)}
          disabled={pagina >= totalDePaginas}
        />
      </div>
    </div>
  );
}
