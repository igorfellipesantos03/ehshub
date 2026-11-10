import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Spinner } from './Feedback';

const ESTILOS_DE_BOTAO = {
  primario: 'bg-tech font-bold text-night hover:bg-[#19bfe3]',
  sucesso: 'bg-success text-white hover:brightness-110',
  perigo: 'bg-danger text-white hover:brightness-110',
  neutro: 'border border-hairline bg-surface text-graphite hover:bg-raised',
  // Ações de apoio com cor: o tom avisa o efeito sem competir com o botão primário.
  tech: 'border border-tech/30 bg-tech/10 text-tech-100 hover:bg-tech/20',
  alerta: 'border border-danger/35 bg-danger/10 text-danger-200 hover:bg-danger/20',
  fantasma: 'text-muted hover:bg-raised hover:text-white',
};

export type VarianteDeBotao = keyof typeof ESTILOS_DE_BOTAO;

/** Classes do botão, para links (`<Link>`, `<a>`) que precisam parecer botão. */
export const classesDeBotao = (variante: VarianteDeBotao = 'neutro', className = '') =>
  `inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-control px-3.5 text-[13px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${ESTILOS_DE_BOTAO[variante]} ${className}`;

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteDeBotao;
  carregando?: boolean;
  icone?: LucideIcon;
}

export function Botao({
  variante = 'neutro',
  carregando = false,
  disabled = false,
  icone: Icone,
  className = '',
  children,
  ...rest
}: BotaoProps) {
  return (
    <button type="button" {...rest} disabled={carregando || disabled} className={classesDeBotao(variante, className)}>
      {carregando ? <Spinner className="h-4 w-4" /> : Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

const ESTILOS_DE_ICONE = {
  neutro: 'border-transparent text-muted hover:border-hairline hover:bg-raised hover:text-white',
  tech: 'border-tech/30 bg-tech/10 text-tech-100 hover:bg-tech/20',
  sucesso: 'border-success/35 bg-success/10 text-emerald-200 hover:bg-success/20',
  perigo: 'border-transparent text-muted hover:border-danger/40 hover:bg-danger/15 hover:text-danger-200',
};

interface BotaoDeIconeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icone: LucideIcon;
  rotulo: string;
  variante?: keyof typeof ESTILOS_DE_ICONE;
  carregando?: boolean;
}

/** Botão só com ícone. O rótulo vira o nome acessível e a dica ao passar o mouse. */
export function BotaoDeIcone({
  icone: Icone,
  rotulo,
  variante = 'neutro',
  carregando = false,
  disabled = false,
  className = '',
  ...rest
}: BotaoDeIconeProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={carregando || disabled}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${ESTILOS_DE_ICONE[variante]} ${className}`}
    >
      {carregando ? <Spinner className="h-4 w-4" /> : <Icone className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
