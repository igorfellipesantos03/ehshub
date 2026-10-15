'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { ASSETS, BRANCHES, AREAS, REPRESENTATIVES } from '@/lib/constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PublicForm() {
  const { token } = useParams();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    ativo: '',
    filial: '',
    area: '',
    represConasa: '',
    represInvestida: '',
    data: new Date().toISOString().split('T')[0],
    horarioInicio: '',
    horarioFim: '',
    tema: '',
  });

  const [submitted, setSubmitted] = useState(false);

  // Validate Token
  const { data: tokenStatus, isLoading: isValidatingToken } = useQuery({
    queryKey: ['token', token],
    queryFn: async () => {
      const response = await api.get(`/token/validate/${token}`);
      return response.data;
    },
    enabled: !!token,
  });

  // Calculate Duration
  const duracao = useMemo(() => {
    if (!formData.horarioInicio || !formData.horarioFim) return '00:00';
    
    const [hStart, mStart] = formData.horarioInicio.split(':').map(Number);
    const [hEnd, mEnd] = formData.horarioFim.split(':').map(Number);
    
    let diffMinutes = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
    if (diffMinutes < 0) diffMinutes = 0; // Or handle next day if needed
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, [formData.horarioInicio, formData.horarioFim]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/training/public', { ...data, duracao, token });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-ehs-yellow" />
      </div>
    );
  }

  if (!tokenStatus?.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-ehs-red mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900">Link Inválido ou Expirado</h1>
        <p className="text-neutral-600 mt-2">
          Este link de formulário já foi utilizado ou não é mais válido. 
          Entre em contato com a equipe de EHS para solicitar um novo acesso.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-ehs-green mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900">Formulário Enviado!</h1>
        <p className="text-neutral-600 mt-2">
          Obrigado. Suas informações foram recebidas e serão revisadas pela equipe de EHS.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Header Amarelo Safety */}
        <div className="bg-ehs-yellow p-6 text-white">
          <h1 className="text-2xl font-bold uppercase tracking-wide">EHS Forms - Registro de Treinamento</h1>
          <p className="opacity-90 mt-1">Preencha os dados abaixo para registro no sistema de Segurança e Saúde.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ativo */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Ativo (Empresa)</label>
              <select
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.value, filial: '' })}
              >
                <option value="">Selecione...</option>
                {ASSETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.id} - {asset.name}</option>
                ))}
              </select>
            </div>

            {/* Filial (Condicional) */}
            {BRANCHES[formData.ativo] && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Filial</label>
                <select
                  required
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                  value={formData.filial}
                  onChange={(e) => setFormData({ ...formData, filial: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {BRANCHES[formData.ativo].map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Área</label>
              <select
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                <option value="">Selecione...</option>
                {AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Representante Conasa */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Representante Conasa</label>
              <select
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.represConasa}
                onChange={(e) => setFormData({ ...formData, represConasa: e.target.value })}
              >
                <option value="">Selecione...</option>
                {REPRESENTATIVES.map((rep) => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Representante Investida */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Representante da Investida</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
              placeholder="Nome completo do representante"
              value={formData.represInvestida}
              onChange={(e) => setFormData({ ...formData, represInvestida: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Data</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            {/* Horario Inicio */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Horário Início</label>
              <input
                type="time"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.horarioInicio}
                onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
              />
            </div>

            {/* Horario Fim */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Horário Fim</label>
              <input
                type="time"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition"
                value={formData.horarioFim}
                onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
              />
            </div>
          </div>

          {/* Duração Informativa */}
          <div className="bg-neutral-50 rounded-lg p-3 flex items-center text-neutral-600 border border-neutral-200">
            <Clock className="h-5 w-5 mr-2 text-ehs-yellow" />
            <span className="text-sm font-medium">Duração Calculada: <span className="text-neutral-900">{duracao}h</span></span>
          </div>

          {/* Tema */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tema do Treinamento</label>
            <textarea
              required
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-ehs-yellow focus:border-ehs-yellow outline-none transition resize-none"
              placeholder="Descreva o resumo do treinamento realizado..."
              value={formData.tema}
              onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-ehs-yellow hover:bg-yellow-600 disabled:bg-neutral-300 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center uppercase tracking-wider"
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
