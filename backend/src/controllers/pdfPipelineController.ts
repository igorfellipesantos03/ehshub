import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { FaturaStatus } from '@prisma/client';

import { ENV } from '../config/env';
import { getIo } from '../socket';
import { extrairDetalhesFatura } from '../utils/faturaDetalhes';
import { dispararPipelineN8n } from '../services/n8nPipeline';

const db = prisma as any;

// Token secreto compartilhado entre o n8n e o EHS HUB para proteger o callback
const WEBHOOK_SECRET = ENV.N8N_WEBHOOK_SECRET;

// ── Upload Assíncrono de PDF para o Pipeline n8n ────────────────────
//
// Esta rota recebe o arquivo PDF (via multipart/form-data),
// converte para Base64 e dispara o n8n de forma assíncrona.
// Retorna 202 Accepted IMEDIATAMENTE sem esperar o processamento da TESS IA.
//
export const uploadPdfParaN8n = async (req: Request, res: Response) => {
  const { token, senderName, local } = req.body;
  const pdfFile = req.file;

  if (!token || !senderName || !pdfFile) {
    return res.status(400).json({ error: 'Token, nome do enviante e arquivo PDF são obrigatórios.' });
  }

  try {
    // 1. Validar e buscar o link de coleta pelo token público
    const link = await db.linkColeta.findUnique({ where: { token } });

    if (!link) {
      return res.status(404).json({ error: 'Token inválido.' });
    }

    if (!link.isActive) {
      return res.status(403).json({ error: 'Este link foi desativado ou substituído.' });
    }

    // 2. Criar registro inicial com status "PROCESSANDO" no banco
    const faturaRegistro = await db.fatura.create({
      data: {
        senderName: senderName as string,
        emitente: null,       // Será preenchido pelo n8n após processamento
        local: local ? String(local) : null,
        empresa: link.empresa,
        faturaNumber: null,
        valorFatura: 0,       // Valor temporário, será atualizado pelo callback
        consumoKwh: null,
        dataEmissao: null,
        xmlFileName: pdfFile.originalname,
        filePath: pdfFile.filename, // Nome do arquivo salvo em disco pelo multer
        linkId: link.id,
        status: FaturaStatus.PROCESSANDO,
        progress: 5, // Progresso inicial antes do n8n começar
      },
    });

    try {
      getIo().emit('invoice_created', faturaRegistro);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    // 3. Disparar o n8n de forma assíncrona (fire-and-forget)
    dispararPipelineN8n({
      faturaId: faturaRegistro.id,
      senderName,
      linkToken: token,
      arquivo: { caminho: pdfFile.path, nomeOriginal: pdfFile.originalname, mimetype: pdfFile.mimetype },
    });

    // 4. Retornar 202 Accepted imediatamente ao frontend
    return res.status(202).json({
      mensagem: 'Fatura recebida. O processamento foi iniciado e pode levar alguns instantes.',
      faturaId: faturaRegistro.id,
      status: 'PROCESSANDO',
    });
  } catch (err) {
    console.error('Erro ao iniciar pipeline de PDF:', err);
    return res.status(500).json({ error: 'Erro interno ao iniciar o processamento da fatura.' });
  }
};

// ── Webhook de Callback (Recebe o Resultado do n8n) ────────────────
//
// Esta rota é chamada EXCLUSIVAMENTE pelo n8n após a TESS IA processar o PDF.
// Protegida pelo token secreto no cabeçalho "x-webhook-secret".
// Atualiza os dados da Fatura no banco e altera o status para "CONCLUIDO" ou "ERRO".
//
export const callbackN8n = async (req: Request, res: Response) => {
  // 1. Autenticar a requisição pelo token secreto no header
  const secretRecebido = req.headers['x-webhook-secret'];

  let isValid = false;
  if (typeof secretRecebido === 'string' && WEBHOOK_SECRET) {
    const a = Buffer.from(secretRecebido);
    const b = Buffer.from(WEBHOOK_SECRET);
    if (a.length === b.length) {
      isValid = crypto.timingSafeEqual(a, b);
    }
  }

  if (!isValid) {
    console.warn('[Webhook] Tentativa de acesso com token inválido. IP:', req.ip);
    return res.status(401).json({ error: 'Token de autenticação do webhook inválido.' });
  }

  const {
    faturaId,
    emitente,
    dataEmissao,
    faturaNumber,
    valorFatura,
    consumoKwh,
    status,
    progress,
    errorReason,
  } = req.body;

  if (!faturaId) {
    return res.status(400).json({ error: 'Payload inválido: faturaId é obrigatório.' });
  }

  try {
    // 2. Verificar se a fatura existe antes de atualizar
    const faturaExistente = await db.fatura.findUnique({ where: { id: faturaId } });

    if (!faturaExistente) {
      return res.status(404).json({ error: `Fatura com ID ${faturaId} não encontrada.` });
    }

    // ── Atualização de Progresso (chamado pelo n8n durante o pipeline) ──
    if (status === 'PROCESSANDO' && progress !== undefined) {
      const faturaAtualizada = await db.fatura.update({
        where: { id: faturaId },
        data: {
          progress: Math.min(Math.max(parseInt(String(progress), 10) || 0, 0), 100),
        },
      });

      try {
        getIo().emit('invoice_updated', faturaAtualizada);
      } catch (e) {
        console.error('Socket emit error:', e);
      }

      console.log(`[Webhook] Fatura ${faturaId} progresso atualizado: ${faturaAtualizada.progress}%`);

      return res.status(200).json({
        mensagem: 'Progresso atualizado.',
        faturaId: faturaAtualizada.id,
        progress: faturaAtualizada.progress,
      });
    }

    // ── Erro de Processamento (chamado pelo n8n em caso de falha) ──
    if (status === 'ERRO_PROCESSAMENTO') {
      const faturaAtualizada = await db.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'ERRO_PROCESSAMENTO' as any,
          errorReason: errorReason ? String(errorReason) : 'Erro desconhecido no processamento.',
        },
      });

      try {
        getIo().emit('invoice_updated', faturaAtualizada);
      } catch (e) {
        console.error('Socket emit error:', e);
      }

      console.log(`[Webhook] Fatura ${faturaId} erro: ${faturaAtualizada.errorReason}`);

      return res.status(200).json({
        mensagem: 'Erro registrado.',
        faturaId: faturaAtualizada.id,
        status: faturaAtualizada.status,
        errorReason: faturaAtualizada.errorReason,
      });
    }

    // ── Conclusão com Sucesso (chamado pelo n8n ao finalizar com dados) ──
    // 3. Atualizar os dados da Fatura com o resultado da TESS IA
    const payloadExtraido = {
      emitente: emitente ? String(emitente) : null,
      dataEmissao: dataEmissao ? String(dataEmissao) : null,
      faturaNumber: faturaNumber ? String(faturaNumber) : null,
      valorFatura: parseFloat(String(valorFatura)) || 0,
      consumoKwh: consumoKwh ? parseFloat(String(consumoKwh)) : null,
      ...extrairDetalhesFatura(req.body),
    };

    const faturaAtualizada = await db.fatura.update({
      where: { id: faturaId },
      data: {
        ...payloadExtraido,
        status: 'CONCLUIDO' as any,
        progress: 100,
        originalData: payloadExtraido, // Salva o payload bruto como backup para o botão "Redefinir"
      },
    });

    try {
      getIo().emit('invoice_updated', faturaAtualizada);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    console.log(`[Webhook] Fatura ${faturaId} atualizada com status: ${faturaAtualizada.status}`);

    return res.status(200).json({
      mensagem: 'Fatura processada e atualizada com sucesso.',
      faturaId: faturaAtualizada.id,
      status: faturaAtualizada.status,
    });
  } catch (err) {
    console.error(`[Webhook] Erro ao atualizar fatura ${faturaId}:`, err);
    return res.status(500).json({ error: 'Erro interno ao salvar os dados da fatura.' });
  }
};
