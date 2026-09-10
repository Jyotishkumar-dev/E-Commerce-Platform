import type { NextFunction, Request, Response } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { getParam } from '../utils/params.js';
import { created, ok } from '../utils/response.js';

export class PaymentController {
  static async createPaymentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.createPaymentOrder(req.user!.id, req.body);
      return created(res, req, result, 'Payment order created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.verifyPayment(req.body);
      return ok(res, req, result, result.alreadyProcessed ? 'Payment already verified' : 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  }

  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const result = await PaymentService.handleWebhook(req.body, signature);
      return ok(res, req, result, 'Webhook processed');
    } catch (error) {
      next(error);
    }
  }

  static async retryPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = getParam(req, 'orderId');
      const result = await PaymentService.retryPayment(req.user!.id, orderId);
      return ok(res, req, result, 'Payment retry initiated');
    } catch (error) {
      next(error);
    }
  }

  static async cancelPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = getParam(req, 'orderId');
      const result = await PaymentService.cancelPayment(req.user!.id, orderId);
      return ok(res, req, result, 'Payment cancelled');
    } catch (error) {
      next(error);
    }
  }
}