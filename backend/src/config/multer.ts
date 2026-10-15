import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

// ── Diretório de uploads persistente ──────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Garante que o diretório exista ao iniciar
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Armazenamento em disco com nome único ─────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (
    file.mimetype === 'text/xml' || 
    file.mimetype === 'application/xml' || 
    file.originalname.toLowerCase().endsWith('.xml') ||
    file.mimetype === 'application/json' ||
    file.originalname.toLowerCase().endsWith('.json') ||
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo inválido. Apenas XML, JSON ou PDF são permitidos.'));
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // Limite de 15MB por arquivo
  }
});

export { UPLOADS_DIR };
