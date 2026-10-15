import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({
          error: 'Validação falhou',
          details: error.errors.map((e: any) => e.message),
        });
      }
      return res.status(400).json({ error: 'Erro de validação.' });
    }
  };
};
