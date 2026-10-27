// Empresas do grupo, no mesmo formato de ASSETS em frontend/src/lib/constants.ts.
// O rótulo "código - nome" é o que fica gravado em Fatura.empresa e
// LinkColeta.empresa, e é por ele que a tela filtra.
export const EMPRESAS: Record<string, string> = {
  '07': 'Conasa Infraestrutura',
  '23': 'Águas de Itapema',
  '24': 'Águas de Santo Antônio',
  '25': 'Sanesul',
  '26': 'Luz de Belém',
  '27': 'Sanesalto',
  '28': 'Sanetrat',
  '29': 'Conasa SPE',
  '31': 'Urbeluz S.A.',
  '32': 'Alegrete RJ',
  '33': 'Caraguá Luz',
  '35': 'Sanema',
  '36': 'ASB',
  '37': 'MT100',
  '38': 'Urbeluz SCP Campos',
  '39': 'Marabá Luz',
  '40': 'MT320',
  '42': 'MT246',
  '43': 'BR163',
  '44': 'Águas do Sertão',
};

/** "23" -> "23 - Águas de Itapema". Código desconhecido devolve null. */
export const rotuloDaEmpresa = (codigo: string) => {
  const nome = EMPRESAS[codigo];
  return nome ? `${codigo} - ${nome}` : null;
};
