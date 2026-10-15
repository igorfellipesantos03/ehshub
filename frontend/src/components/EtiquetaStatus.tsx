import { TrainingStatus } from '@/types';
import { clsx } from 'clsx';

interface EtiquetaStatusProps {
  status: TrainingStatus;
}

const statusConfig = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20' },
  APPROVED: { label: 'Aprovado', className: 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20' },
  REJECTED: { label: 'Rejeitado', className: 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20' },
};

export function EtiquetaStatus({ status }: EtiquetaStatusProps) {
  const config = statusConfig[status];

  return (
    <span className={clsx(
      'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      config.className
    )}>
      {config.label}
    </span>
  );
}
