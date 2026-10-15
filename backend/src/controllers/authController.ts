import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { ENV } from '../config/env';
import { User } from '@prisma/client';
import {
  validarCredenciais,
  CredenciaisProtheusInvalidas,
  ProtheusIndisponivel,
} from '../services/protheusService';
import { resgatarCodigo } from '../services/centralHubSso';

// ── Emissão da Sessão (usada pelo login local e pelo SSO) ──────
const emitirSessao = async (user: User) => {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: '1h' } // Tempo de vida curto (1 hora)
  );

  const refreshTokenString = jwt.sign(
    { id: user.id },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Refresh token válido por 7 dias
  );

  // Salva o refresh token no banco de dados
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      protheusLinked: Boolean(user.protheusUsername),
    },
    token,
    refreshToken: refreshTokenString,
  };
};

// ── Login de Usuário ──────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Sua conta ainda está pendente de aprovação pelo Administrador.' });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Sua conta foi rejeitada.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    return res.json(await emitirSessao(user));
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ── Cadastro de Usuário ───────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'USER', 
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ── Atualizar Token (Refresh Token) ───────────────────────────
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token é obrigatório.' });
  }

  try {
    const refreshSecret = ENV.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      return res.status(500).json({ error: 'Erro de configuração do servidor.' });
    }

    const decoded = jwt.verify(refreshToken, refreshSecret) as any;

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.id,
        expiresAt: { gt: new Date() } // Somente se não estiver expirado no BD
      }
    });

    if (!storedToken) {
      return res.status(403).json({ error: 'Refresh token inválido ou expirado.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user || user.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Usuário inválido ou inativo.' });
    }

    const secret = ENV.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Erro de configuração do servidor.' });

    const newToken = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '1h' }
    );

    return res.json({ token: newToken });
  } catch (err) {
    console.error('Erro no refresh token:', err);
    return res.status(403).json({ error: 'Refresh token inválido ou expirado.' });
  }
};

// ── Vincular Usuário do Protheus à Conta Logada ───────────────
// Confere a credencial no Protheus e grava só o username: a senha e o token
// devolvidos pelo Protheus não são guardados.
export const vincularProtheus = async (req: Request, res: Response) => {
  const username = String(req.body.username).trim();
  const { password } = req.body;

  try {
    await validarCredenciais(username, password);
  } catch (err) {
    // 422 e não 401: um 401 faria o frontend achar que a sessão do EHS caiu.
    if (err instanceof CredenciaisProtheusInvalidas) {
      return res.status(422).json({ error: 'Usuário ou senha do Protheus incorretos.' });
    }
    if (err instanceof ProtheusIndisponivel) {
      return res.status(502).json({ error: 'O Protheus está indisponível no momento. Tente novamente mais tarde.' });
    }
    console.error('Erro ao validar no Protheus:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }

  try {
    // Minúsculo, igual ao CentralHub: é por este valor que o SSO encontra a conta.
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { protheusUsername: username.toLowerCase() },
    });
    return res.json({ protheusLinked: true });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este usuário do Protheus já está vinculado a outra conta do EHS HUB.' });
    }
    console.error('Erro ao vincular usuário do Protheus:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ── Login via CentralHub (SSO) ────────────────────────────────
// Recebe o código de uso único que o CentralHub mandou pelo navegador, troca
// pela identidade (servidor a servidor) e abre a sessão do EHS HUB.
export const loginSso = async (req: Request, res: Response) => {
  const { code } = req.body;

  try {
    const identidade = await resgatarCodigo(code);

    // 400 e não 401: um 401 faria o frontend tratar como sessão expirada.
    if (!identidade) {
      return res.status(400).json({ error: 'O login pelo CentralHub expirou. Tente novamente.' });
    }

    const user = await prisma.user.findUnique({
      where: { protheusUsername: identidade.username.toLowerCase() },
    });

    if (!user) {
      return res.status(403).json({
        code: 'SSO_NAO_VINCULADO',
        error: `Seu usuário do Protheus (${identidade.username}) ainda não está vinculado a uma conta do EHS HUB. Entre uma vez com seu e-mail e senha para fazer o vínculo.`,
      });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Sua conta ainda está pendente de aprovação pelo Administrador.' });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Sua conta foi rejeitada.' });
    }

    return res.json(await emitirSessao(user));
  } catch (err) {
    console.error('Erro no login via CentralHub:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
