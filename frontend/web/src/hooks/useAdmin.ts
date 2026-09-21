import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type Order, type Product, type Category, type User, type Coupon, messageOf } from '../lib/api';
import { formatMoney } from './useOrders';

export interface AnalyticsData {
  revenueTrend: Array<{ date: string; revenueCents: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  topProducts: Array<{ productTitle: string; unitsSold: number; revenueCents: number }>;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface InventoryItem {
  id: string;
  title: string;
  sku: string | null;
  stock: number;
  category: string;
  categoryRef: { id: string; name: string } | null;
  isActive: boolean;
  lowStock: boolean;
  outOfStock: boolean;
}

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

export function useAdminProductCreate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: {
      title: string;
      priceCents: number;
      stock: number;
      description?: string;
      category?: string;
      sku?: string;
      brand?: string;
      imageUrl?: string;
    }) => {
      const response = await api.post('/admin/products', input);
      return response.data?.data?.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  return { createProduct: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useAdminProductUpdate(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: Partial<Product>) => {
      const response = await api.patch(`/admin/products/${productId}`, input);
      return response.data?.data?.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const updateProduct = useCallback(
    async (input: Partial<Product>) => {
      if (!productId) throw new Error('Product ID required');
      return mutation.mutateAsync(input);
    },
    [mutation, productId],
  );

  return { updateProduct, isUpdating: mutation.isPending };
}

export function useAdminProductStock() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ productId, stock }: { productId: string; stock: number }) => {
      const response = await api.patch(`/admin/products/${productId}/stock`, { stock });
      return response.data?.data?.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  return { updateStock: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useAdminAnalytics(filters?: { period?: string; dateFrom?: string; dateTo?: string }) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.period) params.set('period', filters.period);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      const response = await api.get(`/admin/analytics?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading, isError, error, refetch };
}

export function useAdminInventory() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<InventoryItem[]>({
    queryKey: ['admin', 'inventory'],
    queryFn: async () => {
      const response = await api.get('/admin/inventory');
      return response.data?.data?.inventory ?? [];
    },
    staleTime: 30 * 1000,
  });

  return { inventory: data ?? [], isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useCouponValidate() {
  const mutation = useMutation({
    mutationFn: async (input: { code: string; minimumOrderValueCents?: number }) => {
      const response = await api.post('/admin/coupons/validate', input);
      return response.data?.data;
    },
  });

  return { validateCoupon: mutation.mutateAsync, isValidating: mutation.isPending };
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useAdminProductImages(productId: string | null) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductImage[]>({
    queryKey: ['admin', 'products', productId, 'images'],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID required');
      const response = await api.get(`/admin/products/${productId}/images`);
      return response.data?.data?.images ?? [];
    },
    enabled: Boolean(productId),
    staleTime: 30 * 1000,
  });

  return { images: data ?? [], isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useAdminUploadProductImage(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!productId) throw new Error('Product ID required');
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const response = await api.post(`/admin/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data?.data?.images ?? [];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  return { uploadImages: mutation.mutateAsync, isUploading: mutation.isPending };
}

export function useAdminSetPrimaryImage(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!productId) throw new Error('Product ID required');
      const response = await api.patch(`/admin/products/${productId}/images/${imageId}/primary`, { imageId });
      return response.data?.data?.image;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
    },
  });

  return { setPrimaryImage: mutation.mutateAsync, isSettingPrimary: mutation.isPending };
}

export function useAdminReorderImages(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      if (!productId) throw new Error('Product ID required');
      const response = await api.patch(`/admin/products/${productId}/images/reorder`, { imageIds });
      return response.data?.data?.images ?? [];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
    },
  });

  return { reorderImages: mutation.mutateAsync, isReordering: mutation.isPending };
}

export function useAdminUpdateImage(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ imageId, input }: { imageId: string; input: { altText?: string; sortOrder?: number } }) => {
      if (!productId) throw new Error('Product ID required');
      const response = await api.patch(`/admin/products/${productId}/images/${imageId}`, input);
      return response.data?.data?.image;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
    },
  });

  return { updateImage: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useAdminDeleteImage(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!productId) throw new Error('Product ID required');
      await api.delete(`/admin/products/${productId}/images/${imageId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
    },
  });

  return { deleteImage: mutation.mutateAsync, isDeleting: mutation.isPending };
}

export function useAdminReplaceImage(productId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ imageId, file }: { imageId: string; file: File }) => {
      if (!productId) throw new Error('Product ID required');
      const formData = new FormData();
      formData.append('images', file);
      const response = await api.patch(`/admin/products/${productId}/images/${imageId}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data?.data?.image;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId, 'images'] });
    },
  });

  return { replaceImage: mutation.mutateAsync, isReplacing: mutation.isPending };
}

export interface AdminReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  status: 'PUBLISHED' | 'PENDING' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
  product: { id: string; title: string; slug: string };
}

export function useAdminReviews(filters?: {
  search?: string;
  rating?: number;
  status?: 'PUBLISHED' | 'PENDING' | 'HIDDEN';
  productId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ reviews: AdminReview[]; pagination: any }>({
    queryKey: ['admin', 'reviews', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.rating) params.set('rating', String(filters.rating));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.productId) params.set('productId', filters.productId);
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get(`/admin/reviews?${params.toString()}`);
      return response.data?.data;
    },
    staleTime: 30 * 1000,
  });

  return { reviews: data?.reviews ?? [], pagination: data?.pagination, isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useAdminModerateReview() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: 'PUBLISHED' | 'PENDING' | 'HIDDEN' }) => {
      const response = await api.patch(`/admin/reviews/${reviewId}/moderate`, { status });
      return response.data?.data?.review;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  return { moderateReview: mutation.mutateAsync, isModerating: mutation.isPending };
}