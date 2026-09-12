import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { OrderService } from './order.service.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface CreatePaymentOrderInput {
  orderId: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentService {
  static async createPaymentOrder(userId: string, input: CreatePaymentOrderInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.userId !== userId) {
      throw new NotFoundError('Order not found.');
    }

    if (order.payment) {
      if (order.payment.status === 'SUCCESS') {
        throw new ConflictError('Payment already completed for this order.');
      }
      if (order.payment.providerOrderId) {
        return {
          providerOrderId: order.payment.providerOrderId,
          amount: order.payment.amountCents,
          currency: order.payment.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        };
      }
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalCents,
      currency: 'INR',
      receipt: `order_${order.id}`,
      notes: {
        shopvibe_order_id: order.id,
        user_id: userId,
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        providerOrderId: razorpayOrder.id,
        amountCents: order.totalCents,
        currency: 'INR',
        status: 'PENDING',
        provider: 'RAZORPAY',
      },
      create: {
        orderId: order.id,
        providerOrderId: razorpayOrder.id,
        amountCents: order.totalCents,
        currency: 'INR',
        status: 'PENDING',
        provider: 'RAZORPAY',
      },
    });

    return {
      providerOrderId: razorpayOrder.id,
      amount: order.totalCents,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  static async verifyPayment(input: VerifyPaymentInput) {
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== input.razorpay_signature) {
      throw new BadRequestError('Invalid payment signature.');
    }

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: input.razorpay_order_id },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      throw new NotFoundError('Payment record not found.');
    }

    if (payment.status === 'SUCCESS') {
      return { payment, order: payment.order, alreadyProcessed: true };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: input.razorpay_payment_id,
        status: 'SUCCESS',
      },
    });

    const order = await OrderService.confirmOrderAfterPayment(payment.orderId);

    return { payment, order, alreadyProcessed: false };
  }

  static async handleWebhook(payload: unknown, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestError('Missing webhook signature.');
    }

    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestError('Invalid webhook signature.');
    }

    const event = payload as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            currency: string;
            status: string;
            captured: boolean;
          };
        };
      };
    };

    switch (event.event) {
      case 'payment.captured': {
        const paymentEntity = event.payload.payment.entity;
        await this.handlePaymentCaptured(paymentEntity);
        break;
      }
      case 'payment.failed': {
        const paymentEntity = event.payload.payment.entity;
        await this.handlePaymentFailed(paymentEntity);
        break;
      }
      case 'refund.created':
      case 'refund.processed': {
        break;
      }
    }

    return { received: true };
  }

  private static async handlePaymentCaptured(paymentEntity: {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    captured: boolean;
  }) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: paymentEntity.order_id },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return;
    }

    if (payment.status === 'SUCCESS') {
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: paymentEntity.id,
        status: 'SUCCESS',
      },
    });

    await OrderService.confirmOrderAfterPayment(payment.orderId);
  }

  private static async handlePaymentFailed(paymentEntity: {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  }) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: paymentEntity.order_id },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return;
    }

    if (payment.status === 'FAILED') {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: paymentEntity.id,
          status: 'FAILED',
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'CANCELLED' },
      });

      for (const item of payment.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });
  }

  static async retryPayment(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.userId !== userId) {
      throw new NotFoundError('Order not found.');
    }

    if (order.payment?.status === 'SUCCESS') {
      throw new ConflictError('Payment already completed for this order.');
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new ConflictError('Cannot retry payment for this order.');
    }

    if (order.payment?.providerOrderId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { id: order.payment.id },
      });

      if (existingPayment && existingPayment.status === 'PENDING') {
        return {
          providerOrderId: existingPayment.providerOrderId!,
          amount: existingPayment.amountCents,
          currency: existingPayment.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        };
      }
    }

    return this.createPaymentOrder(userId, { orderId });
  }

  static async refundPayment(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.userId !== userId) {
      throw new NotFoundError('Order not found.');
    }

    const payment = order.payment;

    if (!payment) {
      throw new NotFoundError('Payment not found.');
    }

    if (payment.status === 'REFUNDED') {
      throw new ConflictError('Refund already processed for this order.');
    }

    if (payment.status !== 'SUCCESS') {
      throw new ConflictError('Only paid orders can be refunded.');
    }

    if (payment.provider === 'RAZORPAY') {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      try {
        await razorpay.payments.refund(payment.providerPaymentId!, {
          amount: payment.amountCents,
          currency: 'INR',
        });
      } catch (e) {
        throw new BadRequestError('Refund request failed. Please try again or contact support.');
      }
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Refund processed successfully' };
  }

  static async cancelPayment(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.userId !== userId) {
      throw new NotFoundError('Order not found.');
    }

    if (order.payment?.status === 'SUCCESS') {
      throw new ConflictError('Cannot cancel completed payment.');
    }

    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'FAILED' },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Payment cancelled successfully' };
  }
}