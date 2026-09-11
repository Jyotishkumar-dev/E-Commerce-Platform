import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type Order, type Product, type Category, type User, type Coupon, messageOf } from '../lib/api';
import { formatMoney } from './useOrders';

export interface AdminDashboardMetrics {
  users: number;
  products: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  orders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueCents: number;
  revenuePaidCents: number;
  averageOrderValueCents: number;
  recentOrders: Array<{
    id: string;
    createdAt: string;
    status: string;
    totalCents: number;
    user: { id: string; email: string; name: string | null };
  }>;
  lowStockItems: Array<{
    id: string;
    title: string;
    sku: string | null;
    stock: number;
    category: string;
  }>;
}

export function useAdminDashboard() {
  const {
    data: metrics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminDashboardMetrics>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data?.data;
    },
    staleTime: 30 * 1000,
  });

  return {
    metrics,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
  };
}

export function useAdminOrders(filters?: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
      if (filters?.paymentProvider) params.set('paymentProvider', filters.paymentProvider);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get(`/admin/orders?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await api.patch(`/admin/orders/${orderId}/status`, { status });
      return response.data?.data?.order;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const updateOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      return updateStatusMutation.mutateAsync({ orderId, status });
    },
    [updateStatusMutation],
  );

  return {
    orders: data?.orders ?? [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    updateOrderStatus,
    isUpdating: updateStatusMutation.isPending,
  };
}

export function useAdminOrderDetails(orderId: string | null) {
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID required');
      const response = await api.get(`/admin/orders/${orderId}`);
      return response.data?.data?.order;
    },
    enabled: Boolean(orderId),
    staleTime: 30 * 1000,
  });

  return {
    order,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
  };
}

export function useAdminProducts(filters?: {
  search?: string;
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
      if (filters?.lowStock) params.set('lowStock', 'true');
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get(`/admin/products?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return {
    products: data?.products ?? [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
  };
}

export function useAdminCategories() {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories');
      return response.data?.data?.categories ?? [];
    },
    staleTime: 60 * 1000,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, input }: { categoryId: string; input: Partial<Category> }) => {
      const response = await api.patch(`/admin/categories/${categoryId}`, input);
      return response.data?.data?.category;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await api.delete(`/admin/categories/${categoryId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });

  const updateCategory = useCallback(
    async (categoryId: string, input: Partial<Category>) => {
      return updateCategoryMutation.mutateAsync({ categoryId, input });
    },
    [updateCategoryMutation],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      return deleteCategoryMutation.mutateAsync(categoryId);
    },
    [deleteCategoryMutation],
  );

  return {
    categories,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    updateCategory,
    deleteCategory,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}

export function useAdminCustomers(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'customers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get(`/admin/customers?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return {
    customers: data?.customers ?? [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
  };
}

export function useAdminCoupons(filters?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'coupons', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get(`/admin/coupons?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createCouponMutation = useMutation({
    mutationFn: async (input: {
      code: string;
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      minimumOrderValueCents?: number;
      maximumDiscountCents?: number;
      usageLimit?: number;
      startsAt?: string;
      expiresAt?: string;
      description?: string;
    }) => {
      const response = await api.post('/admin/coupons', input);
      return response.data?.data?.coupon;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async ({ couponId, input }: { couponId: string; input: Partial<Coupon> }) => {
      const response = await api.patch(`/admin/coupons/${couponId}`, input);
      return response.data?.data?.coupon;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ couponId, isActive }: { couponId: string; isActive: boolean }) => {
      const response = await api.patch(`/admin/coupons/${couponId}/active`, { isActive });
      return response.data?.data?.coupon;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
  });

  const createCoupon = useCallback(
    async (input: {
      code: string;
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      minimumOrderValueCents?: number;
      maximumDiscountCents?: number;
      usageLimit?: number;
      startsAt?: string;
      expiresAt?: string;
      description?: string;
    }) => {
      return createCouponMutation.mutateAsync(input);
    },
    [createCouponMutation],
  );

  const updateCoupon = useCallback(
    async (couponId: string, input: Partial<Coupon>) => {
      return updateCouponMutation.mutateAsync({ couponId, input });
    },
    [updateCouponMutation],
  );

  const toggleActive = useCallback(
    async (couponId: string, isActive: boolean) => {
      return toggleActiveMutation.mutateAsync({ couponId, isActive });
    },
    [toggleActiveMutation],
  );

  return {
    coupons: data?.coupons ?? [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    createCoupon,
    updateCoupon,
    toggleActive,
    isCreating: createCouponMutation.isPending,
    isUpdating: updateCouponMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
  };
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

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'status-pending';
    case 'SUCCESS':
      return 'status-paid';
    case 'FAILED':
      return 'status-failed';
    case 'REFUNDED':
      return 'status-refunded';
    default:
      return '';
  }
}

export function formatOrderStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function formatPaymentStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export { formatMoney };