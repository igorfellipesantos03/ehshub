import { Router } from 'express';
import * as protheusIntegracaoController from '../controllers/protheusIntegracaoController';
import { validateRequest } from '../middlewares/validateRequest';
import { documentoProtheusSchema, faturaProtheusSchema } from '../utils/protheusSchemas';

// Rotas chamadas pelo Protheus (servidor a servidor). Montadas em server.ts
// antes do parser JSON global, com parser e limitador próprios.
const router = Router();

router.post(
  '/faturas',
  protheusIntegracaoController.autenticarProtheus,
  validateRequest(faturaProtheusSchema),
  protheusIntegracaoController.receberFatura,
);

router.delete(
  '/faturas',
  protheusIntegracaoController.autenticarProtheus,
  validateRequest(documentoProtheusSchema),
  protheusIntegracaoController.removerFatura,
);

export default router;
