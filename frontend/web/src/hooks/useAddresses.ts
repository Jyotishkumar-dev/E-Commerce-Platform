import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type Address, messageOf } from '../lib/api';

export function useAddresses() {
  const queryClient = useQueryClient();

  const {
    data: addresses = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await api.get('/addresses');
      return response.data?.data?.addresses ?? [];
    },
    staleTime: 60 * 1000,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (input: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/addresses', input);
      return response.data?.data?.address;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ addressId, input }: { addressId: string; input: Partial<Address> }) => {
      const response = await api.patch(`/addresses/${addressId}`, input);
      return response.data?.data?.address;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await api.delete(`/addresses/${addressId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const response = await api.patch(`/addresses/${addressId}/default`);
      return response.data?.data?.address;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const createAddress = useCallback(
    async (input: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      return createAddressMutation.mutateAsync(input);
    },
    [createAddressMutation],
  );

  const updateAddress = useCallback(
    async (addressId: string, input: Partial<Address>) => {
      return updateAddressMutation.mutateAsync({ addressId, input });
    },
    [updateAddressMutation],
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      return deleteAddressMutation.mutateAsync(addressId);
    },
    [deleteAddressMutation],
  );

  const setDefaultAddress = useCallback(
    async (addressId: string) => {
      return setDefaultAddressMutation.mutateAsync(addressId);
    },
    [setDefaultAddressMutation],
  );

  return {
    addresses,
    isLoading,
    isError,
    error: error ? messageOf(error) : null,
    refetch,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
    isSettingDefault: setDefaultAddressMutation.isPending,
  };
}

export function useDefaultAddress() {
  const { addresses } = useAddresses();
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}