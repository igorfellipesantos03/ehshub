import { ChevronRight, type LucideIcon } from 'lucide-react';

interface CartaoHubProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export default function CartaoHub({ title, description, icon: Icon, onClick }: CartaoHubProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card group relative w-full p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-raised hover:shadow-lift"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tech/12 text-tech-100 transition-colors group-hover:bg-tech/20">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
      </span>

      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>

      <ChevronRight
        className="absolute right-5 top-5 h-5 w-5 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-tech"
        aria-hidden="true"
      />
    </button>
  );
}
