// Campos de detalhamento da Fatura (todos opcionais): nem toda fatura traz
// demanda, ponta/fora de ponta etc. Vazio vira null; zero é um valor válido.
const CAMPOS_TEXTO = ['numeroUc', 'mesReferencia'];
const CAMPOS_INTEIROS = ['diasFaturados'];
const CAMPOS_DECIMAIS = [
  'consumoPontaKwh',
  'consumoForaPontaKwh',
  'demandaContratadaKw',
  'demandaPontaKw',
  'demandaForaPontaKw',
  'demandaFaturadaKw',
  'multaUltrapassagem',
  'reativoExcedente',
];

const vazio = (valor: unknown) => valor === null || valor === undefined || String(valor).trim() === '';

// Lê do body apenas os campos de detalhamento que vieram na requisição.
// Campo ausente não entra no retorno (não sobrescreve o que já está salvo).
export const extrairDetalhesFatura = (body: Record<string, unknown>) => {
  const detalhes: Record<string, string | number | null> = {};

  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] === undefined) continue;
    detalhes[campo] = vazio(body[campo]) ? null : String(body[campo]).trim();
  }

  for (const campo of CAMPOS_INTEIROS) {
    if (body[campo] === undefined) continue;
    const numero = parseInt(String(body[campo]), 10);
    detalhes[campo] = vazio(body[campo]) || !Number.isFinite(numero) ? null : numero;
  }

  for (const campo of CAMPOS_DECIMAIS) {
    if (body[campo] === undefined) continue;
    const numero = parseFloat(String(body[campo]));
    detalhes[campo] = vazio(body[campo]) || !Number.isFinite(numero) ? null : numero;
  }

  return detalhes;
};
