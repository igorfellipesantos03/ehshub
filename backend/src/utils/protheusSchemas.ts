import { z } from 'zod';

// Os campos chegam do Protheus com o tamanho da coluna (preenchidos com espaço):
// tudo é aparado antes de virar chave.
const texto = (rotulo: string) => z.string({ error: `${rotulo} é obrigatório` }).trim().min(1, `${rotulo} é obrigatório`);
// A série pode ser vazia em algumas notas.
const textoOpcional = z.string().trim().optional().default('');

// Identifica o documento de entrada no Protheus. Comum ao envio e à exclusão.
export const documentoProtheusSchema = z.object({
  empresa: texto('empresa'),
  filial: texto('filial'),
  documento: texto('documento'),
  serie: textoOpcional,
  fornecedor: texto('fornecedor'),
  loja: texto('loja'),
});

export const faturaProtheusSchema = documentoProtheusSchema.extend({
  nomeFilial: textoOpcional,
  usuario: textoOpcional,
  emissao: z.string().trim().regex(/^\d{8}$/, 'emissao deve estar no formato AAAAMMDD'),
  valorBruto: z.number({ error: 'valorBruto deve ser numérico' }).nonnegative('valorBruto não pode ser negativo'),
  nomeArquivo: texto('nomeArquivo'),
  arquivoBase64: texto('arquivoBase64'),
});

export type DocumentoProtheus = z.infer<typeof documentoProtheusSchema>;
export type FaturaProtheus = z.infer<typeof faturaProtheusSchema>;
