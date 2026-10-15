import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

// ── Middleware de Autenticação (Verifica JWT) ──────────────────
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // O header vem no formato "Bearer <token>"
  const [, token] = authHeader.split(' ');

  try {
    const secret = ENV.JWT_SECRET;
    
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is not set!');
      return res.status(500).json({ error: 'Erro interno no servidor de autenticação.' });
    }

    const decoded = jwt.verify(token as string, secret) as any;
    
    // Injeta os dados do usuário na requisição para uso nos controllers
    (req as any).user = {
      id: String(decoded.id),
      role: String(decoded.role)
    };
    
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// ── Middleware de Autorização (Verifica Papéis/Roles) ─────────
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // Verifica se o usuário logado tem permissão para acessar a rota
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' });
    }
    
    next();
  };
};
