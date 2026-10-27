import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import prisma from '../utils/prisma';
import { ENV } from '../config/env';
import { getIo } from '../socket';

const db = prisma as any;

interface ArquivoDaFatura {
  /** Caminho absoluto do PDF salvo em disco. */
  caminho: string;
  /** Nome com que o arquivo foi enviado (vai para o n8n como nome do anexo). */
  nomeOriginal: string;
  mimetype?: string;
}

interface DisparoN8n {
  faturaId: string;
  senderName: string;
  /** Token do link de coleta. O n8n não usa: faturas do Protheus mandam vazio. */
  linkToken?: string;
  arquivo: ArquivoDaFatura;
}

/**
 * Dispara o pipeline do n8n (OCR + TESS IA) para uma fatura já gravada com
 * status PROCESSANDO. Não espera o processamento: o resultado volta pelo
 * webhook /api/webhooks/faturas/processadas.
 *
 * Se o n8n recusar ou estiver fora do ar, a fatura vai para ERRO_PROCESSAMENTO
 * com o motivo, para não ficar "processando" para sempre.
 */
export function dispararPipelineN8n({ faturaId, senderName, linkToken = '', arquivo }: DisparoN8n) {
  const formData = new FormData();
  formData.append('faturaId', faturaId);
  formData.append('linkToken', linkToken);
  formData.append('senderName', senderName);
  formData.append('pdfFile', fs.createReadStream(arquivo.caminho), {
    filename: arquivo.nomeOriginal,
    contentType: arquivo.mimetype || 'application/pdf',
  });

  axios
    .post(ENV.N8N_WEBHOOK_URL, formData, {
      headers: formData.getHeaders(),
      timeout: 30000, // 30s para disparar o envio
    })
    .catch(async (err) => {
      if (err.response) {
        console.error(`[n8n Response Error]:`, err.response.data);
      } else {
        console.error(`[n8n] Falha ao disparar o pipeline da fatura ${faturaId}:`, err.message);
      }

      try {
        const faturaAtualizada = await db.fatura.update({
          where: { id: faturaId },
          data: {
            status: 'ERRO_PROCESSAMENTO',
            errorReason: 'Não foi possível iniciar o processamento da fatura (serviço de extração indisponível). Tente novamente em alguns instantes.',
          },
        });
        getIo().emit('invoice_updated', faturaAtualizada);
      } catch (updateErr) {
        console.error(`[n8n] Não foi possível marcar a fatura ${faturaId} com erro:`, updateErr);
      }
    });
}
