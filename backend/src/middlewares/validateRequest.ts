import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      // Zod 4 expõe os problemas em `issues`; `errors` era o nome no Zod 3.
      const problemas = error.issues ?? error.errors;
      if (Array.isArray(problemas)) {
        return res.status(400).json({
          error: 'Validação falhou',
          details: problemas.map((e: any) => (e.path?.length ? `${e.path.join('.')}: ${e.message}` : e.message)),
        });
      }
      return res.status(400).json({ error: 'Erro de validação.' });
    }
  };
};
