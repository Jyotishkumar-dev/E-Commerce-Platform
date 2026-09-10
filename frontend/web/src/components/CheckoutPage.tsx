import { useState, useEffect, useCallback } from 'react';
import { useCart } from '../hooks/useCart';
import { useAddresses, useDefaultAddress } from '../hooks/useAddresses';
import { useOrders } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import { AddressForm } from './AddressForm';
import { AddressList } from './AddressList';
import { formatMoney } from './ProductCard';
import type { CartItem, Address, Order } from '../lib/api';

interface CheckoutPageProps {
  onClose?: () => void;
  onOrderComplete?: (order: Order) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

export function CheckoutPage({ onClose, onOrderComplete }: CheckoutPageProps) {
  const { items, itemCount, subtotalCents, hasUnavailableItems, refetch: refetchCart } = useCart();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses, createAddress } = useAddresses();
  const defaultAddress = useDefaultAddress();
  const { createOrder } = useOrders();
  const { createPaymentOrder, verifyPayment, isCreating: isCreatingPayment, isVerifying } = usePayments();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setRazorpayLoaded(false);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a delivery address.');
      return;
    }
    if (hasUnavailableItems) {
      setError('Please remove unavailable items from your cart before proceeding.');
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);
    setError('');

    try {
      const order = await createOrder({
        shippingAddressId: selectedAddressId,
        paymentMethod: 'RAZORPAY',
      });

      setIsPlacingOrder(false);
      await openRazorpayCheckout(order);
    } catch (e) {
      setIsPlacingOrder(false);
      setError(e instanceof Error ? e.message : 'Failed to place order. Please try again.');
    }
  };

  const openRazorpayCheckout = async (order: Order) => {
    if (!razorpayLoaded || !window.Razorpay) {
      setError('Payment gateway failed to load. Please try again.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const paymentOrder = await createPaymentOrder(order.id);

      const options: RazorpayOptions = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Shopvibe.store',
        description: `Order #${order.id.slice(-8).toUpperCase()}`,
        order_id: paymentOrder.providerOrderId,
        prefill: selectedAddress
          ? {
              name: selectedAddress.fullName,
              contact: selectedAddress.phone,
            }
          : undefined,
        theme: {
          color: '#1a1a2e',
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            setError('Payment window closed. You can try again.');
          },
        },
        handler: async (response: RazorpayResponse) => {
          await handlePaymentVerification(order, response);
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: { error: { code: string; description: string } }) => {
        setIsProcessingPayment(false);
        setError(`Payment failed: ${response.error.description}`);
      });
      razorpay.open();
    } catch (e) {
      setIsProcessingPayment(false);
      setError(e instanceof Error ? e.message : 'Failed to initialize payment. Please try again.');
    }
  };

  const handlePaymentVerification = async (order: Order, response: RazorpayResponse) => {
    try {
      await verifyPayment(response);
      setSuccess(true);
      void refetchCart();
      void refetchAddresses();
      onOrderComplete?.(order);
      if (onClose) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment verification failed. Please contact support.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleAddressSaved = async (newAddress?: Address) => {
    setShowAddAddress(false);
    if (newAddress) {
      setSelectedAddressId(newAddress.id);
    } else {
      await refetchAddresses();
    }
  };

  const handleCreateAddress = async (addressData: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAddress = await createAddress(addressData);
      handleAddressSaved(newAddress);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create address.');
    }
  };

  const shippingFeeCents = 0;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingFeeCents + taxCents;

  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <nav className="checkout-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={onClose} className="breadcrumb-link">
              Shop
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Shopping Bag</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Checkout</span>
          </nav>
          <div className="checkout-empty-container">
            <span className="cart-empty-icon" aria-hidden="true">🛍️</span>
            <p className="eyebrow">YOUR SHOPPING BAG</p>
            <h1>Your cart is empty.</h1>
            <p className="cart-empty-subtext">
              Add some items to your bag before proceeding to checkout.
            </p>
            <button type="button" className="primary" onClick={onClose}>
              Continue Shopping →
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isDisabled = isPlacingOrder || isProcessingPayment || isCreatingPayment || isVerifying || !selectedAddressId || hasUnavailableItems || items.length === 0;

  return (
    <main className="checkout-page">
      {/* Breadcrumb */}
      <nav className="checkout-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onClose} className="breadcrumb-link">
          Shop
        </button>
        <span className="breadcrumb-separator">/</span>
        <button type="button" onClick={onClose} className="breadcrumb-link">
          Shopping Bag
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Checkout</span>
      </nav>

      <div className="checkout-heading">
        <h1>Checkout</h1>
        <p className="eyebrow">Review your order and confirm delivery details</p>
      </div>

      {error && <div className="checkout-error" role="alert">{error}</div>}

      <div className="checkout-grid">
        {/* Left Column - Address & Items */}
        <section className="checkout-main" aria-label="Order details">
          {/* Delivery Address */}
          <div className="checkout-section">
            <div className="section-header">
              <h2>Delivery Address</h2>
              <button
                type="button"
                className="plain link-btn"
                onClick={() => setShowAddAddress(true)}
              >
                + Add New Address
              </button>
            </div>

            {showAddAddress ? (
              <AddressForm
                onClose={() => setShowAddAddress(false)}
                onSuccess={handleAddressSaved}
              />
            ) : (
              <AddressList
                addresses={addresses}
                mode="select"
                selectedAddressId={selectedAddressId ?? undefined}
                onSelectAddress={(address) => setSelectedAddressId(address.id)}
              />
            ))

            {selectedAddress && !showAddAddress && (
              <div className="selected-address-summary">
                <p className="eyebrow">SELECTED ADDRESS</p>
                <address>
                  <strong>{selectedAddress.fullName}</strong>
                  <span>{selectedAddress.phone}</span>
                  <span>{selectedAddress.addressLine1}</span>
                  {selectedAddress.addressLine2 && <span>{selectedAddress.addressLine2}</span>}
                  <span>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}</span>
                  <span>{selectedAddress.country}</span>
                </address>
                <button
                  type="button"
                  className="plain link-btn"
                  onClick={() => setShowAddAddress(true)}
                >
                  Change Address
                </button>
              </div>
            ))

            {!addresses.length && !showAddAddress && (
              <p className="no-address-notice">
                You don't have any saved addresses. Please add one to continue.
              </p>
            )}
          </div>

          {/* Order Items */}
          <div className="checkout-section">
            <h2>Order Items ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h2>
            <div className="checkout-items">
              {items.map((item) => (
                <article key={item.id || item.product.id} className="checkout-item">
                  <div className="checkout-item-image">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.title} loading="lazy" />
                    ) : (
                      <div className="placeholder">📦</div>
                    )}
                  </div>
                  <div className="checkout-item-details">
                    <span className="checkout-item-category">{item.product.brand || item.product.category}</span>
                    <h3>{item.product.title}</h3>
                    <p className="checkout-item-unit-price">{formatMoney(item.product.priceCents)} each</p>
                  </div>
                  <div className="checkout-item-qty">Qty: {item.quantity}</div>
                  <div className="checkout-item-total">
                    {formatMoney(item.product.priceCents * item.quantity)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column - Order Summary */}
        <aside className="checkout-sidebar" aria-label="Order summary">
          <div className="checkout-summary-card">
            <h2>Order Summary</h2>

            <div className="summary-line">
              <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span>{formatMoney(subtotalCents)}</span>
            </div>

            <div className="summary-line">
              <span>Shipping</span>
              <span className="text-success">FREE</span>
            </div>

            <div className="summary-line">
              <span>Estimated Taxes</span>
              <span>Included</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-total-row">
              <strong>Total (INR)</strong>
              <strong className="summary-total-price">{formatMoney(totalCents)}</strong>
            </div>

            <div className="summary-perks">
              <div className="summary-perk-item">
                <span>🚚</span>
                <div>
                  <strong>Free Express Shipping</strong>
                  <small>Delivered within 2–4 business days</small>
                </div>
              </div>
              <div className="summary-perk-item">
                <span>🛡️</span>
                <div>
                  <strong>10-Day Doorstep Returns</strong>
                  <small>No questions asked return policy</small>
                </div>
              </div>
              <div className="summary-perk-item">
                <span>✨</span>
                <div>
                  <strong>100% Genuine Guaranteed</strong>
                  <small>Direct authentic brand warranty</small>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary full checkout-place-order-btn"
              disabled={isDisabled}
              onClick={handlePlaceOrder}
            >
              {isProcessingPayment
                ? 'Confirming Payment…'
                : isPlacingOrder
                ? 'Creating Order…'
                : isCreatingPayment
                ? 'Preparing Payment…'
                : 'Pay Now →'}
            </button>

            {hasUnavailableItems && (
              <p className="checkout-warning">
                Please remove unavailable or out-of-stock items from your cart before placing the order.
              </p>
            )}

            {!selectedAddressId && !addresses.length && !showAddAddress && (
              <p className="checkout-warning">
                Add a delivery address to place your order.
              </p>
            )}

            <p className="secure-notice">
              <span aria-hidden="true">🔒</span> Your payment information is processed securely. We don't store card details.
            </p>
          </div>
        </aside>
      </div>

      {success && (
        <div className="order-success-overlay" role="status" aria-live="polite">
          <div className="order-success-card">
            <span className="success-icon" aria-hidden="true">✓</span>
            <h2>Payment Successful!</h2>
            <p>Redirecting to order confirmation…</p>
          </div>
        </div>
      )}

      {isProcessingPayment && (
        <div className="payment-processing-overlay" role="status" aria-live="polite">
          <div className="payment-processing-card">
            <div className="spinner" aria-hidden="true"></div>
            <h2>Processing Payment…</h2>
            <p>Please do not close this window.</p>
          </div>
        </div>
      )}
    </main>
  );
}