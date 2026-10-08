import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { OrderHistoryPage } from './OrderHistoryPage';
import { useOrders, formatMoney, formatOrderStatus, getOrderStatusColor } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import type { Order } from '../lib/api';

vi.mock('../hooks/useOrders');
vi.mock('../hooks/usePayments');
vi.mock('../lib/api', () => ({
  messageOf: vi.fn((e: unknown) => (e instanceof Error ? e.message : 'Error')),
}));

type UseOrdersReturn = ReturnType<typeof useOrders>;
type UsePaymentsReturn = ReturnType<typeof usePayments>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockOrders: Order[] = [
  {
    id: 'ord_1',
    status: 'DELIVERED',
    totalCents: 150000,
    subtotalCents: 150000,
    discountCents: 0,
    shippingFeeCents: 0,
    taxCents: 0,
    createdAt: '2024-06-15T00:00:00.000Z',
    items: [{ id: 'item_1', productTitle: 'Test Product', quantity: 1, unitPriceCents: 150000, subtotalCents: 150000 }],
    payment: { id: 'pay_1', provider: 'COD', status: 'SUCCESS', amountCents: 150000, currency: 'INR', providerOrderId: null, providerPaymentId: null, createdAt: '2024-06-15T00:00:00.000Z', updatedAt: '2024-06-15T00:00:00.000Z' },
  },
  {
    id: 'ord_2',
    status: 'PENDING',
    totalCents: 250000,
    subtotalCents: 250000,
    discountCents: 0,
    shippingFeeCents: 0,
    taxCents: 0,
    createdAt: '2024-06-14T00:00:00.000Z',
    items: [
      { id: 'item_2', productTitle: 'Product A', quantity: 1, unitPriceCents: 100000, subtotalCents: 100000 },
      { id: 'item_3', productTitle: 'Product B', quantity: 3, unitPriceCents: 50000, subtotalCents: 150000 },
    ],
    payment: { id: 'pay_2', provider: 'RAZORPAY', status: 'PENDING', amountCents: 250000, currency: 'INR', providerOrderId: null, providerPaymentId: null, createdAt: '2024-06-14T00:00:00.000Z', updatedAt: '2024-06-14T00:00:00.000Z' },
  },
];

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrders(mockOrders);
    mockUsePayments();
    vi.mocked(formatMoney).mockImplementation((cents: number | null | undefined) => `₹${((cents ?? 0) / 100).toLocaleString('en-IN')}`);
    vi.mocked(formatOrderStatus).mockImplementation((status: string) => status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '));
    vi.mocked(getOrderStatusColor).mockImplementation((status: string) => `status-${status.toLowerCase()}`);
  });

  const mockUseOrders = (orders: Order[], cancelOrder = vi.fn(), isCancelling = false, overrides: Partial<UseOrdersReturn> = {}) => {
    vi.mocked(useOrders).mockReturnValue({
      orders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder,
      isCancelling,
      createOrder: vi.fn(),
      isCreating: false,
      ...overrides,
    } as UseOrdersReturn);
  };

  const mockUsePayments = (overrides: Partial<UsePaymentsReturn> = {}) => {
    vi.mocked(usePayments).mockReturnValue({
      refundPayment: vi.fn(),
      isRefunding: false,
      createPaymentOrder: vi.fn(),
      verifyPayment: vi.fn(),
      retryPayment: vi.fn(),
      cancelPayment: vi.fn(),
      isCreating: false,
      isVerifying: false,
      isRetrying: false,
      isCancelling: false,
      ...overrides,
    } as UsePaymentsReturn);
  };

  it('renders order history table with all orders', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('My Orders')).toBeInTheDocument();
    expect(screen.getByText(/#ORD_1/)).toBeInTheDocument();
    expect(screen.getByText(/#ORD_2/)).toBeInTheDocument();
  });

  it('shows order totals and item counts', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
    expect(screen.getByText('₹2,500')).toBeInTheDocument();
  });

  it('shows payment status badges', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('shows order status badges', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('shows cancel button for eligible orders (PENDING COD)', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not show cancel button for delivered orders', () => {
    mockUseOrders([mockOrders[0]]);
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows refund button for paid orders', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument();
  });

  it('calls cancelOrder when cancel confirmed', async () => {
    const cancelOrder = vi.fn().mockResolvedValue(undefined);
    mockUseOrders(mockOrders, cancelOrder);
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Are you sure you want to cancel this order?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    expect(cancelOrder).toHaveBeenCalledWith('ord_2');
  });

  it('calls refundPayment when refund confirmed', async () => {
    const refundPayment = vi.fn().mockResolvedValue(undefined);
    mockUsePayments({ refundPayment });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Refund' }));
    expect(refundPayment).toHaveBeenCalledWith('ord_1');
  });

  it('shows loading state initially', () => {
    mockUseOrders([], vi.fn(), false, { isLoading: true });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading orders…')).toBeInTheDocument();
  });

  it('shows empty state when no orders', () => {
    mockUseOrders([]);
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    mockUseOrders([], vi.fn(), false, { isError: true, error: 'CONNECTION_TIMEOUT' });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getAllByText(/CONNECTION_TIMEOUT/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0);
  });

  it('shows dismiss for cancel/refund errors', async () => {
    const cancelOrder = vi.fn().mockRejectedValue(new Error('Cannot cancel'));
    mockUseOrders(mockOrders, cancelOrder);
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    await waitFor(() => expect(screen.getByText('Cannot cancel')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(cancelOrder).toHaveBeenCalledWith('ord_2');
  });
});
