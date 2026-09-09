import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import { useOrders, useOrder } from '../hooks/useOrders';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  messageOf: vi.fn((e) => (e instanceof Error ? e.message : 'Error')),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAddresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches addresses on mount', async () => {
    const mockAddresses = [
      {
        id: 'addr_1',
        userId: 'usr_1',
        fullName: 'Test User',
        phone: '+919876543210',
        addressLine1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: { addresses: mockAddresses } },
    });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.addresses).toEqual(mockAddresses);
    expect(api.get).toHaveBeenCalledWith('/addresses');
  });

  it('creates address and invalidates cache', async () => {
    const newAddress = {
      id: 'addr_2',
      userId: 'usr_1',
      fullName: 'New User',
      phone: '+919876543211',
      addressLine1: '456 New St',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      isDefault: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: { address: newAddress } },
    });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.createAddress({
      fullName: 'New User',
      phone: '+919876543211',
      addressLine1: '456 New St',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      isDefault: false,
    });

    expect(api.post).toHaveBeenCalledWith('/addresses', expect.objectContaining({
      fullName: 'New User',
    }));
  });

  it('updates address', async () => {
    const updatedAddress = {
      id: 'addr_1',
      userId: 'usr_1',
      city: 'Bangalore',
    };

    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { data: { address: updatedAddress } },
    });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.updateAddress('addr_1', { city: 'Bangalore' });

    expect(api.patch).toHaveBeenCalledWith('/addresses/addr_1', { city: 'Bangalore' });
  });

  it('deletes address', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { message: 'Deleted' } });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.deleteAddress('addr_1');

    expect(api.delete).toHaveBeenCalledWith('/addresses/addr_1');
  });

  it('sets default address', async () => {
    const updatedAddress = {
      id: 'addr_1',
      userId: 'usr_1',
      isDefault: true,
    };

    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { data: { address: updatedAddress } },
    });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.setDefaultAddress('addr_1');

    expect(api.patch).toHaveBeenCalledWith('/addresses/addr_1/default');
  });
});

describe('useOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches orders on mount', async () => {
    const mockOrders = [
      {
        id: 'ord_1',
        status: 'CONFIRMED',
        totalCents: 100000,
        createdAt: '2024-01-01T00:00:00.000Z',
        items: [],
      },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: { orders: mockOrders } },
    });

    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orders).toEqual(mockOrders);
    expect(api.get).toHaveBeenCalledWith('/orders');
  });

  it('creates order with shipping address', async () => {
    const mockOrder = {
      id: 'ord_2',
      status: 'CONFIRMED',
      totalCents: 200000,
      createdAt: '2024-01-02T00:00:00.000Z',
      items: [],
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: { order: mockOrder } },
    });

    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const order = await result.current.createOrder({ shippingAddressId: 'addr_1' });

    expect(api.post).toHaveBeenCalledWith('/orders', { shippingAddressId: 'addr_1' });
    expect(order).toEqual(mockOrder);
  });
});

describe('useOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches single order by id', async () => {
    const mockOrder = {
      id: 'ord_1',
      status: 'CONFIRMED',
      totalCents: 100000,
      createdAt: '2024-01-01T00:00:00.000Z',
      subtotalCents: 100000,
      discountCents: 0,
      shippingFeeCents: 0,
      taxCents: 0,
      shippingAddressSnapshot: {
        fullName: 'Test User',
        phone: '+919876543210',
        addressLine1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      items: [
        {
          id: 'item_1',
          productTitle: 'Test Product',
          unitPriceCents: 100000,
          quantity: 1,
          subtotalCents: 100000,
          productSkuSnapshot: 'SKU-001',
        },
      ],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: { order: mockOrder } },
    });

    const { result } = renderHook(() => useOrder('ord_1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.order).toEqual(mockOrder);
    expect(api.get).toHaveBeenCalledWith('/orders/ord_1');
  });

  it('does not fetch when orderId is null', async () => {
    const { result } = renderHook(() => useOrder(null), { wrapper: createWrapper() });

    expect(result.current.order).toBeUndefined();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('formatMoney', () => {
  let formatMoney: (cents: number | undefined | null) => string;

  beforeAll(async () => {
    const mod = await import('../hooks/useOrders');
    formatMoney = mod.formatMoney;
  });

  it('formats cents to INR currency', () => {
    expect(formatMoney(100000)).toBe('₹1,000');
    expect(formatMoney(123456)).toBe('₹1,235');
    expect(formatMoney(0)).toBe('₹0');
  });

  it('handles undefined/null', () => {
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(null)).toBe('—');
  });
});

describe('formatAddress', () => {
  let formatAddress: (address: any) => string;

  beforeAll(async () => {
    const mod = await import('../hooks/useOrders');
    formatAddress = mod.formatAddress;
  });

  it('formats address parts correctly', () => {
    const address = {
      fullName: 'Test User',
      phone: '+919876543210',
      addressLine1: '123 Test St',
      addressLine2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };
    const formatted = formatAddress(address);
    expect(formatted).toContain('Test User');
    expect(formatted).toContain('+919876543210');
    expect(formatted).toContain('123 Test St');
    expect(formatted).toContain('Apt 4B');
    expect(formatted).toContain('Mumbai, Maharashtra 400001');
    expect(formatted).toContain('India');
  });

  it('handles missing optional fields', () => {
    const address = {
      fullName: 'Test User',
      phone: '+919876543210',
      addressLine1: '123 Test St',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };
    const formatted = formatAddress(address);
    expect(formatted).not.toContain('undefined');
  });

  it('returns fallback for null address', () => {
    expect(formatAddress(null)).toBe('No address available');
    expect(formatAddress(undefined)).toBe('No address available');
  });
});