'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Lock, Mail, User, ArrowRight, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import { perguntarVinculoProtheus } from '@/lib/vinculoProtheus';

// ── Componente de Animação Interativa (Canvas) ──────────────────
function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  interface Particle {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    alpha: number;
  }

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    const count = Math.floor((w * h) / 8000); // density based on area
    const colors = [
      'rgba(59,130,246,', // blue-500
      'rgba(96,165,250,', // blue-400
      'rgba(147,197,253,', // blue-300
      'rgba(191,219,254,', // blue-200
      'rgba(37,99,235,',  // blue-600
    ];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.2,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      particlesRef.current = initParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('mousemove', handleMouse);

    const animate = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const interactionRadius = 150;
      const lineDistance = 120;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse interaction — push particles away
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < interactionRadius && dist > 0) {
          const force = (interactionRadius - dist) / interactionRadius;
          const angle = Math.atan2(dy, dx);
          p.x -= Math.cos(angle) * force * 3;
          p.y -= Math.sin(angle) * force * 3;
        }

        // Drift back to base position slowly
        p.x += (p.baseX - p.x) * 0.01;
        p.y += (p.baseY - p.y) * 0.01;

        // Apply small velocity
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ddx = p.x - p2.x;
          const ddy = p.y - p2.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);

          if (d < lineDistance) {
            const opacity = (1 - d / lineDistance) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(147,197,253,${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw line to mouse if close enough
        if (dist < interactionRadius * 1.5) {
          const opacity = (1 - dist / (interactionRadius * 1.5)) * 0.25;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(96,165,250,${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Draw glowing cursor dot
      if (mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
        gradient.addColorStop(0, 'rgba(96,165,250,0.15)');
        gradient.addColorStop(1, 'rgba(96,165,250,0)');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: 'none' }}
    />
  );
}

// ── Formas Flutuantes Animadas (CSS) ────────────────────────────
function FloatingShapes() {
  return (
    <>
      {/* Hexágono grande */}
      <div className="absolute top-[12%] left-[8%] w-20 h-20 border-2 border-blue-400/15 rotate-12 animate-spin" style={{ animationDuration: '25s', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />

      {/* Triângulo */}
      <div className="absolute bottom-[18%] right-[12%] w-16 h-16 border-2 border-blue-300/10 animate-bounce" style={{ animationDuration: '5s', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />

      {/* Quadrado rotacionando */}
      <div className="absolute top-[55%] left-[15%] w-12 h-12 border border-blue-400/10 rounded-sm animate-spin" style={{ animationDuration: '18s' }} />

      {/* Losango */}
      <div className="absolute top-[30%] right-[20%] w-10 h-10 border border-blue-300/12 rotate-45 animate-pulse" style={{ animationDuration: '3s' }} />

      {/* Círculo com borda */}
      <div className="absolute bottom-[35%] left-[30%] w-24 h-24 rounded-full border border-blue-400/8 animate-ping" style={{ animationDuration: '4s' }} />

      {/* Semicírculo */}
      <div className="absolute top-[75%] right-[35%] w-14 h-7 border-2 border-blue-300/10 rounded-t-full animate-bounce" style={{ animationDuration: '6s' }} />
    </>
  );
}

// ── Página de Login ─────────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mutação para realizar o login
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    },
    onSuccess: async (data) => {
      localStorage.setItem('@EHS:token', data.token);
      localStorage.setItem('@EHS:user', JSON.stringify(data.user));

      // Quem ainda não vinculou o Protheus é convidado a vincular — é o que
      // permite entrar depois direto pelo CentralHub.
      if (!data.user.protheusLinked) {
        await perguntarVinculoProtheus();
      }

      router.push('/hub');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    },
  });

  // Mutação para realizar o cadastro
  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/register', { name, email, password });
      return response.data;
    },
    onSuccess: () => {
      setSuccess('Cadastro realizado com sucesso! Aguarde aprovação do administrador.');
      setIsRegistering(false);
      setName('');
      setPassword('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Erro ao realizar cadastro. Tente novamente.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegistering) {
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    setPassword('');
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex selection:bg-blue-500/30 selection:text-white">
      {/* ── Painel Esquerdo — Animação Interativa ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050d1a] via-[#0a1628] to-[#0f2035]" />

        {/* Canvas interativo com partículas */}
        <InteractiveBackground />

        {/* Formas geométricas flutuantes CSS */}
        <FloatingShapes />

        {/* Conteúdo sobreposto */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full pointer-events-none">
          {/* Logo no topo */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 relative">
              <Image
                src="/logo_da_jamile.png"
                alt="EHS Logo"
                fill
                className="object-contain brightness-0 invert opacity-80"
                priority
              />
            </div>
            <span className="text-white/70 font-semibold text-sm tracking-wider uppercase">Conasa</span>
          </div>

          {/* Texto central */}
          <div className="flex flex-col items-center justify-center flex-1 py-12">
            <div className="relative">
              {/* Glow atrás do texto */}
              <div className="absolute -inset-10 bg-blue-500/5 rounded-full blur-3xl" />
              <h2 className="relative text-4xl xl:text-5xl font-extrabold text-white text-center leading-tight tracking-tight">
                Bem-vindo ao{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-200 to-blue-400">
                  EHS HUB
                </span>
              </h2>
              <p className="relative text-blue-200/50 text-center mt-5 max-w-md mx-auto text-base leading-relaxed font-medium">
                Sistema de gerenciamento interno da equipe EHS Conasa
              </p>
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-blue-300/20 text-xs font-medium tracking-wider">
            Conasa Infraestrutura S.A &copy; 2026
          </p>
        </div>
      </div>

      {/* ── Painel Direito — Formulário ── */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#020617] relative overflow-hidden">
        {/* Efeito decorativo sutil */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md px-8 md:px-12 relative z-10">
          {/* Header mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 relative mb-4">
              <Image
                src="/logo_da_jamile.png"
                alt="EHS HUB Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-bold tracking-wider uppercase text-slate-900 dark:text-white">
              EHS <span className="text-blue-600 dark:text-blue-400">HUB</span>
            </h1>
          </div>

          {/* Título do formulário */}
          <div className="mb-10">
            <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm tracking-wide uppercase mb-2">
              {isRegistering ? 'Criar conta' : 'Bem-vindo de volta'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {isRegistering ? (
                <>Solicite seu<br /><span className="text-blue-600 dark:text-blue-400">acesso</span></>
              ) : (
                <>Acesse sua<br /><span className="text-blue-600 dark:text-blue-400">conta</span></>
              )}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm flex items-start gap-2">
                <span className="block">{error}</span>
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {success && (
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 p-4 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="block">{success}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Campo Nome (Apenas no Cadastro) */}
              {isRegistering && (
                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Nome completo
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-4 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Campo E-mail */}
              <div className="group">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  E-mail
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                    placeholder="seu@conasa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="group">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Senha
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_4px_16px_-4px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.5)] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 uppercase tracking-wider flex items-center justify-center mt-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <span className="mr-2">
                    {isRegistering ? 'Cadastrar' : 'Entrar'}
                  </span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login pelo CentralHub (SSO) */}
          {!isRegistering && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ou</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <a
                href="/sso"
                className="w-full flex items-center justify-center py-3.5 px-6 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Entrar com o CentralHub
              </a>
            </>
          )}

          {/* Alternar entre Login e Cadastro */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none"
            >
              {isRegistering ? (
                <>Já possui uma conta? <span className="text-blue-600 dark:text-blue-400 font-semibold">Faça login</span></>
              ) : (
                <>Não possui acesso? <span className="text-blue-600 dark:text-blue-400 font-semibold">Solicite agora</span></>
              )}
            </button>
          </div>

          {/* Rodapé (visível apenas no mobile) */}
          <div className="mt-12 text-center lg:hidden">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">
              Conasa Infraestrutura S.A &copy; 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
