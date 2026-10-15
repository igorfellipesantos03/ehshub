import { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { ENV } from '../config/env';
import { getIo } from '../socket';
import { extrairDetalhesFatura } from '../utils/faturaDetalhes';

// Configuração do parser de XML para capturar atributos e usar prefixo padrão
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

// Casting do prisma para any para evitar problemas de sincronização do cache do IDE
const db = prisma as any;

// ── Gerar Link de Coleta ───────────────────────────────────────
export const generateLink = async (req: Request, res: Response) => {
  const { empresa, filial, expiresHours } = req.body;

  if (!empresa) {
    return res.status(400).json({ error: 'Empresa é obrigatória.' });
  }

  const filialValue = (filial as string) || null;

  try {
    // 1. Verificar se já existe um link ATIVO para a mesma empresa + filial
    const existingLink = await db.linkColeta.findFirst({
      where: {
        empresa,
        filial: filialValue,
        isActive: true,
      },
    });

    // Se já existe um link ativo, retorna ele ao invés de criar um novo
    if (existingLink) {
      return res.status(200).json({
        id: existingLink.id,
        token: existingLink.token,
        url: `${ENV.FRONTEND_URL}/invoice/${existingLink.token}`,
        empresa: existingLink.empresa,
        filial: existingLink.filial,
        existing: true, // Flag para o frontend saber que é um link já existente
      });
    }

    // 2. Não existe link ativo, criar um novo
    const token = crypto.randomUUID();

    const link = await db.linkColeta.create({
      data: {
        token,
        empresa,
        filial: filialValue,
        expiresAt: null, // Link permanente
        isActive: true,
      },
    });

    try {
      getIo().emit('link_created', link);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.status(201).json({
      id: link.id,
      token: link.token,
      url: `${ENV.FRONTEND_URL}/invoice/${link.token}`,
      empresa: link.empresa,
      filial: link.filial,
      existing: false,
    });
  } catch (err) {
    console.error('Erro ao gerar link de coleta:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar o link.' });
  }
};

// ── Validar Token do Link ─────────────────────────────────────
export const validateToken = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const link = await db.linkColeta.findUnique({ where: { token } });

    if (!link) {
      return res.json({ valid: false, reason: 'Token inválido.' });
    }

    if (!link.isActive) {
      return res.json({ valid: false, reason: 'Este link foi desativado ou substituído.' });
    }

    return res.json({
      valid: true,
      empresa: link.empresa,
      filial: link.filial,
    });
  } catch (err) {
    console.error('Erro ao validar token:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

// ── Upload e Processamento de XML ─────────────────────────────
export const uploadInvoice = async (req: Request, res: Response) => {
  const { token, senderName, local } = req.body;
  const xmlFile = req.file;

  if (!token || !senderName || !xmlFile) {
    return res.status(400).json({ error: 'Token, nome e arquivo XML são obrigatórios.' });
  }

  try {
    // 1. Validar Token antes do processamento
    const link = await db.linkColeta.findUnique({ where: { token } });

    if (!link) {
      return res.status(404).json({ error: 'Token inválido.' });
    }

    if (!link.isActive) {
      return res.status(403).json({ error: 'Este link foi desativado ou substituído.' });
    }

    // 2. Parsear o conteúdo (lê do disco, pois multer agora salva em diskStorage)
    const fileContent = fs.readFileSync(xmlFile.path, 'utf-8');
    const isJson = xmlFile.originalname.toLowerCase().endsWith('.json') || xmlFile.mimetype === 'application/json';
    let jsonObj: any;

    try {
      jsonObj = isJson ? JSON.parse(fileContent) : parser.parse(fileContent);
    } catch (e) {
      return res.status(400).json({ error: 'Arquivo inválido ou mal formatado.' });
    }

    // Função utilitária para busca profunda (deep search) no XML legado
    const findValuesByKey = (obj: any, keyToFind: string): any[] => {
      let results: any[] = [];
      if (typeof obj !== 'object' || obj === null) return results;
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          results = results.concat(findValuesByKey(item, keyToFind));
        }
      } else {
        for (const key in obj) {
          if (key === keyToFind) {
            results.push(obj[key]);
          }
          if (typeof obj[key] === 'object') {
            results = results.concat(findValuesByKey(obj[key], keyToFind));
          }
        }
      }
      return results;
    };

    // 3. Extrair campos relevantes
    let emitente: string | null = null;
    let dataEmissao: string | null = null;
    let faturaNumber: string | null = null;
    let valorFaturaRaw: any = null;
    let consumoRaw: any = null;
    let uMed: string | null = null;

    if (isJson && jsonObj.NF3e && jsonObj.NF3e.infNF3e) {
      // Regras de Extração Específicas para NF3e (JSON)
      const inf = jsonObj.NF3e.infNF3e;
      emitente = inf.emit?.xNome || null;
      dataEmissao = inf.ide?.dhEmi || null;
      faturaNumber = inf.ide?.nNF || null;
      valorFaturaRaw = inf.total?.vNF || null;

      // Buscar Consumo (qFaturada) e uMed dentro de NFdet.det
      if (inf.NFdet?.det) {
        const dets = Array.isArray(inf.NFdet.det) ? inf.NFdet.det : [inf.NFdet.det];
        for (const det of dets) {
          const prod = det.detItem?.prod;
          if (prod && prod.qFaturada) {
            consumoRaw = prod.qFaturada;
            uMed = prod.uMed;
            break; // Pega o primeiro item faturado válido
          }
        }
      }
    } else {
      // Lógica de Extração para XML Legado (Busca Profunda)
      const vTotDFeList = findValuesByKey(jsonObj, 'vTotDFe');
      valorFaturaRaw = vTotDFeList.length > 0 ? vTotDFeList[0] : null;

      const vFatList = findValuesByKey(jsonObj, 'vFat');
      consumoRaw = vFatList.length > 0 ? vFatList[vFatList.length - 1] : null;

      const emitList = findValuesByKey(jsonObj, 'emit');
      emitente = emitList.length > 0 ? emitList[0].xNome : null;

      const nNFList = findValuesByKey(jsonObj, 'nNF');
      faturaNumber = nNFList.length > 0 ? String(nNFList[0]) : null;

      const dhEmiList = findValuesByKey(jsonObj, 'dhEmi');
      dataEmissao = dhEmiList.length > 0 ? String(dhEmiList[0]) : null;
    }

    // Função utilitária para converter valor string BR ("102.880,52") para numérico
    const parseNumberBR = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const str = String(val).replace(/\./g, '').replace(',', '.');
      return parseFloat(str) || 0;
    };

    const valorFatura = parseNumberBR(valorFaturaRaw);
    let consumoKwh = parseNumberBR(consumoRaw);

    // Regra de Negócio: Conversão de unidade de Medida (MWH para kWh)
    if (uMed && String(uMed).toUpperCase() !== 'KWH') {
      if (String(uMed).toUpperCase() === 'MWH') {
        consumoKwh = consumoKwh * 1000;
      }
    }

    if (isNaN(valorFatura) || valorFatura <= 0) {
      return res.status(400).json({ error: 'Arquivo inválido: Valor da Fatura não encontrado ou inválido.' });
    }

    // 4. Validar se a fatura já existe (faturaNumber e dataEmissao)
    if (faturaNumber && dataEmissao) {
      const existingFatura = await db.fatura.findFirst({
        where: {
          faturaNumber,
          dataEmissao,
        },
      });

      if (existingFatura) {
        return res.status(400).json({ error: 'Esta fatura já foi enviada ao sistema (número e data já existem).' });
      }
    }

    // 5. Salvar o registro da Fatura no banco
    const upload = await db.fatura.create({
      data: {
        senderName: senderName as string,
        emitente: emitente ? String(emitente) : null,
        local: local ? String(local) : null,
        empresa: link.empresa,
        faturaNumber: faturaNumber,
        valorFatura: valorFatura,
        consumoKwh: isNaN(consumoKwh) ? null : consumoKwh,
        dataEmissao: dataEmissao,
        xmlFileName: xmlFile.originalname,
        filePath: xmlFile.filename, // Nome do arquivo salvo em disco pelo multer
        linkId: link.id,
      },
    });

    try {
      getIo().emit('invoice_created', upload);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.status(201).json({
      message: 'Fatura processada com sucesso!',
      data: {
        id: upload.id,
        senderName: upload.senderName,
        emitente: upload.emitente,
        faturaNumber: upload.faturaNumber,
        valorFatura: upload.valorFatura,
        consumoKwh: upload.consumoKwh,
        dataEmissao: upload.dataEmissao,
        xmlFileName: upload.xmlFileName,
        empresa: upload.empresa,
        filial: link.filial,
      },
    });
  } catch (err) {
    console.error('Erro ao processar upload de nota:', err);
    return res.status(500).json({ error: 'Erro ao processar o arquivo XML.' });
  }
};

// ── Listar Faturas Recebidas (Admin) ─────────────────────────────
export const listInvoices = async (_req: Request, res: Response) => {
  try {
    const faturas = await db.fatura.findMany({
      include: { link: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(faturas);
  } catch (err) {
    console.error('Erro ao listar faturas:', err);
    return res.status(500).json({ error: 'Erro ao listar faturas.' });
  }
};

// ── Atualizar Fatura (Admin) ─────────────────────────────────────
export const updateInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { emitente, faturaNumber, valorFatura, consumoKwh, dataEmissao } = req.body;

  try {
    const existing = await db.fatura.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    const updated = await db.fatura.update({
      where: { id },
      data: {
        emitente: emitente !== undefined ? emitente : existing.emitente,
        faturaNumber: faturaNumber !== undefined ? faturaNumber : existing.faturaNumber,
        valorFatura: valorFatura !== undefined ? parseFloat(String(valorFatura)) : existing.valorFatura,
        consumoKwh: consumoKwh !== undefined ? (consumoKwh !== null ? parseFloat(String(consumoKwh)) : null) : existing.consumoKwh,
        dataEmissao: dataEmissao !== undefined ? dataEmissao : existing.dataEmissao,
        ...extrairDetalhesFatura(req.body),
      },
      include: { link: true },
    });

    try {
      getIo().emit('invoice_updated', updated);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar fatura:', err);
    return res.status(500).json({ error: 'Erro ao atualizar fatura.' });
  }
};

// ── Download do arquivo da Fatura ─────────────────────────────────
export const downloadFile = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const fatura = await db.fatura.findUnique({ where: { id } });

    if (!fatura || !fatura.filePath) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const absolutePath = path.join(uploadsDir, fatura.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
    }

    const downloadName = fatura.xmlFileName || fatura.filePath;
    return res.download(absolutePath, downloadName);
  } catch (err) {
    console.error('Erro ao baixar arquivo:', err);
    return res.status(500).json({ error: 'Erro ao baixar arquivo.' });
  }
};

// ── Listar Links Gerados (Admin) ───────────────────────────────
export const listLinks = async (_req: Request, res: Response) => {
  try {
    const links = await db.linkColeta.findMany({
      include: { faturas: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(links);
  } catch (err) {
    console.error('Erro ao listar links:', err);
    return res.status(500).json({ error: 'Erro ao listar links.' });
  }
};

// ── Obter Status da Fatura (Polling) ───────────────────────────
export const getInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fatura = await db.fatura.findUnique({
      where: { id },
    });

    if (!fatura) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    return res.json(fatura);
  } catch (err) {
    console.error('Erro ao buscar status da fatura:', err);
    return res.status(500).json({ error: 'Erro ao buscar status.' });
  }
};

// ── Alterar Status do Link (Ativar/Desativar) ──────────────────
export const toggleLinkStatus = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const link = await db.linkColeta.findUnique({ where: { id } });
    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado.' });
    }

    const updated = await db.linkColeta.update({
      where: { id },
      data: { isActive: !link.isActive },
    });

    try {
      getIo().emit('link_updated', updated);
    } catch (e) {}

    return res.json(updated);
  } catch (err) {
    console.error('Erro ao alterar status do link:', err);
    return res.status(500).json({ error: 'Erro ao atualizar o status.' });
  }
};

// ── Alterar Status de Vários Links (Bulk Toggle) ──────────────────
export const toggleAllLinksStatus = async (req: Request, res: Response) => {
  const { ids, activate } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Lista de IDs inválida.' });
  }

  try {
    const updated = await db.linkColeta.updateMany({
      where: { id: { in: ids } },
      data: { isActive: activate },
    });

    try {
      getIo().emit('link_updated', { bulk: true });
    } catch (e) {}

    return res.json({ count: updated.count });
  } catch (err) {
    console.error('Erro ao alterar status em massa:', err);
    return res.status(500).json({ error: 'Erro ao atualizar os status.' });
  }
};

// ── Deletar Fatura (Admin) ──────────────────────────────────────
export const deleteInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await db.fatura.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    // Opcional: Deletar arquivo físico
    if (existing.filePath) {
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      const absolutePath = path.join(uploadsDir, existing.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await db.fatura.delete({ where: { id } });

    try {
      getIo().emit('invoice_deleted', id);
    } catch (e) {}

    return res.json({ message: 'Fatura excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar fatura:', err);
    return res.status(500).json({ error: 'Erro ao deletar fatura.' });
  }
};

// ── Deletar Link de Coleta (Admin) ──────────────────────────────
export const deleteLink = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const link = await db.linkColeta.findUnique({
      where: { id },
      include: { faturas: true }
    });

    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado.' });
    }

    // 1. Deletar arquivos físicos das faturas associadas
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    for (const fatura of link.faturas) {
      if (fatura.filePath) {
        const absolutePath = path.join(uploadsDir, fatura.filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }
    }

    // 2. Deletar faturas associadas no banco
    await db.fatura.deleteMany({
      where: { linkId: id }
    });

    // 3. Deletar o link
    await db.linkColeta.delete({
      where: { id }
    });

    try {
      getIo().emit('link_deleted', id);
    } catch (e) {}

    return res.json({ message: 'Link e faturas associadas excluídos com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar link:', err);
    return res.status(500).json({ error: 'Erro ao deletar link.' });
  }
};

// ── Deletar Vários Links (Bulk Delete) ─────────────────────────
export const deleteSelectedLinks = async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Lista de IDs inválida.' });
  }

  try {
    const links = await db.linkColeta.findMany({
      where: { id: { in: ids } },
      include: { faturas: true }
    });

    // 1. Deletar arquivos físicos
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    for (const link of links) {
      for (const fatura of link.faturas) {
        if (fatura.filePath) {
          const absolutePath = path.join(uploadsDir, fatura.filePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }
        }
      }
    }

    // 2. Deletar faturas em massa
    await db.fatura.deleteMany({
      where: { linkId: { in: ids } }
    });

    // 3. Deletar links em massa
    const deleted = await db.linkColeta.deleteMany({
      where: { id: { in: ids } }
    });

    try {
      getIo().emit('links_deleted', ids);
    } catch (e) {}

    return res.json({ message: `${deleted.count} links excluídos com sucesso.` });
  } catch (err) {
    console.error('Erro ao deletar links em massa:', err);
    return res.status(500).json({ error: 'Erro ao deletar links.' });
  }
};
