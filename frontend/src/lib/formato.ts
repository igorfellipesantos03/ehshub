export const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export const formatarNumero = (valor: number) => valor.toLocaleString('pt-BR');

export const formatarDataHora = (data: string) =>
  new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Data de emissão sempre como DD/MM/AAAA. Lê o AAAA-MM-DD direto do texto para
// o fuso não empurrar a data um dia para trás.
export const formatarDataEmissao = (data: string | null) => {
  if (!data) return '—';
  const iso = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const convertida = new Date(data);
  if (!isNaN(convertida.getTime())) return convertida.toLocaleDateString('pt-BR');
  return data;
};

export const primeiroNome = (nome?: string | null) => (nome ?? '').trim().split(/\s+/)[0] ?? '';

export const iniciais = (nome?: string | null) => {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
};
