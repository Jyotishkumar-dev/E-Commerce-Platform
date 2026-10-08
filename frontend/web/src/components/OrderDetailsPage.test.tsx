import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { OrderDetailsPage } from './OrderDetailsPage';
import { useOrders, useOrder, formatAddress, formatMoney } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import type { Order } from '../lib/api';

vi.mock('../hooks/useOrders');
vi.mock('../hooks/usePayments');
vi.mock('../lib/api', () => ({
  messageOf: vi.fn((e: unknown) => (e instanceof Error ? e.message : 'Error')),
}));

type UseOrderReturn = ReturnType<typeof useOrder>;
type UseOrdersReturn = ReturnType<typeof useOrders>;
type UsePaymentsReturn = ReturnType<typeof usePayments>;

beforeEach(() => {
  vi.mocked(formatAddress).mockReturnValue('123 Test St, Mumbai, Maharashtra 400001, India');
  vi.mocked(formatMoney).mockReturnValue('₹1,500');
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockOrder: Order = {
  id: 'ord_1',
  status: 'CONFIRMED',
  totalCents: 150000,
  subtotalCents: 150000,
  discountCents: 0,
  shippingFeeCents: 0,
  taxCents: 0,
  createdAt: '2024-06-15T10:30:00.000Z',
  shippingAddressSnapshot: {
    id: 'addr_1',
    userId: 'usr_1',
    fullName: 'Test User',
    phone: '+919876543210',
    addressLine1: '123 Test St',
    addressLine2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    isDefault: false,
    createdAt: '2024-06-15T10:30:00.000Z',
    updatedAt: '2024-06-15T10:30:00.000Z',
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
    createdAt: '2024-06-15T10:30:00.000Z',
    updatedAt: '2024-06-15T10:30:00.000Z',
  },
  user: { id: 'usr_1', email: 'test@example.com', name: 'Test User' },
};

describe('OrderDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUseOrder = (order: Order | null, isLoading = false, isError = false, error: string | null = null) => {
    vi.mocked(useOrder).mockReturnValue({ order, isLoading, isError, error, refetch: vi.fn() } as UseOrderReturn);
  };

  const mockUseOrders = (orders: Order[], cancelOrder = vi.fn(), isCancelling = false) => {
    vi.mocked(useOrders).mockReturnValue({ orders, cancelOrder, isCancelling, isLoading: false, isError: false, error: null, refetch: vi.fn(), createOrder: vi.fn(), isCreating: false } as UseOrdersReturn);
  };

  const mockUsePayments = (overrides: Partial<UsePaymentsReturn> = {}) => {
    vi.mocked(usePayments).mockReturnValue({
      retryPayment: vi.fn(),
      cancelPayment: vi.fn(),
      refundPayment: vi.fn(),
      isRetrying: false,
      isCancelling: false,
      isRefunding: false,
      createPaymentOrder: vi.fn(),
      verifyPayment: vi.fn(),
      isCreating: false,
      isVerifying: false,
      ...overrides,
    } as UsePaymentsReturn);
  };

  it('renders order details with items', () => {
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Order #ORD_1/)).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,500').length).toBeGreaterThan(0);
  });

  it('shows delivery address', () => {
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
  });

  it('shows order status badge', () => {
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows refund button for paid orders', () => {
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Request Refund' })).toBeInTheDocument();
  });

  it('shows cancel order button for pending orders', () => {
    const pendingOrder: Order = { ...mockOrder, status: 'PENDING', payment: { ...mockOrder.payment, status: 'PENDING' } };
    mockUseOrder(pendingOrder);
    mockUseOrders([pendingOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument();
  });

  it('shows order progress timeline', () => {
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    mockUseOrder(null, true);
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading order details…')).toBeInTheDocument();
  });

  it('shows error state when order not found', () => {
    mockUseOrder(null, false, true, 'Order not found: invalid ID');
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Order not found: invalid ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Orders/ })).toBeInTheDocument();
  });

  it('confirms order cancellation', async () => {
    const cancelOrder = vi.fn().mockResolvedValue(undefined);
    const pendingOrder = { ...mockOrder, status: 'PENDING', payment: { ...mockOrder.payment, status: 'PENDING' } };
    mockUseOrder(pendingOrder);
    mockUseOrders([pendingOrder], cancelOrder);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole('button', { name: 'Cancel Order' });
    fireEvent.click(buttons[0]);
    expect(screen.getByText('This will cancel your order and release the items back to inventory. This action cannot be undone.')).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', { name: 'Cancel Order' });
    fireEvent.click(confirmButtons[1]);
    await waitFor(() => expect(cancelOrder).toHaveBeenCalled());
  });

  it('confirms refund request', async () => {
    const refundPayment = vi.fn().mockResolvedValue(undefined);
    mockUseOrder(mockOrder);
    mockUseOrders([mockOrder]);
    mockUsePayments({ refundPayment });
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    const buttons = screen.getAllByRole('button', { name: 'Request Refund' });
    fireEvent.click(buttons[0]);
    const refundButtons = screen.getAllByRole('button', { name: 'Request Refund' });
    fireEvent.click(refundButtons[1]);
    await waitFor(() => expect(screen.getByText('Refund processed successfully.')).toBeInTheDocument());
    expect(refundPayment).toHaveBeenCalledWith('ord_1');
  });

  it('shows cancel button for PENDING COD orders', () => {
    const pendingOrder = { ...mockOrder, status: 'PENDING', payment: { ...mockOrder.payment, status: 'PENDING', provider: 'COD' } };
    mockUseOrder(pendingOrder);
    mockUseOrders([pendingOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument();
  });

  it('does not show cancel for SHIPPED orders', () => {
    const shippedOrder = { ...mockOrder, status: 'SHIPPED' };
    mockUseOrder(shippedOrder);
    mockUseOrders([shippedOrder]);
    mockUsePayments();
    render(<OrderDetailsPage orderId="ord_1" onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.queryByRole('button', { name: 'Cancel Order' })).not.toBeInTheDocument();
  });
});
