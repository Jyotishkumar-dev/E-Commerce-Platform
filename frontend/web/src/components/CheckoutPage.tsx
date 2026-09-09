import { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { useAddresses, useDefaultAddress } from '../hooks/useAddresses';
import { useOrders } from '../hooks/useOrders';
import { AddressForm } from './AddressForm';
import { AddressList } from './AddressList';
import { formatMoney } from './ProductCard';
import type { CartItem, Address, Order } from '../lib/api';

interface CheckoutPageProps {
  onClose?: () => void;
  onOrderComplete?: (order: Order) => void;
}

export function CheckoutPage({ onClose, onOrderComplete }: CheckoutPageProps) {
  const { items, itemCount, subtotalCents, hasUnavailableItems, refetch: refetchCart } = useCart();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses, createAddress } = useAddresses();
  const defaultAddress = useDefaultAddress();
  const { createOrder, isCreating } = useOrders();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

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
      const order = await createOrder({ shippingAddressId: selectedAddressId });
      setSuccess(true);
      void refetchCart();
      void refetchAddresses();
      onOrderComplete?.(order);
      if (onClose) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
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
            )}

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
            )}

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
              disabled={isPlacingOrder || !selectedAddressId || hasUnavailableItems || items.length === 0}
              onClick={handlePlaceOrder}
            >
              {isPlacingOrder ? 'Placing Order…' : 'Place Order →'}
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
            <h2>Order Placed Successfully!</h2>
            <p>Redirecting to order confirmation…</p>
          </div>
        </div>
      )}
    </main>
  );
}