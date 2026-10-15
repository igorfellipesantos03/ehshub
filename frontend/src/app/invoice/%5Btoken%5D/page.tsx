'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  Upload,
  FileText,
  X,
  Building2,
} from 'lucide-react';
import api from '@/lib/api';

// Definição dos passos do formulário (Wizard)
type Step = 'name' | 'upload' | 'success';

export default function InvoiceUploadPage() {
  const { token } = useParams();
  const [step, setStep] = useState<Step>('name');
  const [senderName, setSenderName] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consulta para validar se o token do link é válido e não expirou
  const { data: tokenData, isLoading: isValidating } = useQuery({
    queryKey: ['invoice-token', token],
    queryFn: async () => {
      const response = await api.get(`/invoice/validate/${token}`);
      return response.data;
    },
    enabled: !!token,
  });

  // Mutação para realizar o upload do arquivo XML e processar os dados
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!xmlFile) throw new Error('Nenhum arquivo selecionado.');
      const formData = new FormData();
      formData.append('xml', xmlFile);
      formData.append('token', token as string);
      formData.append('senderName', senderName);
      
      const response = await api.post('/invoice/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUploadResult(data.data);
      setStep('success');
    },
  });

  // Manipulador de seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setXmlFile(file);
  };

  // Remove o arquivo selecionado
  const handleRemoveFile = () => {
    setXmlFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Formatação de moeda para Real (BRL)
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // ── Estado de Carregamento (Validação do Link) ──
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-ehs-yellow" />
      </div>
    );
  }

  // ── Estado de Link Inválido ou Expirado ──
  if (!tokenData?.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-50">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900">Link Inválido ou Expirado</h1>
        <p className="text-neutral-500 mt-2 max-w-md">
          {tokenData?.reason || 'Este link não é válido. Solicite um novo link ao administrador do EHS Hub.'}
        </p>
      </div>
    );
  }

  // ── Estado de Sucesso (Após Upload) ──
  if (step === 'success' && uploadResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-50">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-10 max-w-md w-full space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-neutral-900">Nota Fiscal Processada!</h1>
          <p className="text-neutral-500 text-sm">Os dados foram extraídos e salvos com sucesso.</p>

          <div className="bg-neutral-50 rounded-xl p-5 text-left space-y-3 border border-neutral-100">
            {uploadResult.xFant && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Nome Fantasia</p>
                <p className="text-sm font-semibold text-neutral-900">{uploadResult.xFant}</p>
              </div>
            )}
            {uploadResult.nfeNumber && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Nº da Nota</p>
                <p className="text-sm font-semibold text-neutral-900">{uploadResult.nfeNumber}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Valor da Nota</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(uploadResult.value)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Enviado por</p>
              <p className="text-sm font-semibold text-neutral-900">{uploadResult.senderName}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('upload');
              setXmlFile(null);
              setUploadResult(null);
              uploadMutation.reset();
            }}
            className="w-full bg-ehs-yellow hover:bg-yellow-500 text-black font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm"
          >
            Enviar outra nota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
          {/* Cabeçalho do Formulário */}
          <div className="bg-ehs-yellow px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">Upload de Nota Fiscal</h1>
              <p className="text-white/80 text-xs mt-0.5">
                {tokenData.empresa} {tokenData.filial ? `• ${tokenData.filial}` : ''}
              </p>
            </div>
          </div>

          {/* Indicador de Passos */}
          <div className="px-6 pt-5 pb-2 flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step === 'name' ? 'text-ehs-yellow' : 'text-green-500'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'name' ? 'bg-ehs-yellow text-white' : 'bg-green-500 text-white'}`}>
                {step === 'name' ? '1' : '✓'}
              </span>
              Identificação
            </div>
            <div className="flex-1 h-px bg-neutral-200" />
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step === 'upload' ? 'text-ehs-yellow' : 'text-neutral-300'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'upload' ? 'bg-ehs-yellow text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                2
              </span>
              Upload XML
            </div>
          </div>

          {/* Passo 1: Identificação do Usuário */}
          {step === 'name' && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Seu nome completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-ehs-yellow/50 focus:border-ehs-yellow transition-all text-sm"
                    placeholder="Digite seu nome..."
                  />
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-start gap-3">
                <Building2 className="h-5 w-5 text-ehs-yellow shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-500">
                  <p className="font-medium text-neutral-700">Empresa: {tokenData.empresa}</p>
                  {tokenData.filial && <p>Filial: {tokenData.filial}</p>}
                </div>
              </div>

              <button
                onClick={() => {
                  if (senderName.trim()) setStep('upload');
                }}
                disabled={!senderName.trim()}
                className="w-full bg-ehs-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Passo 2: Seleção e Upload do XML */}
          {step === 'upload' && (
            <div className="px-6 py-6 space-y-5">
              <div className="text-sm text-neutral-500">
                <span className="font-medium text-neutral-700">{senderName}</span>, anexe o arquivo XML da Nota Fiscal abaixo.
              </div>

              {/* Área de Seleção de Arquivo (Dropzone) */}
              {!xmlFile ? (
                <label
                  htmlFor="xml-upload"
                  className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-ehs-yellow hover:bg-ehs-yellow/[0.02] transition-all group"
                >
                  <Upload className="h-10 w-10 text-neutral-300 group-hover:text-ehs-yellow transition-colors mb-3" />
                  <p className="text-sm font-medium text-neutral-600">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">Apenas arquivos .xml (máx. 5MB)</p>
                  <input
                    id="xml-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <FileText className="h-8 w-8 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{xmlFile.name}</p>
                    <p className="text-xs text-neutral-400">{(xmlFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              )}

              {/* Feedback de Erro de Upload */}
              {uploadMutation.isError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-3 rounded-xl text-sm">
                  {(uploadMutation.error as any)?.response?.data?.error || 'Erro ao enviar o arquivo.'}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('name')}
                  className="px-5 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={() => uploadMutation.mutate()}
                  disabled={!xmlFile || uploadMutation.isPending}
                  className="flex-1 bg-ehs-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Enviar Nota Fiscal
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Rodapé do Cartão */}
          <div className="py-3 bg-neutral-50 text-center border-t border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-widest">
              EHS Hub • Conasa Infraestrutura S.A &copy; 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
