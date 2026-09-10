import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, messageOf } from '../lib/api';

export interface PaymentOrder {
  providerOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function usePayments() {
  const queryClient = useQueryClient();

  const createPaymentOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post('/payments/create-order', { orderId });
      return response.data?.data as PaymentOrder;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (input: VerifyPaymentInput) => {
      const response = await api.post('/payments/verify', input);
      return response.data?.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/payments/retry/${orderId}`);
      return response.data?.data as PaymentOrder;
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/payments/cancel/${orderId}`);
      return response.data?.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const createPaymentOrder = useCallback(
    async (orderId: string) => {
      return createPaymentOrderMutation.mutateAsync(orderId);
    },
    [createPaymentOrderMutation],
  );

  const verifyPayment = useCallback(
    async (input: VerifyPaymentInput) => {
      return verifyPaymentMutation.mutateAsync(input);
    },
    [verifyPaymentMutation],
  );

  const retryPayment = useCallback(
    async (orderId: string) => {
      return retryPaymentMutation.mutateAsync(orderId);
    },
    [retryPaymentMutation],
  );

  const cancelPayment = useCallback(
    async (orderId: string) => {
      return cancelPaymentMutation.mutateAsync(orderId);
    },
    [cancelPaymentMutation],
  );

  return {
    createPaymentOrder,
    verifyPayment,
    retryPayment,
    cancelPayment,
    isCreating: createPaymentOrderMutation.isPending,
    isVerifying: verifyPaymentMutation.isPending,
    isRetrying: retryPaymentMutation.isPending,
    isCancelling: cancelPaymentMutation.isPending,
  };
}