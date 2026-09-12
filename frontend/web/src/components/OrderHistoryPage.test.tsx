import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { OrderHistoryPage } from './OrderHistoryPage';
import { useOrders } from '../hooks/useOrders';
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

const mockOrders = [
  {
    id: 'ord_1',
    status: 'DELIVERED',
    totalCents: 150000,
    subtotalCents: 150000,
    discountCents: 0,
    shippingFeeCents: 0,
    taxCents: 0,
    createdAt: new Date('2024-06-15'),
    items: [{ id: 'item_1', productTitle: 'Test Product', quantity: 1, unitPriceCents: 150000, subtotalCents: 150000 }],
    payment: { id: 'pay_1', provider: 'COD', status: 'SUCCESS', amountCents: 150000 },
  },
  {
    id: 'ord_2',
    status: 'PENDING',
    totalCents: 250000,
    subtotalCents: 250000,
    discountCents: 0,
    shippingFeeCents: 0,
    taxCents: 0,
    createdAt: new Date('2024-06-14'),
    items: [
      { id: 'item_2', productTitle: 'Product A', quantity: 1, unitPriceCents: 100000, subtotalCents: 100000 },
      { id: 'item_3', productTitle: 'Product B', quantity: 3, unitPriceCents: 50000, subtotalCents: 150000 },
    ],
    payment: { id: 'pay_2', provider: 'RAZORPAY', status: 'PENDING', amountCents: 250000 },
  },
];

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOrders as any).mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    (usePayments as any).mockReturnValue({
      refundPayment: vi.fn(),
      isRefunding: false,
    });
  });

  it('renders order history table with all orders', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('My Orders')).toBeInTheDocument();
    expect(screen.getByText(/#ORD_1/)).toBeInTheDocument();
    expect(screen.getByText(/#ORD_2/)).toBeInTheDocument();
  });

  it('shows order totals and item counts', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument();
    expect(screen.getByText('₹2,50,000')).toBeInTheDocument();
  });

  it('shows payment status badges', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows order status badges', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows cancel button for eligible orders (PENDING COD)', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not show cancel button for delivered orders', () => {
    (useOrders as any).mockReturnValue({
      orders: [mockOrders[0]],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows refund button for paid orders', () => {
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument();
  });

  it('calls cancelOrder when cancel confirmed', async () => {
    const cancelOrder = vi.fn().mockResolvedValue(undefined);
    (useOrders as any).mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder,
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Are you sure you want to cancel this order?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    expect(cancelOrder).toHaveBeenCalledWith('ord_1');
  });

  it('calls refundPayment when refund confirmed', async () => {
    const refundPayment = vi.fn().mockResolvedValue(undefined);
    (usePayments as any).mockReturnValue({ refundPayment, isRefunding: false });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Refund' }));
    expect(refundPayment).toHaveBeenCalledWith('ord_1');
  });

  it('shows loading state initially', () => {
    (useOrders as any).mockReturnValue({
      orders: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading orders…')).toBeInTheDocument();
  });

  it('shows empty state when no orders', () => {
    (useOrders as any).mockReturnValue({
      orders: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    (useOrders as any).mockReturnValue({
      orders: [],
      isLoading: false,
      isError: true,
      error: 'Failed to load orders',
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Failed to load orders/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('dismisses error messages', () => {
    (useOrders as any).mockReturnValue({
      orders: [],
      isLoading: false,
      isError: true,
      error: 'Failed',
      refetch: vi.fn(),
      cancelOrder: vi.fn(),
      isCancelling: false,
    });
    render(<OrderHistoryPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  });
});
