import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { OrderDetailsPage } from './OrderDetailsPage';
import { useOrders, useOrder } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';

vi.mock('../hooks/useOrders');
vi.mock('../hooks/usePayments');
vi.mock('../lib/api', () => ({
  messageOf: vi.fn((e: any) => (e instanceof Error ? e.message : 'Error')),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockOrder = {
  id: 'ord_1',
  status: 'CONFIRMED',
  totalCents: 150000,
  subtotalCents: 150000,
  discountCents: 0,
  shippingFeeCents: 0,
  taxCents: 0,
  createdAt: new Date('2024-06-15T10:30:00'),
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
      productSkuSnapshot: 'SKU-001',
      unitPriceCents: 150000,
      quantity: 1,
      subtotalCents: 150000,
      product: { id: 'prod_1', slug: 'test-product', imageUrl: null, category: 'Electronics' },
    },
  ],
  payment: {
    id: 'pay_1',
    provider: 'COD',
    providerOrderId: null,
    providerPaymentId: null,
    amountCents: 150000,
    currency: 'INR',
    status: 'SUCCESS',
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
  },
};

describe('OrderDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order details with items', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Order #ORD_1/)).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument();
  });

  it('shows delivery address', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
  });

  it('shows order status badge', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows refund button for paid orders', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Request Refund' })).toBeInTheDocument();
  });

  it('shows cancel order button for non-shipped non-delivered orders', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument();
  });

  it('shows order progress timeline', () => {
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(useOrder).mockReturnValue({ order: null, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading order details…')).toBeInTheDocument();
  });

  it('shows error state when order not found', () => {
    vi.mocked(useOrder).mockReturnValue({ order: null, isLoading: false, isError: true, error: 'Order not found', refetch: vi.fn() } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Order not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Orders/ })).toBeInTheDocument();
  });

  it('confirms order cancellation', async () => {
    const cancelOrder = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder, isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    expect(screen.getByText('This will cancel your order and release the items back to inventory.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    expect(cancelOrder).toHaveBeenCalledWith('ord_1');
  });

  it('confirms refund request', async () => {
    const refundPayment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useOrder).mockReturnValue({ order: mockOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [mockOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment, isRefunding: false, isCancelling: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Request Refund' }));
    expect(screen.getByText(/Refund processed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request Refund' }));
    expect(refundPayment).toHaveBeenCalledWith('ord_1');
  });

  it('shows cancel button for PENDING COD orders', () => {
    const pendingOrder = { ...mockOrder, status: 'PENDING', payment: { ...mockOrder.payment, status: 'PENDING', provider: 'COD' } };
    vi.mocked(useOrder).mockReturnValue({ order: pendingOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [pendingOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument();
  });

  it('does not show cancel for SHIPPED orders', () => {
    const shippedOrder = { ...mockOrder, status: 'SHIPPED' };
    vi.mocked(useOrder).mockReturnValue({ order: shippedOrder, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(useOrders).mockReturnValue({ orders: [shippedOrder], cancelOrder: vi.fn(), isCancelling: false } as any);
    vi.mocked(usePayments).mockReturnValue({ retryPayment: vi.fn(), cancelPayment: vi.fn(), refundPayment: vi.fn(), isRetrying: false, isCancelling: false, isRefunding: false } as any);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.queryByRole('button', { name: 'Cancel Order' })).not.toBeInTheDocument();
  });
});
