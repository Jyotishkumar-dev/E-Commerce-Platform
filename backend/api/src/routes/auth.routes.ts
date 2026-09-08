import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateBody } from '../middlewares/validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public authentication flows
router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/refresh-token', AuthController.refreshSession);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);

// Authenticated customer/admin profile management
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', authenticate, authLimiter, validateBody(changePasswordSchema), AuthController.changePassword);

export { router as authRouter };
