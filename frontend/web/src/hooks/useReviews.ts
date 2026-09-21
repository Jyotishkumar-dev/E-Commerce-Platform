import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, messageOf, type ProductReview } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useProductReviews(productId: string | null, options?: { sort?: 'newest' | 'highest_rated' | 'lowest_rated'; page?: number; limit?: number }) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ reviews: ProductReview[]; pagination: any }>({
    queryKey: ['reviews', productId, options?.sort, options?.page, options?.limit],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID required');
      const params = new URLSearchParams();
      if (options?.sort) params.set('sort', options.sort);
      if (options?.page) params.set('page', String(options.page));
      if (options?.limit) params.set('limit', String(options.limit));
      params.set('status', 'PUBLISHED');

      const response = await api.get(`/reviews/products/${productId}/reviews?${params.toString()}`);
      return response.data?.data;
    },
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });

  return { reviews: data?.reviews ?? [], pagination: data?.pagination, isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useReviewSummary(productId: string | null) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }>({
    queryKey: ['review-summary', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID required');
      const response = await api.get(`/reviews/products/${productId}/reviews/summary`);
      return response.data?.data;
    },
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });

  return { summary: data, isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useUserReview(productId: string | null) {
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ review: { id: string; rating: number; title: string | null; body: string } | null }>({
    queryKey: ['user-review', productId],
    queryFn: async () => {
      if (!productId || !user) throw new Error('Product ID and user required');
      const response = await api.get(`/reviews/products/${productId}/reviews/me`);
      return response.data?.data;
    },
    enabled: Boolean(productId && user),
    staleTime: 60 * 1000,
  });

  return { review: data?.review ?? null, isLoading, isError, error: error ? messageOf(error) : null, refetch };
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (input: { productId: string; rating: number; title?: string; body: string; orderId?: string }) => {
      const response = await api.post(`/reviews/products/${input.productId}/reviews`, input);
      return response.data?.data?.review;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      void queryClient.invalidateQueries({ queryKey: ['review-summary', variables.productId] });
      void queryClient.invalidateQueries({ queryKey: ['user-review', variables.productId] });
    },
  });

  return { createReview: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { reviewId: string; rating?: number; title?: string; body?: string }) => {
      const response = await api.patch(`/reviews/${input.reviewId}`, input);
      return response.data?.data?.review;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['review-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['user-review'] });
    },
  });

  return { updateReview: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`/reviews/${reviewId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['review-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['user-review'] });
    },
  });

  return { deleteReview: mutation.mutateAsync, isDeleting: mutation.isPending };
}