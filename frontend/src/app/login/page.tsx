'use client';

import { useId, useState, useSyncExternalStore, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import api from '@/lib/api';
import { perguntarVinculoProtheus } from '@/lib/vinculoProtheus';
import { Aviso, Spinner } from '@/components/ui/Feedback';
import { MiniIndicadores, PainelDeIndicadores } from '@/features/login/PainelDeIndicadores';

const CHAVE_DO_EMAIL = 'ehs:email-lembrado';

// O e-mail lembrado só existe no navegador; no servidor (e na hidratação) é vazio.
const lerEmailLembrado = () => {
  try {
    return localStorage.getItem(CHAVE_DO_EMAIL) ?? '';
  } catch {
    return ''; // Sem storage (aba anônima bloqueada): só não preenche.
  }
};
const naoMuda = () => () => {};

const mensagemDaApi = (falha: unknown, padrao: string) =>
  (isAxiosError(falha) && (falha.response?.data as { error?: string } | undefined)?.error) || padrao;

// As mesmas regras que o backend exige no cadastro (utils/userSchemas.ts).
const REGRAS_DA_SENHA = ['Mínimo de 8 caracteres', 'Uma letra maiúscula', 'Uma letra minúscula', 'Um número'];

export default function Login() {
  const router = useRouter();
  const [cadastrando, setCadastrando] = useState(false);
  const [nome, setNome] = useState('');
  const emailLembrado = useSyncExternalStore(naoMuda, lerEmailLembrado, () => '');
  // null = ainda não digitou: mostra o e-mail lembrado.
  const [emailDigitado, setEmail] = useState<string | null>(null);
  const email = emailDigitado ?? emailLembrado;
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const entrar = useMutation({
    mutationFn: async () => (await api.post('/auth/login', { email, password: senha })).data,
    onSuccess: async (data) => {
      localStorage.setItem('@EHS:token', data.token);
      localStorage.setItem('@EHS:user', JSON.stringify(data.user));
      try {
        if (lembrar) localStorage.setItem(CHAVE_DO_EMAIL, email);
        else localStorage.removeItem(CHAVE_DO_EMAIL);
      } catch {
        // Sem storage: só não lembra o e-mail.
      }

      // Quem ainda não vinculou o Protheus é convidado a vincular: é o que
      // permite entrar depois direto pelo CentralHub.
      if (!data.user.protheusLinked) {
        await perguntarVinculoProtheus();
      }

      router.push('/hub');
    },
    onError: (falha) => {
      setErro(mensagemDaApi(falha, 'Credenciais inválidas. Verifique seu e-mail e senha.'));
    },
  });

  const cadastrar = useMutation({
    mutationFn: async () => (await api.post('/auth/register', { name: nome, email, password: senha })).data,
    onSuccess: () => {
      setSucesso('Cadastro realizado com sucesso! Aguarde a aprovação do administrador.');
      setCadastrando(false);
      setNome('');
      setSenha('');
    },
    onError: (falha) => {
      setErro(mensagemDaApi(falha, 'Erro ao realizar cadastro. Tente novamente.'));
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setSucesso('');
    if (cadastrando) cadastrar.mutate();
    else entrar.mutate();
  }

  function alternarModo() {
    setCadastrando((atual) => !atual);
    setErro('');
    setSucesso('');
    setSenha('');
  }

  const enviando = entrar.isPending || cadastrar.isPending;
  const incompleto = !email || !senha || (cadastrando && !nome);

  return (
    <div className="scheme-dark min-h-dvh bg-night lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
      <PainelDeIndicadores />

      <main className="flex min-h-dvh flex-col bg-[radial-gradient(130%_55%_at_0%_0%,#12305c_0%,#0a1a36_42%,#050a17_100%)] px-6 py-7 sm:px-12 lg:border-l lg:border-hairline lg:bg-none lg:bg-night lg:px-14 lg:py-10 xl:px-16">
        <Marca />
        <MiniIndicadores />

        <div key={cadastrando ? 'cadastro' : 'login'} className="animate-rise my-auto w-full max-w-[400px] py-7 lg:py-12">
          {cadastrando ? (
            <>
              <button
                type="button"
                onClick={alternarModo}
                className="flex w-fit items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar para o login
              </button>
              <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em] text-white lg:text-[32px]">Solicitar acesso</h1>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
                Preencha seus dados. Um administrador aprova o cadastro antes do primeiro acesso.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-white lg:text-[32px]">Acesse o EHS Hub</h1>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">Entre com o e-mail e a senha da sua conta.</p>
            </>
          )}

          <form onSubmit={enviar} className="mt-8 flex flex-col gap-5" noValidate>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}

            {cadastrando && (
              <Campo
                rotulo="Nome completo"
                name="name"
                autoComplete="name"
                required
                placeholder="Seu nome completo"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
              />
            )}

            <Campo
              rotulo="E-mail"
              name="email"
              type="email"
              autoComplete={cadastrando ? 'email' : 'username'}
              required
              placeholder="nome.sobrenome@conasa.com.br"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />

            <CampoDeSenha
              cadastrando={cadastrando}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />

            {!cadastrando && (
              <label className="flex w-fit cursor-pointer select-none items-center gap-2.5 text-sm text-muted transition-colors hover:text-graphite">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(evento) => setLembrar(evento.target.checked)}
                  className="h-4 w-4 accent-[var(--color-tech)]"
                />
                Lembrar e-mail
              </label>
            )}

            <button
              type="submit"
              disabled={enviando || incompleto}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-tech text-[15px] font-bold text-night transition-all duration-150 hover:bg-[#19bfe3] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:active:scale-100"
            >
              {enviando ? (
                <>
                  <Spinner className="h-4 w-4" /> {cadastrando ? 'Enviando' : 'Entrando'}
                </>
              ) : cadastrando ? (
                'Solicitar acesso'
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {!cadastrando && (
            <>
              {/* Login pelo CentralHub (SSO): quem já está logado lá entra sem senha. */}
              <div className="my-6 flex items-center gap-3 text-[12.5px] font-semibold uppercase tracking-wider text-ink-400">
                <span className="h-px flex-1 bg-white/10" />
                ou
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <a
                href="/sso"
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.14] text-[15px] font-semibold text-graphite transition-colors hover:border-tech/60 hover:text-white"
              >
                <LayoutGrid className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} aria-hidden="true" />
                Entrar com o CentralHub
              </a>
            </>
          )}

          <p className="mt-7 text-center text-sm text-muted">
            {cadastrando ? 'Já tem acesso?' : 'Ainda não tem acesso?'}{' '}
            <button type="button" onClick={alternarModo} className="font-bold text-tech transition-colors hover:text-tech-100">
              {cadastrando ? 'Entrar' : 'Solicitar acesso'}
            </button>
          </p>
        </div>

        <p className="text-[12.5px] text-ink-400">Acesso restrito a colaboradores da Conasa.</p>
      </main>
    </div>
  );
}

/** Logo, nome e a faixa com as três cores do logo (meio ambiente, saúde, segurança). */
function Marca() {
  return (
    <div>
      <div className="flex items-center gap-3.5">
        <Image src="/logo_da_jamile.png" alt="" width={52} height={52} className="h-11 w-11 object-contain lg:h-[52px] lg:w-[52px]" priority />
        <div className="flex flex-col gap-1.5">
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.02em] text-white lg:text-[25px]">
            EHS <span className="text-tech">Hub</span>
          </span>
          <span className="text-[12.5px] font-semibold text-muted">Meio Ambiente, Saúde e Segurança · Conasa</span>
        </div>
      </div>
      <div className="mt-[18px] flex w-24 gap-1" aria-hidden="true">
        <span className="h-[3px] flex-1 rounded-sm bg-[#46a352]" />
        <span className="h-[3px] flex-1 rounded-sm bg-[#2b82c9]" />
        <span className="h-[3px] flex-1 rounded-sm bg-[#f07a22]" />
      </div>
    </div>
  );
}

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  acao?: ReactNode;
  dica?: ReactNode;
}

function Campo({ rotulo, acao, dica, ...rest }: CampoProps) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-semibold text-graphite">
        {rotulo}
      </label>
      <div className="flex h-12 items-center rounded-xl border border-white/12 bg-white/[0.04] transition-colors focus-within:border-tech focus-within:bg-white/[0.06] focus-within:ring-4 focus-within:ring-tech/15">
        <input
          id={id}
          className="h-full w-full min-w-0 rounded-xl bg-transparent px-4 text-[15px] text-white placeholder:text-white/35 focus:outline-none"
          aria-describedby={dica ? `${id}-dica` : undefined}
          {...rest}
        />
        {acao}
      </div>
      {dica && <div id={`${id}-dica`}>{dica}</div>}
    </div>
  );
}

interface CampoDeSenhaProps {
  cadastrando: boolean;
  value: string;
  onChange: InputHTMLAttributes<HTMLInputElement>['onChange'];
}

function CampoDeSenha({ cadastrando, value, onChange }: CampoDeSenhaProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <Campo
      rotulo="Senha"
      name="password"
      type={visivel ? 'text' : 'password'}
      autoComplete={cadastrando ? 'new-password' : 'current-password'}
      required
      placeholder={cadastrando ? 'Crie uma senha' : 'Sua senha'}
      value={value}
      onChange={onChange}
      acao={
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-white"
        >
          {visivel ? (
            <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      }
      dica={
        cadastrando && (
          <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {REGRAS_DA_SENHA.map((regra) => (
              <li key={regra} className="flex items-center gap-2 text-[12.5px] text-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                {regra}
              </li>
            ))}
          </ul>
        )
      }
    />
  );
}
