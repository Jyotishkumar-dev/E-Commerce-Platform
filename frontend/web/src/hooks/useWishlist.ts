import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api, messageOf, type WishlistItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await api.get('/wishlist');
      return response.data?.data?.items ?? [];
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
  });

  const wishlistIds = useMemo(() => {
    return new Set(items.map((item) => item.product.id || item.productId));
  }, [items]);

  const toggleWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (wishlistIds.has(productId)) {
        await api.delete(`/wishlist/${productId}`);
        return { action: 'removed', productId };
      } else {
        await api.post('/wishlist/items', { productId });
        return { action: 'added', productId };
      }
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      const previousItems = queryClient.getQueryData<WishlistItem[]>(['wishlist']) ?? [];
      const isCurrentlyWishlisted = previousItems.some(
        (i) => i.product.id === productId || i.productId === productId,
      );

      let nextItems: WishlistItem[];
      if (isCurrentlyWishlisted) {
        nextItems = previousItems.filter(
          (i) => i.product.id !== productId && i.productId !== productId,
        );
      } else {
        // Optimistically add dummy item; real item will be synced on invalidation
        nextItems = [
          {
            id: `temp_${productId}`,
            productId,
            product: { id: productId } as any,
          },
          ...previousItems,
        ];
      }

      queryClient.setQueryData(['wishlist'], nextItems);
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['wishlist'], context.previousItems);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.post('/wishlist/items', { productId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/wishlist/${productId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const moveToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.post(`/wishlist/${productId}/move-to-cart`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const toggleWishlist = useCallback(
    async (productId: string) => {
      return toggleWishlistMutation.mutateAsync(productId);
    },
    [toggleWishlistMutation],
  );

  const addToWishlist = useCallback(
    async (productId: string) => {
      return addToWishlistMutation.mutateAsync(productId);
    },
    [addToWishlistMutation],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      return removeFromWishlistMutation.mutateAsync(productId);
    },
    [removeFromWishlistMutation],
  );

  const moveToCart = useCallback(
    async (productId: string) => {
      return moveToCartMutation.mutateAsync(productId);
    },
    [moveToCartMutation],
  );

  const isWishlisted = useCallback(
    (productId: string) => {
      return wishlistIds.has(productId);
    },
    [wishlistIds],
  );

  return {
    items: user ? items : [],
    wishlistIds: user ? wishlistIds : new Set<string>(),
    wishlistCount: user ? items.length : 0,
    isLoading: user ? isLoading : false,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    moveToCart,
    isWishlisted,
    isToggling: toggleWishlistMutation.isPending,
    isMovingToCart: moveToCartMutation.isPending,
  };
}
