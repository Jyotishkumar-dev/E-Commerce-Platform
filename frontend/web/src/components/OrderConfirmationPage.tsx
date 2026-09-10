import { useEffect, useState } from 'react';
import { useOrder } from '../hooks/useOrders';
import { formatMoney, formatAddress, getOrderStatusColor } from '../hooks/useOrders';
import type { Order } from '../lib/api';

interface OrderConfirmationPageProps {
  orderId: string;
  onContinueShopping: () => void;
  onViewOrder: () => void;
}

export function OrderConfirmationPage({ orderId, onContinueShopping, onViewOrder }: OrderConfirmationPageProps) {
  const { order, isLoading, isError, error, refetch } = useOrder(orderId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-loading" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading order details…</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-loading" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading order details…</p>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-error">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <h1>Unable to load order details</h1>
          <p>{error || 'The order could not be found.'}</p>
          <button type="button" className="primary" onClick={onContinueShopping}>
            Continue Shopping →
          </button>
        </div>
      </main>
    );
  }

  const shippingAddress = order.shippingAddressSnapshot;
  const orderNumber = order.id.slice(-8).toUpperCase();
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const payment = order.payment;
  const isPaymentPending = payment && payment.status === 'PENDING';
  const isPaymentFailed = payment && payment.status === 'FAILED';

  return (
    <main className="confirmation-page">
      <div className="confirmation-container">
        {/* Success Header */}
        <header className="confirmation-header">
          <div className="success-badge">
            <span className="success-icon" aria-hidden="true">{isPaymentPending ? '⏳' : isPaymentFailed ? '✗' : '✓'}</span>
            <span>{isPaymentPending ? 'Payment Pending' : isPaymentFailed ? 'Payment Failed' : 'Order Confirmed'}</span>
          </div>
          <h1>{isPaymentPending ? 'Complete your payment to confirm the order' : isPaymentFailed ? 'Payment could not be completed' : 'Thank you for your order!'}</h1>
          <p className="confirmation-message">
            {isPaymentPending
              ? 'Your order is awaiting payment. Complete the payment to confirm your order.'
              : isPaymentFailed
              ? 'Your payment could not be processed. You can retry the payment from order details.'
              : 'Your order has been placed successfully. We\'ve sent a confirmation email with your order details.'}
          </p>
        </header>

        {/* Payment Status Card */}
        {payment && (
          <section className="confirmation-details" aria-labelledby="payment-details-heading">
            <div className="confirmation-card payment-card">
              <div className="card-header">
                <h2 id="payment-details-heading">Payment Status</h2>
                <span className={`status-badge ${getOrderStatusColor(payment.status)}`}>
                  {payment.status === 'PENDING' ? 'Pending' : payment.status === 'SUCCESS' ? 'Paid' : payment.status === 'FAILED' ? 'Failed' : payment.status === 'REFUNDED' ? 'Refunded' : payment.status}
                </span>
              </div>

              <div className="payment-details-grid">
                <div className="payment-detail">
                  <span className="payment-label">Amount Paid</span>
                  <span className="payment-value">{formatMoney(payment.amountCents)}</span>
                </div>
                <div className="payment-detail">
                  <span className="payment-label">Payment Method</span>
                  <span className="payment-value">{payment.provider === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</span>
                </div>
                {payment.providerOrderId && (
                  <div className="payment-detail">
                    <span className="payment-label">Transaction ID</span>
                    <span className="payment-value">{payment.providerOrderId}</span>
                  </div>
                )}
                {payment.providerPaymentId && (
                  <div className="payment-detail">
                    <span className="payment-label">Payment ID</span>
                    <span className="payment-value">{payment.providerPaymentId}</span>
                  </div>
                )}
              </div>

              {isPaymentPending && (
                <div className="payment-actions">
                  <button type="button" className="primary" onClick={onViewOrder}>
                    Complete Payment →
                  </button>
                </div>
              )}

              {isPaymentFailed && (
                <div className="payment-actions">
                  <button type="button" className="primary" onClick={onViewOrder}>
                    Retry Payment →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

        {/* Order Details Card */}
        <section className="confirmation-details" aria-labelledby="order-details-heading">
          <div className="confirmation-card">
            <div className="card-header">
              <h2 id="order-details-heading">Order #{orderNumber}</h2>
              <div className="order-meta">
                <span className={`status-badge ${getOrderStatusColor(order.status)}`}>{order.status}</span>
                <time dateTime={order.createdAt}>{orderDate}</time>
              </div>
            </div>

            {/* Items */}
            <div className="confirmation-items">
              <h3>Order Items</h3>
              <ul className="items-list">
                {order.items.map((item) => (
                  <li key={item.id} className="confirmation-item">
                    <div className="item-info">
                      <span className="item-title">{item.productTitle}</span>
                      <span className="item-qty">× {item.quantity}</span>
                    </div>
                    <span className="item-price">{formatMoney(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Breakdown */}
            <div className="confirmation-breakdown">
              <div className="breakdown-line">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotalCents)}</span>
              </div>
              {order.discountCents && order.discountCents > 0 && (
                <div className="breakdown-line discount">
                  <span>Discount</span>
                  <span>−{formatMoney(order.discountCents)}</span>
                </div>
              )}
              <div className="breakdown-line">
                <span>Shipping</span>
                <span>{formatMoney(order.shippingFeeCents) || 'Free'}</span>
              </div>
              <div className="breakdown-line">
                <span>Taxes</span>
                <span>{formatMoney(order.taxCents) || 'Included'}</span>
              </div>
              <div className="breakdown-total">
                <strong>Total</strong>
                <strong>{formatMoney(order.totalCents)}</strong>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="confirmation-card address-card">
              <h3>Delivery Address</h3>
              <address>{formatAddress(shippingAddress).split(', ').map((line, i) => (
                <span key={i}>{line}</span>
              ))}</address>
            </div>
          )}

          {/* Order Status Timeline */}
          <div className="confirmation-card timeline-card">
            <h3>Order Status</h3>
            <div className="status-timeline">
              {[
                { key: 'PENDING', label: 'Order Placed', completed: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'CONFIRMED', label: 'Confirmed', completed: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'PROCESSING', label: 'Processing', completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'SHIPPED', label: 'Shipped', completed: ['SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'DELIVERED', label: 'Delivered', completed: order.status === 'DELIVERED' },
              ].map((step, index) => (
                <div key={step.key} className={`timeline-step ${step.completed ? 'completed' : ''} ${index === 4 ? 'last' : ''}`}>
                  <div className="timeline-marker">
                    {step.completed ? '✓' : step.key === order.status ? '●' : ''}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">{step.label}</span>
                    {step.key === order.status && <span className="current-badge">Current</span>}
                  </div>
                  {index < 4 && <div className="timeline-connector" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Actions */}
        <footer className="confirmation-actions">
          <button type="button" className="primary full" onClick={onViewOrder}>
            View Order Details →
          </button>
          <button type="button" className="plain full" onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </footer>

        {/* Trust Signals */}
        <div className="confirmation-trust">
          <div className="trust-item">
            <span>📦</span>
            <div>
              <strong>Free Shipping</strong>
              <small>On all orders across India</small>
            </div>
          </div>
          <div className="trust-item">
            <span>🔄</span>
            <div>
              <strong>Easy Returns</strong>
              <small>10-day doorstep pickup</small>
            </div>
          </div>
          <div className="trust-item">
            <span>🛡️</span>
            <div>
              <strong>Secure Payment</strong>
              <small>Your data is protected</small>
            </div>
          </div>
          <div className="trust-item">
            <span>💬</span>
            <div>
              <strong>24/7 Support</strong>
              <small>We're here to help</small>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}