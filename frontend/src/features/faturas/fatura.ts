import { formatarMoeda, formatarNumero } from '@/lib/formato';

// Fatura como vem do backend.
export interface Fatura {
  id: string;
  senderName: string;
  emitente: string | null;
  local: string | null;
  empresa: string | null;
  faturaNumber: string | null;
  valorFatura: number;
  consumoKwh: number | null;
  dataEmissao: string | null;
  numeroUc: string | null;
  mesReferencia: string | null;
  diasFaturados: number | null;
  consumoPontaKwh: number | null;
  consumoForaPontaKwh: number | null;
  demandaContratadaKw: number | null;
  demandaPontaKw: number | null;
  demandaForaPontaKw: number | null;
  demandaFaturadaKw: number | null;
  multaUltrapassagem: number | null;
  reativoExcedente: number | null;
  xmlFileName: string | null;
  filePath: string | null;
  linkId: string;
  originalData?: Partial<Record<keyof Fatura, unknown>> | null;
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO_PROCESSAMENTO' | 'MANUAL';
  errorReason?: string | null;
  createdAt: string;
  link?: {
    id: string;
    token: string;
    empresa: string;
    filial: string | null;
    expiresAt: string;
    isUsed: boolean;
    createdAt: string;
  };
}

export const empresaDaFatura = (fatura: Fatura) => fatura.empresa || fatura.link?.empresa || '';
export const localDaFatura = (fatura: Fatura) => fatura.local || fatura.link?.filial || '';

export const formatarConsumo = (kwh: number | null) => (kwh ? `${formatarNumero(kwh)} kWh` : '—');

// A emissão chega como AAAA-MM-DD (XML) ou DD/MM/AAAA (extraída pela IA).
// Devolve sempre AAAA-MM-DD, que é o formato dos filtros de data.
export const emissaoIso = (data: string | null) => {
  if (!data) return null;
  const iso = data.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = data.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
};

// Campos de detalhamento extraídos pela IA. São opcionais: nem toda fatura
// traz demanda, ponta/fora de ponta etc.
export type TipoDeDetalhe = 'texto' | 'inteiro' | 'kwh' | 'kw' | 'moeda';

export interface CampoDeDetalhe {
  campo: keyof Fatura;
  rotulo: string;
  tipo: TipoDeDetalhe;
}

export const GRUPOS_DE_DETALHE: { titulo: string; campos: CampoDeDetalhe[] }[] = [
  {
    titulo: 'Identificação',
    campos: [
      { campo: 'numeroUc', rotulo: 'Nº da unidade consumidora', tipo: 'texto' },
      { campo: 'mesReferencia', rotulo: 'Mês de referência', tipo: 'texto' },
      { campo: 'diasFaturados', rotulo: 'Dias faturados', tipo: 'inteiro' },
    ],
  },
  {
    titulo: 'Consumo',
    campos: [
      { campo: 'consumoPontaKwh', rotulo: 'Consumo ponta (kWh)', tipo: 'kwh' },
      { campo: 'consumoForaPontaKwh', rotulo: 'Consumo fora de ponta (kWh)', tipo: 'kwh' },
    ],
  },
  {
    titulo: 'Demanda',
    campos: [
      { campo: 'demandaContratadaKw', rotulo: 'Contratada (kW)', tipo: 'kw' },
      { campo: 'demandaFaturadaKw', rotulo: 'Faturada (kW)', tipo: 'kw' },
      { campo: 'demandaPontaKw', rotulo: 'Registrada ponta (kW)', tipo: 'kw' },
      { campo: 'demandaForaPontaKw', rotulo: 'Registrada fora de ponta (kW)', tipo: 'kw' },
    ],
  },
  {
    titulo: 'Cobranças adicionais',
    campos: [
      { campo: 'multaUltrapassagem', rotulo: 'Multa por ultrapassagem (R$)', tipo: 'moeda' },
      { campo: 'reativoExcedente', rotulo: 'Reativo excedente (R$)', tipo: 'moeda' },
    ],
  },
];

export const CAMPOS_DE_DETALHE = GRUPOS_DE_DETALHE.flatMap((grupo) => grupo.campos);

const preenchido = (valor: unknown) => valor !== null && valor !== undefined && valor !== '';

export const temDetalhamento = (fatura: Fatura) => CAMPOS_DE_DETALHE.some(({ campo }) => preenchido(fatura[campo]));

export const formatarDetalhe = (valor: unknown, tipo: TipoDeDetalhe) => {
  if (!preenchido(valor)) return '—';
  if (tipo === 'texto') return String(valor);
  if (tipo === 'moeda') return formatarMoeda(Number(valor));
  const numero = formatarNumero(Number(valor));
  if (tipo === 'kwh') return `${numero} kWh`;
  if (tipo === 'kw') return `${numero} kW`;
  return numero;
};
