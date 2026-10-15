import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

// ── Listar Todos os Usuários ──────────────────────────────────
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

// ── Criar Novo Usuário ────────────────────────────────────────
export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role, status } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Este e-mail já está em uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        status: status || 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

// ── Atualizar Usuário Existente ────────────────────────────────
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, status } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: String(id) } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password) {
      updateData.password = await bcrypt.hash(password, 8);
    }

    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

// ── Excluir Usuário ───────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Impede que o usuário logado exclua a si mesmo
    if ((req as any).user?.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    }

    await prisma.user.delete({ where: { id: String(id) } });
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};

// ── Alterar Status de Aprovação ───────────────────────────────
export const changeUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' ou 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    return res.status(500).json({ error: 'Erro ao alterar status do usuário' });
  }
};
