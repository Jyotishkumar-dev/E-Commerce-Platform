import { describe, expect, it, vi, beforeEach } from 'vitest';
import Razorpay from 'razorpay';
import { PaymentService } from './payment.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';

vi.mock('razorpay', () => ({
  default: vi.fn(() => ({
    orders: { create: vi.fn() },
    payments: { refund: vi.fn() },
  })),
}));

vi.mock('../lib/prisma.js', () => {
  const mockPrisma: any = {
    order: { findUnique: vi.fn(), update: vi.fn() },
    payment: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    product: { update: vi.fn() },
    cart: { findUnique: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
  };
  return {
    prisma: {
      ...mockPrisma,
      $transaction: vi.fn(async (cb: (tx: typeof mockPrisma) => Promise<any>) => {
        return await cb(mockPrisma);
      }),
    },
  };
});

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refundPayment', () => {
    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);
      await expect(PaymentService.refundPayment('usr_1', 'ord_999')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when user does not own the order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_2',
        payment: { id: 'pay_1', status: 'SUCCESS', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 },
      } as any);
      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when no payment exists', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: null,
      } as any);
      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when already refunded', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: { id: 'pay_1', status: 'REFUNDED', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 },
      } as any);
      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when payment not yet successful', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: { id: 'pay_1', status: 'PENDING', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 },
      } as any);
      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(ConflictError);
    });

    it('processes Razorpay refund and marks payment as REFUNDED', async () => {
      const mockPayment = { id: 'pay_1', status: 'SUCCESS', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: mockPayment,
      } as any);
      const mockRazorpay = { payments: { refund: vi.fn().mockResolvedValue({}) } };
      vi.mocked(Razorpay).mockImplementationOnce(() => mockRazorpay);

      const result = await PaymentService.refundPayment('usr_1', 'ord_1');

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('rp_pay_1', { amount: 100000, currency: 'INR' });
      expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'pay_1' }, data: { status: 'REFUNDED' } });
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord_1' }, data: { status: 'CANCELLED' } });
      expect(result).toEqual({ message: 'Refund processed successfully' });
    });

    it('processes COD refund without Razorpay call', async () => {
      const mockPayment = { id: 'pay_1', status: 'SUCCESS', provider: 'COD', providerPaymentId: null, amountCents: 100000 };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: mockPayment,
      } as any);

      const result = await PaymentService.refundPayment('usr_1', 'ord_1');

      expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'pay_1' }, data: { status: 'REFUNDED' } });
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord_1' }, data: { status: 'CANCELLED' } });
      expect(result).toEqual({ message: 'Refund processed successfully' });
    });

    it('throws BadRequestError when Razorpay refund fails', async () => {
      const mockPayment = { id: 'pay_1', status: 'SUCCESS', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: mockPayment,
      } as any);
      const mockRazorpay = { payments: { refund: vi.fn().mockRejectedValue(new Error('Razorpay error')) } };
      vi.mocked(Razorpay).mockImplementationOnce(() => mockRazorpay);

      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(BadRequestError);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('is idempotent - does not process refund twice for same payment', async () => {
      const mockPayment = { id: 'pay_1', status: 'REFUNDED', provider: 'RAZORPAY', providerPaymentId: 'rp_pay_1', amountCents: 100000 };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_1',
        payment: mockPayment,
      } as any);

      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(ConflictError);
    });
  });

  describe('cancelPayment', () => {
    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);
      await expect(PaymentService.cancelPayment('usr_1', 'ord_999')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when user does not own the order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1', userId: 'usr_2', payment: { id: 'pay_1', status: 'PENDING' },
      } as any);
      await expect(PaymentService.cancelPayment('usr_1', 'ord_1')).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when payment already completed', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1', userId: 'usr_1', payment: { id: 'pay_1', status: 'SUCCESS' },
      } as any);
      await expect(PaymentService.cancelPayment('usr_1', 'ord_1')).rejects.toThrow(ConflictError);
    });

    it('cancels pending payment and marks order as CANCELLED', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1', userId: 'usr_1', payment: { id: 'pay_1', status: 'PENDING' },
      } as any);

      const result = await PaymentService.cancelPayment('usr_1', 'ord_1');

      expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'pay_1' }, data: { status: 'FAILED' } });
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord_1' }, data: { status: 'CANCELLED' } });
      expect(result).toEqual({ message: 'Payment cancelled successfully' });
    });
  });

  describe('security - ownership validation', () => {
    it('refund rejects cross-user access', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1', userId: 'usr_999', payment: { id: 'pay_1', status: 'SUCCESS', provider: 'COD' },
      } as any);
      await expect(PaymentService.refundPayment('usr_1', 'ord_1')).rejects.toThrow(NotFoundError);
    });

    it('cancel rejects cross-user access', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1', userId: 'usr_999', payment: { id: 'pay_1', status: 'PENDING' },
      } as any);
      await expect(PaymentService.cancelPayment('usr_1', 'ord_1')).rejects.toThrow(NotFoundError);
    });
  });
});
