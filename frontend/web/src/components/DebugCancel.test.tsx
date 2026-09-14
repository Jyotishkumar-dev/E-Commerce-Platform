import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { OrderHistoryPage } from './src/components/OrderHistoryPage';
import { useOrders, formatMoney, formatOrderStatus, getOrderStatusColor } from './src/hooks/useOrders';
import { usePayments } from './src/hooks/usePayments';

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
];

describe('Debug', () => {
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
    vi.mocked(formatMoney).mockImplementation((cents: number) => `₹${(cents / 100).toLocaleString('en-IN')}`);
    vi.mocked(formatOrderStatus).mockImplementation((status: string) => status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '));
    vi.mocked(getOrderStatusColor).mockImplementation((status: string) => `status-${status.toLowerCase()}`);
  });

  it('debug cancelOrder', async () => {
    const cancelOrder = vi.fn().mockRejectedValue(new Error('Cannot cancel'));
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
    
    // Find and click Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    console.log('Cancel button found:', cancelBtn.textContent);
    fireEvent.click(cancelBtn);
    
    // Check modal text
    const modalText = screen.queryByText('Are you sure you want to cancel this order?');
    console.log('Modal text found:', !!modalText);
    
    // Find Cancel Order button
    const cancelOrderBtn = screen.getByRole('button', { name: 'Cancel Order' });
    console.log('Cancel Order button found:', cancelOrderBtn.textContent);
    console.log('Cancel Order button disabled:', cancelOrderBtn.disabled);
    
    fireEvent.click(cancelOrderBtn);
    
    // Wait and check
    await waitFor(() => console.log('cancelOrder calls:', cancelOrder.mock.calls), { timeout: 1000 });
    console.log('formError in document:', !!screen.queryByText('Cannot cancel'));
    screen.debug();
  });
});
