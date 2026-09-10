import { useOrder } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import { formatMoney, formatAddress, getOrderStatusColor } from '../hooks/useOrders';
import type { Order } from '../lib/api';
import { useState } from 'react';

interface OrderDetailsPageProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetailsPage({ orderId, onBack }: OrderDetailsPageProps) {
  const { order, isLoading, isError, error, refetch } = useOrder(orderId);
  const { retryPayment, cancelPayment, isRetrying, isCancelling } = usePayments();
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <main className="order-details-page">
        <div className="order-details-loading" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading order details…</p>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="order-details-page">
        <div className="order-details-error">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Back to orders">
            ← Back
          </button>
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <h1>Order not found</h1>
          <p>{error || 'The order could not be found or you do not have permission to view it.'}</p>
          <button type="button" className="primary" onClick={onBack}>
            Back to Orders →
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

  const formatOrderStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  const payment = order.payment;
  const isPaymentPending = payment && payment.status === 'PENDING';
  const isPaymentFailed = payment && payment.status === 'FAILED';
  const canRetry = isPaymentPending || isPaymentFailed;
  const canCancel = isPaymentPending;

  const handleRetry = async () => {
    try {
      await retryPayment(orderId);
      void refetch();
    } catch (e) {
      console.error('Retry failed:', e);
    }
    setShowRetryConfirm(false);
  };

  const handleCancel = async () => {
    try {
      await cancelPayment(orderId);
      void refetch();
    } catch (e) {
      console.error('Cancel failed:', e);
    }
    setShowCancelConfirm(false);
  };

  return (
    <main className="order-details-page">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Back to orders">
        ← Back to Orders
      </button>

      <header className="order-details-header">
        <div className="header-left">
          <p className="eyebrow">ORDER DETAILS</p>
          <h1>Order #{orderNumber}</h1>
        </div>
        <div className="header-right">
          <span className={`status-badge ${getOrderStatusColor(order.status)}`}>
            {formatOrderStatus(order.status)}
          </span>
          <time dateTime={order.createdAt} className="order-date">
            Placed on {orderDate}
          </time>
        </div>
      </header>

      <div className="order-details-grid">
        {/* Order Items */}
        <section className="order-items-section" aria-labelledby="items-heading">
          <h2 id="items-heading">Order Items</h2>
          <div className="order-items-table">
            <div className="table-header">
              <span>Product</span>
              <span>Unit Price</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            {order.items.map((item) => (
              <article key={item.id} className="order-item-row">
                <div className="item-product">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.productTitle} className="item-thumb" loading="lazy" />
                  ) : (
                    <div className="item-thumb placeholder" aria-hidden="true">📦</div>
                  )}
                  <div className="item-info">
                    <h3>{item.productTitle}</h3>
                    {item.productSkuSnapshot && <span className="item-sku">SKU: {item.productSkuSnapshot}</span>}
                    {item.product && (
                      <a
                        href={`/products/${item.product.slug}`}
                        className="item-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Product →
                      </a>
                    )}
                  </div>
                </div>
                <span className="item-unit-price">{formatMoney(item.unitPriceCents)}</span>
                <span className="item-qty">{item.quantity}</span>
                <span className="item-total">{formatMoney(item.subtotalCents)}</span>
              </article>
            ))}
          </div>
        </section>

        {/* Order Summary & Address */}
        <aside className="order-summary-section" aria-labelledby="summary-heading">
          <div className="order-summary-card">
            <h2 id="summary-heading">Order Summary</h2>

            <div className="summary-breakdown">
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
                <strong>Total Paid</strong>
                <strong>{formatMoney(order.totalCents)}</strong>
              </div>
            </div>

            {payment && (
              <div className="payment-info">
                <h3>Payment</h3>
                <div className="payment-details">
                  <span>Method: {payment.provider === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  <span>Status: {payment.status === 'PENDING' ? 'Pending' : payment.status === 'SUCCESS' ? 'Paid' : payment.status === 'FAILED' ? 'Failed' : payment.status === 'REFUNDED' ? 'Refunded' : payment.status}</span>
                  {payment.providerOrderId && (
                    <span>Transaction ID: {payment.providerOrderId}</span>
                  )}
                  {payment.providerPaymentId && (
                    <span>Payment ID: {payment.providerPaymentId}</span>
                  )}
                  <span>Amount: {formatMoney(payment.amountCents)}</span>
                </div>

                {canRetry && (
                  <div className="payment-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => setShowRetryConfirm(true)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Retrying…' : isPaymentPending ? 'Retry Payment' : 'Retry Payment'}
                    </button>
                  </div>
                )}

                {canCancel && (
                  <div className="payment-actions">
                    <button
                      type="button"
                      className="plain danger"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling…' : 'Cancel Payment'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {shippingAddress && (
            <div className="order-address-card">
              <h3>Delivery Address</h3>
              <address>{formatAddress(shippingAddress).split(', ').map((line, i) => (
                <span key={i}>{line}</span>
              ))}</address>
            </div>
          )}

          {/* Status Timeline */}
          <div className="order-timeline-card">
            <h3>Order Progress</h3>
            <div className="status-timeline">
              {[
                { key: 'PENDING', label: 'Order Placed', completed: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'CONFIRMED', label: 'Confirmed', completed: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'PROCESSING', label: 'Processing', completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'SHIPPED', label: 'Shipped', completed: ['SHIPPED', 'DELIVERED'].includes(order.status) },
                { key: 'DELIVERED', label: 'Delivered', completed: order.status === 'DELIVERED' },
              ].map((step, index) => (
                <div key={step.key} className={`timeline-step ${step.completed ? 'completed' : ''} ${step.key === order.status ? 'current' : ''} ${index === 4 ? 'last' : ''}`}>
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
        </aside>
      </div>

      {showRetryConfirm && (
        <div className="modal" onMouseDown={() => setShowRetryConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="retry-confirm-title">
          <div className="modal-content">
            <h2 id="retry-confirm-title">Retry Payment</h2>
            <p>This will open the payment gateway to complete your payment. Do you want to continue?</p>
            <div className="modal-actions">
              <button type="button" className="plain" onClick={() => setShowRetryConfirm(false)} disabled={isRetrying}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleRetry} disabled={isRetrying}>
                {isRetrying ? 'Retrying…' : 'Retry Payment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="modal" onMouseDown={() => setShowCancelConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="cancel-confirm-title">
          <div className="modal-content">
            <h2 id="cancel-confirm-title">Cancel Payment</h2>
            <p>This will cancel your order and release the items back to inventory. This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="plain" onClick={() => setShowCancelConfirm(false)} disabled={isCancelling}>
                Keep Order
              </button>
              <button type="button" className="primary danger" onClick={handleCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelling…' : 'Cancel Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}