import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { ENV } from './config/env';
import { createServer } from 'http';

const app = express();
const PORT = ENV.PORT;

// Logger simples para depuração
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Segurança (Helmet e CORS) ─────────────────────────────────
app.use(helmet());

const frontendUrl = ENV.FRONTEND_URL;
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Trust Proxy (necessário atrás de Nginx/reverse proxy) ─────
app.set('trust proxy', 1);

// ── Limitação de Taxa Global (Rate Limiting) ──────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite cada IP a 100 requisições por `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});

// ── Limitação de Taxa Estrita para Autenticação ──────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite cada IP a 5 tentativas
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login ou cadastro. Tente novamente mais tarde.' }
});

// Aplica a limitação restrita nas rotas de auth
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/sso', authLimiter);

// O vínculo confere senha no Protheus: sem freio, o EHS viraria uma porta para
// testar senhas do ERP. Conta todas as tentativas, inclusive as que acertam.
const protheusLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de vincular o Protheus. Tente novamente mais tarde.' }
});
app.use('/api/auth/protheus/link', protheusLinkLimiter);

// Aplica o limite global nas demais rotas da API
app.use('/api/', limiter);

// ── Registro de Rotas ─────────────────────────────────────────
app.use('/api', router);

// Rota de Health Check
app.get('/', (req, res) => {
  res.json({ message: 'EHS Hub API está rodando!' });
});

// ── Tratamento Global de Erros (Multer, etc.) ─────────────────
import multer from 'multer';
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo muito grande. O tamanho máximo permitido é 15MB.' });
    }
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  if (err) {
    console.error('Erro não tratado:', err);
    return res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
  }
  _next();
});

import { initSocket } from './socket';

const server = createServer(app);
initSocket(server);

// Inicialização do Servidor
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor pronto em http://0.0.0.0:${PORT}`);
});
