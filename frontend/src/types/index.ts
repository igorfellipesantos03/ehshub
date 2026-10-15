export type TrainingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Training {
  id: number;
  ativo: string;
  filial?: string;
  area: string;
  represConasa: string;
  represInvestida: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  duracao: string;
  tema: string;
  status: TrainingStatus;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  role: 'ADMIN' | 'REVIEWER';
}

export interface AuthResponse {
  user: User;
  token: string;
}
