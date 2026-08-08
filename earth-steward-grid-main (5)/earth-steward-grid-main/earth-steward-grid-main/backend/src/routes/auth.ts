import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  CompanyRegisterSchema,
  CompanyLoginSchema,
  GovLoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../types';

const router = Router();

router.post('/company/register', authLimiter, validate(CompanyRegisterSchema), authController.registerCompany);
router.post('/company/login', authLimiter, validate(CompanyLoginSchema), authController.loginCompany);
router.post('/gov/login', authLimiter, validate(GovLoginSchema), authController.loginGov);
router.post('/refresh', validate(RefreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(ResetPasswordSchema), authController.resetPassword);

export default router;
