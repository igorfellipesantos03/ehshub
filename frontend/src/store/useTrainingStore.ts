import { create } from 'zustand';
import { Training, TrainingStatus } from '@/types';

interface TrainingState {
  trainings: Training[];
  isLoading: boolean;
  filterStatus: TrainingStatus | 'ALL';
  setTrainings: (trainings: Training[]) => void;
  setLoading: (loading: boolean) => void;
  setFilterStatus: (status: TrainingStatus | 'ALL') => void;
  updateTrainingStatus: (id: number, status: TrainingStatus) => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  trainings: [],
  isLoading: false,
  filterStatus: 'PENDING', // Default to pending for triagem
  setTrainings: (trainings) => set({ trainings }),
  setLoading: (isLoading) => set({ isLoading }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  updateTrainingStatus: (id, status) => set((state) => ({
    trainings: state.trainings.map((t) => 
      t.id === id ? { ...t, status } : t
    )
  })),
}));
