import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as invoiceController from '../controllers/invoiceController';
import * as userController from '../controllers/userController';
import * as pdfPipelineController from '../controllers/pdfPipelineController';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validateRequest';
import { loginSchema, registerSchema, createUserSchema, updateUserSchema, protheusLinkSchema, ssoLoginSchema } from '../utils/userSchemas';
import { upload } from '../config/multer';

const router = Router();

// ── Rotas de Autenticação ──────────────────────────────────────
router.post('/auth/login', validateRequest(loginSchema), authController.login);
router.post('/auth/register', validateRequest(registerSchema), authController.register);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/sso', validateRequest(ssoLoginSchema), authController.loginSso);
router.post('/auth/protheus/link', authenticate, validateRequest(protheusLinkSchema), authController.vincularProtheus);

// ── Rotas de Usuários (Apenas ADMIN) ───────────────────────────
router.get('/users', authenticate, authorize(['ADMIN']), userController.getAllUsers);
router.post('/users', authenticate, authorize(['ADMIN']), validateRequest(createUserSchema), userController.createUser);
router.put('/users/:id', authenticate, authorize(['ADMIN']), validateRequest(updateUserSchema), userController.updateUser);
router.delete('/users/:id', authenticate, authorize(['ADMIN']), userController.deleteUser);
router.patch('/users/:id/status', authenticate, authorize(['ADMIN']), userController.changeUserStatus);

// ── Rotas de Links de Coleta (Autenticado) ──────────────────────
router.post('/invoice/links', authenticate, authorize(['ADMIN', 'USER']), invoiceController.generateLink);
router.get('/invoice/links', authenticate, authorize(['ADMIN']), invoiceController.listLinks);
router.patch('/invoice/links/toggle-all', authenticate, authorize(['ADMIN']), invoiceController.toggleAllLinksStatus);
router.patch('/invoice/links/:id/toggle', authenticate, authorize(['ADMIN']), invoiceController.toggleLinkStatus);
router.delete('/invoice/links/bulk', authenticate, authorize(['ADMIN']), invoiceController.deleteSelectedLinks);
router.delete('/invoice/links/:id', authenticate, authorize(['ADMIN']), invoiceController.deleteLink);

// ── Rotas Públicas de Nota Fiscal (Validação por Token) ────────
router.get('/invoice/validate/:token', invoiceController.validateToken);
router.post('/invoice/upload', upload.single('xml'), invoiceController.uploadInvoice);
router.get('/invoice/status/:id', invoiceController.getInvoiceStatus);

// ── Rotas Administrativas de Notas Fiscais ────────────────────
router.get('/invoice/uploads', authenticate, authorize(['ADMIN']), invoiceController.listInvoices);
router.put('/invoice/:id', authenticate, authorize(['ADMIN']), invoiceController.updateInvoice);
router.get('/invoice/:id/download', authenticate, authorize(['ADMIN']), invoiceController.downloadFile);
router.delete('/invoice/:id', authenticate, authorize(['ADMIN']), invoiceController.deleteInvoice);

// ── Pipeline PDF: Upload Assíncrono via n8n + TESS IA ───────────
// Recebe o PDF, cria registro com status PROCESSANDO e dispara o n8n
router.post('/invoice/upload-pdf', upload.single('pdf'), pdfPipelineController.uploadPdfParaN8n);

// ── Webhook Protegido: Callback do n8n com resultado da TESS IA ──
// NÃO requer JWT — autenticado pelo header x-webhook-secret
router.post('/webhooks/faturas/processadas', pdfPipelineController.callbackN8n);

export default router;
