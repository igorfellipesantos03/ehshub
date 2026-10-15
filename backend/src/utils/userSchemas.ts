import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número');

export const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Formato de e-mail inválido'),
  password: passwordSchema,
  role: z.enum(['ADMIN', 'USER', 'REVIEWER']).optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Formato de e-mail inválido'),
  password: passwordSchema,
  role: z.enum(['ADMIN', 'USER', 'REVIEWER']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo').optional(),
  email: z.string().email('Formato de e-mail inválido').optional(),
  password: passwordSchema.optional(),
  role: z.enum(['ADMIN', 'USER', 'REVIEWER']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const protheusLinkSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário do Protheus.').max(100),
  password: z.string().min(1, 'Informe a senha do Protheus.').max(200),
});

export const ssoLoginSchema = z.object({
  code: z.string().min(1).max(200),
});
