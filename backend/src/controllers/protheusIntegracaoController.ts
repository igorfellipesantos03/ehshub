import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { ENV } from '../config/env';
import { getIo } from '../socket';
import { UPLOADS_DIR } from '../config/multer';
import { rotuloDaEmpresa } from '../utils/empresas';
import { dispararPipelineN8n } from '../services/n8nPipeline';
import {
  documentoProtheusSchema,
  faturaProtheusSchema,
  type DocumentoProtheus,
} from '../utils/protheusSchemas';

const db = prisma as any;

// Mesmo limite do upload pelo link de coleta (config/multer.ts).
const TAMANHO_MAXIMO_PDF = 15 * 1024 * 1024;

// ── Autenticação pelo header x-protheus-secret ─────────────────────
export const autenticarProtheus = (req: Request, res: Response, next: NextFunction) => {
  const segredo = ENV.PROTHEUS_INTEGRATION_SECRET;

  if (!segredo) {
    console.error('[Protheus] PROTHEUS_INTEGRATION_SECRET não definido: integração desativada.');
    return res.status(503).json({ error: 'Integração com o Protheus não configurada.' });
  }

  const recebido = req.headers['x-protheus-secret'];
  let valido = false;
  if (typeof recebido === 'string') {
    const a = Buffer.from(recebido);
    const b = Buffer.from(segredo);
    valido = a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  if (!valido) {
    console.warn('[Protheus] Chamada com segredo inválido. IP:', req.ip);
    return res.status(401).json({ error: 'Segredo da integração inválido.' });
  }

  next();
};

// empresa|filial|documento|serie|fornecedor|loja, com os campos já aparados.
const montarChave = (doc: DocumentoProtheus) =>
  [doc.empresa, doc.filial, doc.documento, doc.serie, doc.fornecedor, doc.loja].join('|');

// "AAAAMMDD" -> "AAAA-MM-DD"
const emissaoIso = (emissao: string) => `${emissao.slice(0, 4)}-${emissao.slice(4, 6)}-${emissao.slice(6, 8)}`;

const removerArquivo = (nome: string | null | undefined) => {
  if (!nome) return;
  const caminho = path.join(UPLOADS_DIR, nome);
  try {
    if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
  } catch (err) {
    console.error(`[Protheus] Não foi possível remover o arquivo ${nome}:`, err);
  }
};

const emitir = (evento: string, dados: unknown) => {
  try {
    getIo().emit(evento, dados);
  } catch (e) {
    console.error('Socket emit error:', e);
  }
};

// ── POST /api/integracoes/protheus/faturas ─────────────────────────
//
// Recebe o PDF da fatura de energia anexado ao documento de entrada, grava e
// dispara o mesmo pipeline do n8n usado pelo link de coleta. Idempotente pela
// chave do documento: reenviar a mesma nota não duplica a fatura.
//
export const receberFatura = async (req: Request, res: Response) => {
  // O validateRequest já conferiu o formato; aqui o parse devolve os campos aparados.
  const dados = faturaProtheusSchema.parse(req.body);

  const empresa = rotuloDaEmpresa(dados.empresa);
  if (!empresa) {
    return res.status(422).json({ error: `Empresa ${dados.empresa} não cadastrada no EHS HUB.` });
  }

  const pdf = Buffer.from(dados.arquivoBase64, 'base64');
  if (pdf.length === 0 || pdf.subarray(0, 4).toString('latin1') !== '%PDF') {
    return res.status(422).json({ error: 'O arquivo enviado não é um PDF válido.' });
  }
  if (pdf.length > TAMANHO_MAXIMO_PDF) {
    return res.status(422).json({ error: 'O PDF excede o tamanho máximo de 15MB.' });
  }

  const chaveProtheus = montarChave(dados);

  try {
    const existente = await db.fatura.findUnique({ where: { chaveProtheus } });

    // Já recebida e em andamento ou concluída: devolve a mesma, sem duplicar.
    if (existente && existente.status !== 'ERRO_PROCESSAMENTO') {
      return res.status(200).json({
        mensagem: 'Fatura já recebida anteriormente.',
        faturaId: existente.id,
        status: existente.status,
      });
    }

    const nomeSalvo = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
    const caminho = path.join(UPLOADS_DIR, nomeSalvo);
    await fs.promises.writeFile(caminho, pdf);

    const senderName = dados.usuario ? `Protheus - ${dados.usuario}` : 'Protheus';
    const camposDoEnvio = {
      empresa,
      local: dados.nomeFilial || dados.filial,
      senderName,
      xmlFileName: dados.nomeArquivo,
      filePath: nomeSalvo,
      status: 'PROCESSANDO',
      progress: 5,
      errorReason: null,
      valorBrutoProtheus: dados.valorBruto,
      emissaoProtheus: emissaoIso(dados.emissao),
      usuarioProtheus: dados.usuario || null,
    };

    let fatura;
    try {
      if (existente) {
        // Estava em erro: reaproveita o registro, troca o arquivo e reprocessa.
        fatura = await db.fatura.update({ where: { id: existente.id }, data: camposDoEnvio });
        removerArquivo(existente.filePath);
      } else {
        fatura = await db.fatura.create({
          data: {
            ...camposDoEnvio,
            origem: 'PROTHEUS',
            chaveProtheus,
            linkId: null,
            emitente: null,
            faturaNumber: null,
            valorFatura: 0, // Preenchido pelo callback do n8n
            consumoKwh: null,
            dataEmissao: null,
          },
        });
      }
    } catch (err: any) {
      removerArquivo(nomeSalvo);

      // Duas chamadas simultâneas para a mesma nota: a outra criou primeiro.
      if (err?.code === 'P2002') {
        const criada = await db.fatura.findUnique({ where: { chaveProtheus } });
        return res.status(200).json({
          mensagem: 'Fatura já recebida anteriormente.',
          faturaId: criada?.id,
          status: criada?.status,
        });
      }
      throw err;
    }

    emitir(existente ? 'invoice_updated' : 'invoice_created', fatura);

    dispararPipelineN8n({
      faturaId: fatura.id,
      senderName,
      arquivo: { caminho, nomeOriginal: dados.nomeArquivo, mimetype: 'application/pdf' },
    });

    console.log(`[Protheus] Fatura ${fatura.id} recebida (${chaveProtheus})${existente ? ', reprocessando' : ''}.`);

    return res.status(202).json({
      mensagem: 'Fatura recebida. O processamento foi iniciado.',
      faturaId: fatura.id,
      status: 'PROCESSANDO',
    });
  } catch (err) {
    console.error(`[Protheus] Erro ao receber a fatura ${chaveProtheus}:`, err);
    return res.status(500).json({ error: 'Erro interno ao receber a fatura.' });
  }
};

// ── DELETE /api/integracoes/protheus/faturas ───────────────────────
//
// Chamado quando o documento de entrada é excluído no Protheus. Idempotente:
// se não houver fatura para a nota, responde 200 sem fazer nada.
//
export const removerFatura = async (req: Request, res: Response) => {
  const chaveProtheus = montarChave(documentoProtheusSchema.parse(req.body));

  try {
    const fatura = await db.fatura.findUnique({ where: { chaveProtheus } });
    if (!fatura) {
      return res.status(200).json({ mensagem: 'Nada a remover.' });
    }

    await db.fatura.delete({ where: { id: fatura.id } });
    removerArquivo(fatura.filePath);
    emitir('invoice_deleted', fatura.id);

    console.log(`[Protheus] Fatura ${fatura.id} removida (${chaveProtheus}).`);
    return res.status(200).json({ mensagem: 'Fatura removida.', faturaId: fatura.id });
  } catch (err: any) {
    // Removida por outra chamada entre a busca e a exclusão.
    if (err?.code === 'P2025') {
      return res.status(200).json({ mensagem: 'Nada a remover.' });
    }
    console.error(`[Protheus] Erro ao remover a fatura ${chaveProtheus}:`, err);
    return res.status(500).json({ error: 'Erro interno ao remover a fatura.' });
  }
};
