'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Sparkles,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import { socket } from '@/lib/socket';

type Step = 'name' | 'upload' | 'success';

const COMPANY_LOCATIONS: Record<string, string[]> = {
  'BR163': ['BSO01', 'BSO02', 'BSO03', 'BSO04', 'PP01', 'PP02', 'PP03', 'SEDE ADM - Relógio 01', 'SEDE ADM - Relógio 02', 'SEDE ADM - Relógio 03', 'SEDE ADM - Relógio 04'],
  'MT100': ['P01', 'P02', 'BSO', 'GALPÃO CONSERVA', 'ESTAÇÃO DE RÁDIO BASE', 'BALANÇA', 'SEDE ADM'],
  'MT246': ['P01', 'P02', 'P03', 'P04', 'ESCRITÓRIO/GALPÃO', 'ESTAÇÃO RÁDIO BASE', 'BALANÇA'],
  'MT320': ['P01', 'P02', 'P03', 'BSO02', 'GALPÃO CONSERVA', 'BALANÇA 01', 'BALANÇA 03'],
  'ÁGUAS DE ITAPEMA': ['ADM', 'ÁGUA', 'ESGOTO'],
  'SANETRAT': ['ADM'],
  'ALEGRETE': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'LUZ DE BELÉM': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'CARAGUÁ LUZ': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
  'ÁGUAS DO SERTÃO': ['ÁGUA', 'ESGOTO', 'ADM'],
  'URBELUZ BOA VISTA': ['PÁTIO DE IP', 'SEDE/GALPÃO'],
};

const getCompanyLocations = (empresa: string) => {
  const upperEmpresa = empresa.toUpperCase();
  for (const [key, locations] of Object.entries(COMPANY_LOCATIONS)) {
    if (upperEmpresa.includes(key.toUpperCase())) {
      return locations;
    }
  }
  return [];
};

function AsyncProcessingScreen({ serverProgress }: { serverProgress: number }) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [isCriticalError, setIsCriticalError] = useState(false);

  // Smart estimated timer: advances with easeOut curve up to 95%
  // Only reaches 100% when serverProgress confirms completion
  useEffect(() => {
    const ESTIMATED_DURATION = 15000; // 15s estimated processing time
    const TICK_INTERVAL = 200;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const linear = Math.min(elapsed / ESTIMATED_DURATION, 1);
      // easeOutQuad: starts fast, slows near the end
      const eased = 1 - (1 - linear) * (1 - linear);
      // Cap at 99% — only the real callback can push to 100%
      const percent = Math.min(Math.round(eased * 99), 99);

      setDisplayProgress((prev) => {
        // If server already confirmed 100%, stay at 100
        if (prev >= 100) return 100;
        return Math.max(prev, percent);
      });

      if (percent >= 99) {
        clearInterval(timer);
        // Show overtime message after sitting at 95% for 5s
        setTimeout(() => setIsOvertime(true), 5000);
      }
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  // When server confirms completion, snap to 100%
  useEffect(() => {
    if (serverProgress >= 100) {
      setDisplayProgress(100);
    }
  }, [serverProgress]);

  // 3 minutes timeout for critical error
  useEffect(() => {
    const criticalErrorTimer = setTimeout(() => {
      setIsCriticalError(true);
    }, 180000);

    return () => clearTimeout(criticalErrorTimer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-900 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-ehs-yellow/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.7s' }}></div>
      <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '1.4s' }}></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 max-w-sm w-full space-y-6 relative z-10 shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
        {/* Cat GIF */}
        <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
          <div className="absolute -inset-3 bg-gradient-to-r from-ehs-yellow/20 via-purple-500/20 to-blue-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-36 h-36 rounded-full overflow-hidden ring-2 ring-white/10">
            <Image
              src="/loading-cat.gif"
              alt="Gato carregando"
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            Processando sua fatura
            <Sparkles className="h-4 w-4 text-ehs-yellow animate-bounce" />
          </h1>
          <p className="text-neutral-400 text-[13px] leading-relaxed">
            Nossa IA está analisando o PDF para extrair os dados. Aguarde um instante...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden relative border border-white/[0.05]">
            {/* Filled portion */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${displayProgress}%`,
                background: displayProgress >= 100
                  ? 'linear-gradient(90deg, #EAB308, #F59E0B, #FBBF24)'
                  : 'linear-gradient(90deg, #EAB308, #F59E0B, #FBBF24, #F59E0B)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            ></div>
            {/* Glow on the leading edge */}
            <div
              className="absolute top-0 h-full w-6 rounded-full blur-sm opacity-70 transition-all duration-300 ease-out"
              style={{
                left: `calc(${displayProgress}% - 12px)`,
                background: '#FBBF24',
                display: displayProgress <= 1 ? 'none' : 'block',
              }}
            ></div>
          </div>

          {/* Percentage + status text */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-500 font-medium tracking-wide">
              {displayProgress < 30
                ? 'Enviando arquivo para processamento...'
                : displayProgress < 80
                  ? 'Analisando fatura com inteligência artificial...'
                  : displayProgress < 100
                    ? 'Extraindo dados e validando informações...'
                    : 'Finalizando processamento...'}
            </p>
            <span className="text-[11px] text-ehs-yellow font-bold tabular-nums">
              {displayProgress}%
            </span>
          </div>

          {/* Overtime warning */}
          {isOvertime && !isCriticalError && (
            <div
              className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 mt-1"
              style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              <p className="text-[11px] text-yellow-300/90 leading-snug text-left">
                Parece que o processo está demorando mais do que o normal...
              </p>
            </div>
          )}

          {/* Critical Error (2 minutes) */}
          {isCriticalError && (
            <div
              className="flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 mt-1 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-[12px] text-red-400 font-bold leading-relaxed text-left">
                Ops... tivemos um problema para processar, contate a TI para verificar o problema.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer branding */}
      <p className="absolute bottom-6 text-[10px] text-neutral-600 font-semibold uppercase tracking-[0.2em] z-10">
        EHS Hub • Conasa Infraestrutura S.A
      </p>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.7; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function InvoiceUploadPage() {
  const { token } = useParams();
  const [step, setStep] = useState<Step>('name');
  const [senderName, setSenderName] = useState('');
  const [local, setLocal] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [isLocalDropdownOpen, setIsLocalDropdownOpen] = useState(false);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate Token
  const { data: tokenData, isLoading: isValidating } = useQuery({
    queryKey: ['invoice-token', token],
    queryFn: async () => {
      const response = await api.get(`/invoice/validate/${token}`);
      return response.data;
    },
    enabled: !!token,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!xmlFile) throw new Error('Nenhum arquivo selecionado.');

      const isPdf = xmlFile.name.toLowerCase().endsWith('.pdf');
      const formData = new FormData();

      if (isPdf) {
        formData.append('pdf', xmlFile);
        formData.append('token', token as string);
        formData.append('senderName', senderName);
        if (local) formData.append('local', local);
        const response = await api.post('/invoice/upload-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { isPdf: true, ...response.data };
      } else {
        formData.append('xml', xmlFile);
        formData.append('token', token as string);
        formData.append('senderName', senderName);
        if (local) formData.append('local', local);
        const response = await api.post('/invoice/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { isPdf: false, ...response.data.data };
      }
    },
    onSuccess: (data) => {
      setUploadResult(data);
      setStep('success');
    },
  });

  // Polling for async PDF processing
  useQuery({
    queryKey: ['invoice-status', uploadResult?.faturaId],
    queryFn: async () => {
      const response = await api.get(`/invoice/status/${uploadResult.faturaId}`);
      const data = response.data;

      if (data.status === 'CONCLUIDO') {
        setUploadResult((prev: any) => ({
          ...prev,
          ...data,
          isPdf: false,
        }));
      } else if (data.status === 'ERRO_PROCESSAMENTO') {
        setUploadResult((prev: any) => ({
          ...prev,
          ...data,
          isPdf: false,
          isError: true,
        }));
      } else if (data.status === 'PROCESSANDO' && data.progress !== undefined) {
        // Atualizar o progresso sem mudar o estado isPdf
        setUploadResult((prev: any) => ({
          ...prev,
          progress: data.progress,
        }));
      }
      return data;
    },
    enabled: !!uploadResult?.faturaId && uploadResult?.isPdf === true,
    refetchInterval: uploadResult?.isPdf ? 3000 : false, // Polling a cada 3s, socket cuida do tempo real
  });

  // Listener para Socket.io
  useEffect(() => {
    if (uploadResult?.faturaId && uploadResult?.isPdf) {
      socket.connect();

      const handleInvoiceEvent = (data: any) => {
        if (data.id === uploadResult.faturaId) {
          queryClient.invalidateQueries({ queryKey: ['invoice-status', uploadResult.faturaId] });
        }
      };

      socket.on('invoice_updated', handleInvoiceEvent);

      return () => {
        socket.off('invoice_updated', handleInvoiceEvent);
        socket.disconnect();
      };
    }
  }, [uploadResult?.faturaId, uploadResult?.isPdf, queryClient]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setXmlFile(file);
  };

  const handleRemoveFile = () => {
    setXmlFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // ── Loading State ──
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-ehs-yellow" />
      </div>
    );
  }

  // ── Invalid/Expired Token ──
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

  // ── Success or Error Screen ──
  if (step === 'success' && uploadResult) {
    if (uploadResult.isError || uploadResult.status === 'ERRO_PROCESSAMENTO') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-900">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-red-500/30 rounded-[2rem] p-10 max-w-sm w-full space-y-6 shadow-[0_8px_60px_rgba(239,68,68,0.2)]">
            <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/5">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-white">Erro no Processamento</h1>
            <p className="text-neutral-400 text-sm">
              Ops... tivemos um problema para processar esta fatura através da IA.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="text-xs text-red-400 font-medium">
                {uploadResult.errorReason || 'Contate a TI para verificar o problema.'}
              </p>
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setXmlFile(null);
                setUploadResult(null);
                uploadMutation.reset();
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all border border-white/10"
            >
              Tentar outro arquivo
            </button>
          </div>
        </div>
      );
    }

    const isAsync = uploadResult.isPdf;

    if (isAsync) {
      return <AsyncProcessingScreen serverProgress={uploadResult.progress || 0} />;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-neutral-50">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-10 max-w-md w-full space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-neutral-900">
            Fatura Processada!
          </h1>
          <p className="text-neutral-500 text-sm">
            Os dados foram extraídos e salvos com sucesso.
          </p>

          <div className="bg-neutral-50 rounded-xl p-5 text-left space-y-3 border border-neutral-100">
            {uploadResult.emitente && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Emitente</p>
                <p className="text-sm font-semibold text-neutral-900">{uploadResult.emitente}</p>
              </div>
            )}
            {uploadResult.dataEmissao && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Data de Emissão</p>
                <p className="text-sm font-semibold text-neutral-900">{uploadResult.dataEmissao}</p>
              </div>
            )}
            {uploadResult.faturaNumber && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Nº da Fatura</p>
                <p className="text-sm font-semibold text-neutral-900">{uploadResult.faturaNumber}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Valor da Fatura</p>
              <p className="text-lg font-bold text-green-600">{uploadResult.valorFatura ? formatCurrency(uploadResult.valorFatura) : 'R$ 0,00'}</p>
            </div>
            {uploadResult.consumoKwh !== null && uploadResult.consumoKwh !== undefined && (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Consumo (kWh)</p>
                <p className="text-lg font-bold text-yellow-400">{uploadResult.consumoKwh} kWh</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Enviado por</p>
              <p className="text-sm font-semibold text-neutral-900">{senderName}</p>
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
            Enviar outra fatura
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="bg-ehs-yellow px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">Upload de Fatura</h1>
              <p className="text-white/80 text-xs mt-0.5">
                {tokenData.empresa} {tokenData.filial ? `• ${tokenData.filial}` : ''}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
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
              Upload Arquivo
            </div>
          </div>

          {/* Step 1: Name */}
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

          {/* Step 2: Upload Arquivo */}
          {step === 'upload' && (
            <div className="px-6 py-6 space-y-5">
              <div className="text-sm text-neutral-500">
                <span className="font-medium text-neutral-700">{senderName}</span>, anexe o arquivo XML ou PDF da Fatura abaixo.
              </div>

              {(() => {
                const locations = tokenData?.empresa ? getCompanyLocations(tokenData.empresa) : [];
                const isLocalRequired = locations.length > 0;
                const canSubmit = isLocalRequired ? (xmlFile && local) : xmlFile;

                return (
                  <>
                    {/* Local Selection if required */}
                    {isLocalRequired && (
                      <div ref={dropdownRef}>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5 text-left">Local da Fatura</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                          <input
                            type="text"
                            value={localSearch || local}
                            onChange={(e) => {
                              setLocalSearch(e.target.value);
                              setLocal('');
                              setIsLocalDropdownOpen(true);
                            }}
                            onFocus={() => setIsLocalDropdownOpen(true)}
                            className="w-full pl-12 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-ehs-yellow/50 focus:border-ehs-yellow transition-all text-sm"
                            placeholder="Selecione ou busque um local..."
                          />
                          <button
                            type="button"
                            onClick={() => setIsLocalDropdownOpen(!isLocalDropdownOpen)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 outline-none"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>

                          {isLocalDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-2">
                              {(() => {
                                const filtered = locations.filter(l => l.toLowerCase().includes(localSearch.toLowerCase()));
                                return filtered.length > 0 ? (
                                  filtered.map((loc) => (
                                    <button
                                      key={loc}
                                      type="button"
                                      onClick={() => {
                                        setLocal(loc);
                                        setLocalSearch('');
                                        setIsLocalDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${local === loc
                                        ? 'bg-ehs-yellow/10 text-ehs-yellow'
                                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-ehs-yellow'
                                        }`}
                                    >
                                      {loc}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-neutral-500 text-center">Nenhum local encontrado</div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dropzone */}
                    {!xmlFile ? (
                      <label
                        htmlFor="xml-upload"
                        className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-ehs-yellow hover:bg-ehs-yellow/[0.02] transition-all group"
                      >
                        <Upload className="h-10 w-10 text-neutral-300 group-hover:text-ehs-yellow transition-colors mb-3" />
                        <p className="text-sm font-medium text-neutral-600">
                          Clique para selecionar ou arraste o arquivo
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">Arquivos .xml, .json ou .pdf (máx. 5MB)</p>
                        <input
                          id="xml-upload"
                          ref={fileInputRef}
                          type="file"
                          accept=".xml,application/xml,text/xml,.json,application/json,.pdf,application/pdf"
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

                    {/* Error */}
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
                        disabled={!canSubmit || uploadMutation.isPending}
                        className="flex-1 bg-ehs-yellow hover:bg-yellow-500 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
                      >
                        {uploadMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4" /> Enviar Fatura
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Footer */}
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
