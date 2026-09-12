import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type Order, type Address, messageOf } from '../lib/api';

export function useOrders() {
  const queryClient = useQueryClient();

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data?.data?.orders ?? [];
    },
    staleTime: 60 * 1000,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (input?: { shippingAddressId?: string; couponCode?: string; paymentMethod?: 'RAZORPAY' | 'COD' }) => {
      const response = await api.post('/orders', input);
      return response.data?.data?.order;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const createOrder = useCallback(
    async (input?: { shippingAddressId?: string; couponCode?: string; paymentMethod?: 'RAZORPAY' | 'COD' }) => {
      return createOrderMutation.mutateAsync(input);
    },
    [createOrderMutation],
  );

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/orders/${orderId}/cancel`);
      return response.data?.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const cancelOrder = useCallback(
    async (orderId: string) => {
      return cancelOrderMutation.mutateAsync(orderId);
    },
    [cancelOrderMutation],
  );

  return {
    orders,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    createOrder,
    cancelOrder,
    isCreating: createOrderMutation.isPending,
    isCancelling: cancelOrderMutation.isPending,
  };
}

export function useOrder(orderId: string | null) {
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Order>({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const response = await api.get(`/orders/${orderId}`);
      return response.data?.data?.order;
    },
    enabled: Boolean(orderId),
    staleTime: 60 * 1000,
  });

  return {
    order,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
  };
}

export function formatMoney(cents: number | undefined | null, currency = 'INR') {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'status-pending';
    case 'CONFIRMED':
      return 'status-confirmed';
    case 'PROCESSING':
      return 'status-processing';
    case 'SHIPPED':
      return 'status-shipped';
    case 'DELIVERED':
      return 'status-delivered';
    case 'CANCELLED':
      return 'status-cancelled';
    default:
      return '';
  }
}

export function formatAddress(address: Address | null | undefined): string {
  if (!address) return 'No address available';
  const parts = [
    address.fullName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
}

export function formatOrderStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}