import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CreateOrderSchema, VerifyPaymentSchema } from '../types';
import express from 'express';

const router = Router();

router.post('/create-order', authenticateJWT, requireRole('company'), validate(CreateOrderSchema), paymentController.createOrder);
router.post('/verify', authenticateJWT, requireRole('company'), validate(VerifyPaymentSchema), paymentController.verifyPayment);
// Test-mode simulation (skips Razorpay when placeholder keys are configured)
router.post('/simulate-pay', authenticateJWT, requireRole('company'), paymentController.simulatePay);
// Webhook must receive raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

export default router;
