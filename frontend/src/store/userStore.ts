import { create } from 'zustand';
import api from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'REVIEWER' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  fetchUsers: () => Promise<void>;
  createUser: (data: Partial<User> & { password?: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changeStatus: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
}

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/users');
      set({ users: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao carregar usuários', isLoading: false });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/users', data);
      set((state) => ({ users: [response.data, ...state.users], isLoading: false }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao criar usuário', isLoading: false });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/users/${id}`, data);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...response.data } : u)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao atualizar usuário', isLoading: false });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/users/${id}`);
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao deletar usuário', isLoading: false });
      throw error;
    }
  },

  changeStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/users/${id}/status`, { status });
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...response.data } : u)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao mudar status do usuário', isLoading: false });
      throw error;
    }
  },
}));
