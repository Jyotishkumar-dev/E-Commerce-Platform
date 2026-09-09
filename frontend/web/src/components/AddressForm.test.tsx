import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { AddressForm } from '../components/AddressForm';
import { AddressList } from '../components/AddressList';
import { useAddresses } from '../hooks/useAddresses';

vi.mock('../hooks/useAddresses');

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

describe('AddressForm', () => {
  const mockCreateAddress = vi.fn();
  const mockUpdateAddress = vi.fn();
  const mockIsCreating = false;
  const mockIsUpdating = false;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddresses).mockReturnValue({
      createAddress: mockCreateAddress,
      updateAddress: mockUpdateAddress,
      isCreating: mockIsCreating,
      isUpdating: mockIsUpdating,
      addresses: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      deleteAddress: vi.fn(),
      setDefaultAddress: vi.fn(),
      isDeleting: false,
      isSettingDefault: false,
    });
  });

  it('renders add address form', () => {
    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByText('ADD NEW ADDRESS')).toBeInTheDocument();
    expect(screen.getByText('Add Delivery Address')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/house \/ flat no/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
  });

  it('renders edit address form with initial data', () => {
    const initialData = {
      id: 'addr_1',
      userId: 'usr_1',
      fullName: 'Priya Sharma',
      phone: '+919876543210',
      addressLine1: '402, Lotus Towers',
      addressLine2: 'MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(
      <AddressForm initialData={initialData} onClose={vi.fn()} onSuccess={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('EDIT ADDRESS')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+919876543210')).toBeInTheDocument();
    expect(screen.getByDisplayValue('402, Lotus Towers')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MG Road')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mumbai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maharashtra')).toBeInTheDocument();
    expect(screen.getByDisplayValue('400001')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /set as default/i })).toBeChecked();
  });

  it('shows validation errors for empty required fields', async () => {
    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Save Address →'));

    await waitFor(() => {
      expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      expect(screen.getByText('Mobile number is required.')).toBeInTheDocument();
      expect(screen.getByText('House/Flat No., Building or Street is required.')).toBeInTheDocument();
      expect(screen.getByText('City is required.')).toBeInTheDocument();
      expect(screen.getByText('State is required.')).toBeInTheDocument();
      expect(screen.getByText('PIN code is required.')).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Save Address →'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid 10-digit mobile number.')).toBeInTheDocument();
    });
  });

  it('validates PIN code format', async () => {
    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Save Address →'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid 6-digit PIN code.')).toBeInTheDocument();
    });
  });

  it('calls createAddress on submit', async () => {
    mockCreateAddress.mockResolvedValueOnce({ id: 'addr_1' });

    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '+919876543210' } });
    fireEvent.change(screen.getByLabelText(/house \/ flat no/i), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'Maharashtra' } });
    fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '400001' } });

    fireEvent.click(screen.getByText('Save Address →'));

    await waitFor(() => {
      expect(mockCreateAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Test User',
          phone: '+919876543210',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        }),
      );
    });
  });

  it('includes Indian states in dropdown', () => {
    render(<AddressForm onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: createWrapper() });

    const stateSelect = screen.getByLabelText(/state/i);
    expect(stateSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /maharashtra/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /delhi/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /karnataka/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /tamil nadu/i })).toBeInTheDocument();
  });
});

describe('AddressList', () => {
  const mockAddresses = [
    {
      id: 'addr_1',
      userId: 'usr_1',
      fullName: 'Priya Sharma',
      phone: '+919876543210',
      addressLine1: '402, Lotus Towers',
      addressLine2: 'MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'addr_2',
      userId: 'usr_1',
      fullName: 'Rahul Kumar',
      phone: '+919876543211',
      addressLine1: '123, Park Street',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      isDefault: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddresses).mockReturnValue({
      addresses: mockAddresses,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      createAddress: vi.fn(),
      updateAddress: vi.fn(),
      deleteAddress: vi.fn(),
      setDefaultAddress: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isSettingDefault: false,
    });
  });

  it('renders addresses in manage mode', () => {
    render(<AddressList mode="manage" onClose={vi.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByText('My Addresses')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Rahul Kumar')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('+ Add New Address')).toBeInTheDocument();
  });

  it('renders addresses in select mode', () => {
    render(
      <AddressList mode="select" selectedAddressId="addr_1" onSelectAddress={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Select delivery address')).toBeInTheDocument();
    expect(screen.getByText('Deliver Here')).toBeInTheDocument();
  });

  it('shows selected address in select mode', () => {
    render(
      <AddressList mode="select" selectedAddressId="addr_1" onSelectAddress={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('✓ Selected')).toBeInTheDocument();
  });

  it('shows empty state when no addresses', () => {
    vi.mocked(useAddresses).mockReturnValue({
      addresses: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      createAddress: vi.fn(),
      updateAddress: vi.fn(),
      deleteAddress: vi.fn(),
      setDefaultAddress: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isSettingDefault: false,
    });

    render(<AddressList mode="manage" onClose={vi.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByText('No saved addresses')).toBeInTheDocument();
    expect(screen.getByText('Add a delivery address to speed up checkout.')).toBeInTheDocument();
    expect(screen.getByText('Add Address →')).toBeInTheDocument();
  });
});