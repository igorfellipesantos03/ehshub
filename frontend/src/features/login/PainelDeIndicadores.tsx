// Ilustração da tela de login: um painel de indicadores que se anima sozinho.
// Só formas, sem números: nada aqui é dado real. As animações estão em
// globals.css (classes login-*), com versão estática para quem reduz movimento.

const TEMAS = [
  {
    nome: 'Energia',
    cor: '#f5b84a',
    fundo: 'rgba(245,184,74,0.14)',
    atraso: '-0.5s',
    icone: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  },
  {
    nome: 'Meio ambiente',
    cor: '#5cc26a',
    fundo: 'rgba(70,163,82,0.16)',
    atraso: '-2.5s',
    icone: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6',
  },
  {
    nome: 'Saúde',
    cor: '#5aa9e6',
    fundo: 'rgba(43,130,201,0.18)',
    atraso: '-4.5s',
    icone:
      'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  },
  {
    nome: 'Segurança',
    cor: '#f39248',
    fundo: 'rgba(240,122,34,0.16)',
    atraso: '-6s',
    icone:
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
  },
];

// Alturas e defasagens das barras "por unidade": cada uma oscila no seu ritmo.
const BARRAS: { altura: string; atraso: string; cor: string }[] = [
  { altura: '62%', atraso: '-0.2s', cor: 'bg-ink-700' },
  { altura: '84%', atraso: '-1.4s', cor: 'bg-tech' },
  { altura: '48%', atraso: '-2.6s', cor: 'bg-ink-700' },
  { altura: '72%', atraso: '-0.8s', cor: 'bg-ink-700' },
  { altura: '56%', atraso: '-2s', cor: 'bg-ink-700' },
  { altura: '92%', atraso: '-3.2s', cor: 'bg-[#46a352]' },
  { altura: '40%', atraso: '-1.1s', cor: 'bg-ink-700' },
];

const LINHA_REALIZADO =
  'M0 132 C40 124 70 92 110 98 S180 62 220 72 S300 112 340 84 S420 34 460 44 S500 22 520 26';
const LINHA_META = 'M0 116 C60 112 120 104 180 100 S300 88 360 80 S460 66 520 60';

const CARTAO =
  'rounded-[20px] border border-hairline bg-surface/95 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]';

export function PainelDeIndicadores() {
  return (
    <section className="relative hidden overflow-hidden bg-[radial-gradient(120%_90%_at_0%_0%,#12305c_0%,#0a1a36_45%,#050a17_100%)] lg:flex lg:flex-col">
      <div className="login-grade absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="animate-rise relative flex max-w-[640px] flex-col gap-[18px] px-12 pt-14 xl:px-16 xl:pt-16">
        <SeloAtualizado />
        <p className="text-[36px] font-extrabold leading-[1.14] tracking-[-0.02em] text-white xl:text-[44px]">
          Meio ambiente, saúde e segurança em números.
        </p>
        <p className="max-w-[48ch] text-[17px] leading-relaxed text-muted">
          Os dados das unidades da Conasa reunidos em um só lugar, prontos para acompanhar e analisar.
        </p>
      </div>

      <div className="relative mx-12 mb-14 mt-11 min-h-[470px] flex-1 xl:ml-16" aria-hidden="true">
        <CartaoVisaoGeral />
        <CartaoMetas />
        <CartaoPorUnidade />

        <div className="absolute bottom-9 right-[2%] flex flex-col gap-2.5">
          {TEMAS.map((tema) => (
            <span
              key={tema.nome}
              className="login-flutua flex items-center gap-2.5 rounded-[14px] border border-hairline bg-surface/95 py-2 pl-2 pr-3.5 text-[13.5px] font-semibold text-graphite shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]"
              style={{ animationDelay: tema.atraso }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: tema.fundo }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tema.cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tema.icone} />
                </svg>
              </span>
              {tema.nome}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Versão compacta para telas estreitas, onde o painel completo não cabe. */
export function MiniIndicadores() {
  return (
    <div className="animate-rise mt-6 rounded-[18px] border border-hairline bg-surface/90 px-4 pb-3 pt-4 lg:hidden" aria-hidden="true">
      <div className="flex items-center justify-between">
        <SeloAtualizado compacto />
        <span className="h-[7px] w-16 rounded bg-raised" />
      </div>
      <svg viewBox="0 0 520 120" className="mt-2.5 block h-auto w-full">
        <defs>
          <linearGradient id="login-area-mini" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00a8cc" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00a8cc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="login-area"
          d="M0 96 C40 90 70 66 110 70 S180 44 220 51 S300 80 340 60 S420 24 460 31 S500 16 520 18 L520 120 L0 120 Z"
          fill="url(#login-area-mini)"
        />
        <path
          className="login-desenha stroke-tech"
          d="M0 96 C40 90 70 66 110 70 S180 44 220 51 S300 80 340 60 S420 24 460 31 S500 16 520 18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function SeloAtualizado({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      className={`flex w-fit items-center gap-2.5 text-[12.5px] font-bold text-tech-100 ${
        compacto ? '' : 'rounded-full border border-tech/30 bg-tech/12 py-1.5 pl-2.5 pr-3.5'
      }`}
    >
      <span className="login-pulso h-2 w-2 rounded-full bg-tech" />
      Indicadores atualizados
    </span>
  );
}

function CartaoVisaoGeral() {
  return (
    <div className={`login-flutua absolute left-0 top-0 w-[76%] px-6 pb-[18px] pt-[22px] ${CARTAO}`} style={{ animationDelay: '-1s' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-white">Visão geral</span>
          <span className="h-[7px] w-[120px] rounded bg-raised" />
        </div>
        <div className="flex gap-3.5 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-2.5 rounded-sm bg-tech" />
            Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-2.5 rounded-sm bg-ink-400" />
            Meta
          </span>
        </div>
      </div>

      <svg viewBox="0 0 520 170" className="mt-3.5 block h-auto w-full">
        <defs>
          <linearGradient id="login-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00a8cc" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00a8cc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 40H520M0 85H520M0 130H520" stroke="#16263e" strokeWidth="1" />
        <path className="login-area" d={`${LINHA_REALIZADO} L520 170 L0 170 Z`} fill="url(#login-area)" />
        <path className="login-desenha stroke-tech" d={LINHA_REALIZADO} fill="none" strokeWidth="3" strokeLinecap="round" />
        <path
          className="login-desenha login-atraso"
          d={LINHA_META}
          fill="none"
          stroke="#6d8cb5"
          strokeWidth="2"
          strokeDasharray="6 7"
          strokeLinecap="round"
        />
        <circle className="login-ponto fill-tech" cx="460" cy="44" r="6" stroke="#0c1a2e" strokeWidth="3" />
      </svg>

      <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-400">
        {['JAN', 'MAR', 'MAI', 'JUL', 'SET', 'NOV'].map((mes) => (
          <span key={mes}>{mes}</span>
        ))}
      </div>
    </div>
  );
}

function CartaoMetas() {
  return (
    <div
      className={`login-flutua absolute right-0 top-[118px] flex w-[34%] min-w-[190px] flex-col items-center gap-3 p-5 ${CARTAO}`}
      style={{ animationDelay: '-3s' }}
    >
      <span className="self-start text-[13px] font-bold text-white">Metas do período</span>
      <svg viewBox="0 0 120 120" width="112" height="112">
        <circle cx="60" cy="60" r="48" fill="none" stroke="#16263e" strokeWidth="12" />
        <circle className="login-anel stroke-tech" cx="60" cy="60" r="48" fill="none" strokeWidth="12" strokeLinecap="round" transform="rotate(-90 60 60)" />
        <circle className="login-anel login-atraso" cx="60" cy="60" r="32" fill="none" stroke="#46a352" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 60 60)" />
      </svg>
      <div className="flex w-full flex-col gap-1.5">
        <span className="h-[7px] w-4/5 rounded bg-raised" />
        <span className="h-[7px] w-[56%] rounded bg-raised" />
      </div>
    </div>
  );
}

function CartaoPorUnidade() {
  return (
    <div className={`login-flutua absolute bottom-0 left-[6%] w-1/2 px-[22px] py-5 ${CARTAO}`} style={{ animationDelay: '-2s' }}>
      <span className="text-[13px] font-bold text-white">Por unidade</span>
      <div className="mt-4 flex h-[92px] items-end gap-2.5">
        {BARRAS.map((barra, indice) => (
          <span
            key={indice}
            className={`login-barra flex-1 rounded-md ${barra.cor}`}
            style={{ height: barra.altura, animationDelay: barra.atraso }}
          />
        ))}
      </div>
    </div>
  );
}
