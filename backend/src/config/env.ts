import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3333,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://ehshub.conasa.com',
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL as string,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET as string,
  DATABASE_URL: process.env.DATABASE_URL as string,

  // Protheus: só para confirmar usuário/senha no vínculo da conta.
  PROTHEUS_BASE_URL: process.env.PROTHEUS_BASE_URL || 'https://restauth.protheus.conasa.com',
  PROTHEUS_TIMEOUT_MS: Number(process.env.PROTHEUS_TIMEOUT_MS || 15000),

  // SSO pelo CentralHub. A troca do código é servidor a servidor, pelo loopback.
  CENTRALHUB_INTERNAL_URL: process.env.CENTRALHUB_INTERNAL_URL || 'http://127.0.0.1:3001',
  SSO_CLIENT_ID: process.env.SSO_CLIENT_ID || 'ehshub',
  SSO_CLIENT_SECRET: process.env.SSO_CLIENT_SECRET as string,

  // Integração Protheus -> EHS HUB (faturas de energia do documento de entrada).
  // Sem valor padrão: sem o segredo no .env, as rotas da integração respondem 503.
  PROTHEUS_INTEGRATION_SECRET: process.env.PROTHEUS_INTEGRATION_SECRET as string,
};

// Sem valor padrão no código: um segredo escrito aqui vaza junto com o repositório.
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET e JWT_REFRESH_SECRET devem estar definidos no .env.');
}
