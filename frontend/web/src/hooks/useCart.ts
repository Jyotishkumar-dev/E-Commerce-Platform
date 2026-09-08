import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type Cart, type CartItem, messageOf } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const emptyCart: Cart = {
    items: [],
    itemCount: 0,
    subtotalCents: 0,
    hasUnavailableItems: false,
  };

  const {
    data: cart = emptyCart,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get('/cart');
      return response.data?.data?.cart ?? emptyCart;
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      const response = await api.post('/cart/items', { productId, quantity });
      return response.data?.data?.cart;
    },
    onSuccess: (updatedCart) => {
      if (updatedCart) {
        queryClient.setQueryData(['cart'], updatedCart);
      } else {
        void queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await api.patch(`/cart/items/${productId}`, { quantity });
      return response.data?.data?.cart;
    },
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      if (previousCart) {
        let nextItems: CartItem[];
        if (quantity <= 0) {
          nextItems = previousCart.items.filter((item) => item.product.id !== productId && item.id !== productId);
        } else {
          nextItems = previousCart.items.map((item) => {
            if (item.product.id === productId || item.id === productId) {
              return {
                ...item,
                quantity,
                lineTotalCents: item.product.priceCents * quantity,
              };
            }
            return item;
          });
        }

        const nextSubtotal = nextItems
          .filter((i) => i.isAvailable !== false)
          .reduce((sum, i) => sum + (i.product.priceCents * i.quantity), 0);

        queryClient.setQueryData<Cart>(['cart'], {
          ...previousCart,
          items: nextItems,
          itemCount: nextItems.reduce((sum, i) => sum + i.quantity, 0),
          subtotalCents: nextSubtotal,
        });
      }

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.delete(`/cart/items/${productId}`);
      return response.data?.data?.cart;
    },
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      if (previousCart) {
        const nextItems = previousCart.items.filter(
          (item) => item.product.id !== productId && item.id !== productId,
        );
        const nextSubtotal = nextItems
          .filter((i) => i.isAvailable !== false)
          .reduce((sum, i) => sum + (i.product.priceCents * i.quantity), 0);

        queryClient.setQueryData<Cart>(['cart'], {
          ...previousCart,
          items: nextItems,
          itemCount: nextItems.reduce((sum, i) => sum + i.quantity, 0),
          subtotalCents: nextSubtotal,
        });
      }

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const moveToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.post(`/cart/items/${productId}/move-to-wishlist`);
      return response.data?.data?.cart;
    },
    onSuccess: (updatedCart) => {
      if (updatedCart) {
        queryClient.setQueryData(['cart'], updatedCart);
      }
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/cart');
      return response.data?.data?.cart;
    },
    onSuccess: () => {
      queryClient.setQueryData(['cart'], emptyCart);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      return addItemMutation.mutateAsync({ productId, quantity });
    },
    [addItemMutation],
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      return updateQuantityMutation.mutateAsync({ productId, quantity });
    },
    [updateQuantityMutation],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      return removeItemMutation.mutateAsync(productId);
    },
    [removeItemMutation],
  );

  const moveToWishlist = useCallback(
    async (productId: string) => {
      return moveToWishlistMutation.mutateAsync(productId);
    },
    [moveToWishlistMutation],
  );

  const clearCart = useCallback(async () => {
    return clearCartMutation.mutateAsync();
  }, [clearCartMutation]);

  return {
    cart: user ? cart : emptyCart,
    items: user ? cart.items : [],
    itemCount: user ? cart.itemCount : 0,
    subtotalCents: user ? cart.subtotalCents : 0,
    hasUnavailableItems: user ? Boolean(cart.hasUnavailableItems) : false,
    isLoading: user ? isLoading : false,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    addItem,
    updateQuantity,
    removeItem,
    moveToWishlist,
    clearCart,
    isAdding: addItemMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeItemMutation.isPending,
    isMovingToWishlist: moveToWishlistMutation.isPending,
  };
}
