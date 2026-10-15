'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Training } from '@/types';
import { EtiquetaStatus } from './EtiquetaStatus';
import { Check, X, Edit2, Calendar, User, MapPin, Tag, Clock, Save } from 'lucide-react';
import api from '@/lib/api';
import { ASSETS, BRANCHES, AREAS, REPRESENTATIVES } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CartaoTreinamentoProps {
  training: Training;
}

export function CartaoTreinamento({ training }: CartaoTreinamentoProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...training });

  const mutationReview = useMutation({
    mutationFn: async (status: 'APPROVED' | 'REJECTED') => {
      return api.patch(`/api/training/${training.id}/review`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: async (data: any) => {
      return api.patch(`/api/training/${training.id}`, data);
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
    },
  });

  const handleSave = () => {
    mutationUpdate.mutate(editData);
  };

  const getAssetName = (id: string) => ASSETS.find(a => a.id === id)?.name || id;

  if (isEditing) {
    return (
      <div className="bg-[var(--ehs-card)] rounded-xl border-2 border-ehs-yellow shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase">Ativo</label>
            <select
              className="w-full bg-transparent text-sm font-medium border-b border-[var(--ehs-card-border)] focus:border-ehs-yellow outline-none py-1 text-primary [&>option]:bg-[var(--background)]"
              value={editData.ativo}
              onChange={(e) => setEditData({ ...editData, ativo: e.target.value, filial: '' })}
            >
              {ASSETS.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
            </select>
          </div>
          {BRANCHES[editData.ativo] && (
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase">Filial</label>
              <select
                className="w-full bg-transparent text-sm font-medium border-b border-[var(--ehs-card-border)] focus:border-ehs-yellow outline-none py-1 text-primary [&>option]:bg-[var(--background)]"
                value={editData.filial}
                onChange={(e) => setEditData({ ...editData, filial: e.target.value })}
              >
                <option value="">Nenhuma</option>
                {BRANCHES[editData.ativo].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase">Área</label>
            <select
              className="w-full bg-transparent text-sm font-medium border-b border-[var(--ehs-card-border)] focus:border-ehs-yellow outline-none py-1 text-primary [&>option]:bg-[var(--background)]"
              value={editData.area}
              onChange={(e) => setEditData({ ...editData, area: e.target.value })}
            >
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase">Repres. Conasa</label>
            <select
              className="w-full bg-transparent text-sm font-medium border-b border-[var(--ehs-card-border)] focus:border-ehs-yellow outline-none py-1 text-primary [&>option]:bg-[var(--background)]"
              value={editData.represConasa}
              onChange={(e) => setEditData({ ...editData, represConasa: e.target.value })}
            >
              {REPRESENTATIVES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted uppercase">Tema</label>
          <textarea
            className="w-full bg-transparent text-sm font-medium border border-[var(--ehs-card-border)] rounded p-2 focus:border-ehs-yellow outline-none text-primary"
            value={editData.tema}
            onChange={(e) => setEditData({ ...editData, tema: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-xs font-bold text-secondary hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold bg-primary text-background rounded-lg hover:opacity-90 transition flex items-center"
          >
            <Save className="h-3 w-3 mr-1" /> Salvar Alterações
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--ehs-card)] rounded-xl border border-[var(--ehs-card-border)] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Top Banner (Safey Yellow) */}
      <div className="bg-ehs-yellow/10 border-b border-ehs-yellow/20 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center text-[10px] font-bold text-ehs-yellow uppercase tracking-wider">
          <Tag className="h-3 w-3 mr-1" /> {training.area} Training
        </div>
        <EtiquetaStatus status={training.status} />
      </div>

      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-bold text-primary leading-tight">
              {training.tema}
            </h3>
            <div className="flex items-center text-xs text-secondary">
              <MapPin className="h-3 w-3 mr-1 text-muted" />
              {getAssetName(training.ativo)} {training.filial && `- ${training.filial}`}
            </div>
          </div>
          {training.status === 'PENDING' && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-muted hover:text-ehs-yellow hover:bg-ehs-yellow/5 rounded-lg transition"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center text-xs text-secondary">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted" />
            {format(new Date(training.data), "dd 'de' MMM", { locale: ptBR })}
          </div>
          <div className="flex items-center text-xs text-secondary">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-muted" />
            {training.duracao}h
          </div>
          <div className="flex items-center text-xs text-secondary col-span-2">
            <User className="h-3.5 w-3.5 mr-1.5 text-muted" />
            <span className="font-medium mr-1">Investida:</span> {training.represInvestida}
          </div>
          <div className="flex items-center text-xs text-secondary col-span-2">
            <User className="h-3.5 w-3.5 mr-1.5 text-muted" />
            <span className="font-medium mr-1">Conasa:</span> {training.represConasa}
          </div>
        </div>
      </div>

      {/* Footer Actions (if pending) */}
      {training.status === 'PENDING' && (
        <div className="grid grid-cols-2 border-t border-[var(--ehs-card-border)]">
          <button
            onClick={() => mutationReview.mutate('REJECTED')}
            className="flex items-center justify-center py-3 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ehs-red hover:bg-red-500/5 transition-colors border-r border-[var(--ehs-card-border)]"
          >
            <X className="h-3 w-3 mr-1" /> Rejeitar
          </button>
          <button
            onClick={() => mutationReview.mutate('APPROVED')}
            className="flex items-center justify-center py-3 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ehs-green hover:bg-green-500/5 transition-colors"
          >
            <Check className="h-3 w-3 mr-1" /> Aprovar
          </button>
        </div>
      )}
    </div>
  );
}
