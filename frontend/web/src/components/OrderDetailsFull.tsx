import { useState } from 'react';
import { useOrder } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import { formatMoney, formatAddress, getOrderStatusColor, formatOrderStatus } from '../hooks/useOrders';
import type { Order } from '../lib/api';

function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'SUCCESS':
      return 'Paid';
    case 'FAILED':
      return 'Failed';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

function getPaymentBadgeClass(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'status-paid';
    case 'FAILED':
      return 'status-failed';
    case 'PENDING':
      return 'status-pending';
    case 'REFUNDED':
      return 'status-refunded';
    default:
      return '';
  }
}

function getTimelineSteps(orderStatus: string, paymentStatus: string | null) {
  const steps = [
    { key: 'PLACED', label: 'Order Placed', completed: true },
    { key: 'CONFIRMED', label: 'Confirmed', completed: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(orderStatus) },
    { key: 'PROCESSING', label: 'Processing', completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(orderStatus) },
    { key: 'SHIPPED', label: 'Shipped', completed: ['SHIPPED', 'DELIVERED'].includes(orderStatus) },
    { key: 'DELIVERED', label: 'Delivered', completed: orderStatus === 'DELIVERED' },
  ];

  if (paymentStatus === 'PENDING') {
    steps.unshift({ key: 'PAYMENT_PENDING', label: 'Payment Pending', completed: false });
  }
  if (paymentStatus === 'SUCCESS') {
    steps[0].completed = true;
  }

  return steps;
}

export function OrderDetailsFull({ orderId }: { orderId: string }) {
  const { order, isLoading, isError, error, refetch } = useOrder(orderId);
  const { cancelOrder, isCancelling, refundPayment, isRefunding } = usePayments();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          <p className="error-icon" aria-hidden="true">⚠️</p>
          <h1>Order not found</h1>
          <p>{error || 'The order could not be found.'}</p>
          <button type="button" className="primary" onClick={() => window.location.href = '/account/orders'}>
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

  const payment = order.payment;
  const timelineSteps = getTimelineSteps(order.status, payment?.status ?? null);

  const canCancel = order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.status !== 'SHIPPED' && !(payment?.provider === 'RAZORPAY' && payment.status === 'SUCCESS');
  const canRefund = order.status !== 'CANCELLED' && payment?.status === 'SUCCESS';

  const handleCancel = async () => {
    setShowCancelConfirm(false);
    setFormError(null);
    try {
      await cancelOrder(order.id);
      setSuccessMsg('Order cancelled successfully.');
      void refetch();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to cancel order.');
    }
  };

  const handleRefund = async () => {
    setShowRefundConfirm(false);
    setFormError(null);
    try {
      await refundPayment(order.id);
      setSuccessMsg('Refund processed successfully.');
      void refetch();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to process refund.');
    }
  };

  return (
    <main className="order-details-page">
      <button type="button" className="back-btn" onClick={() => (window.location.href = '/account/orders')} aria-label="Back to orders">
        ← Back to Orders
      </button>

      {formError && <div className="dashboard-error" role="alert"><p>{formError}</p><button type="button" className="plain" onClick={() => setFormError(null)}>Dismiss</button></div>}
      {successMsg && <div className="dashboard-section"><div className="checkout-success"><p>{successMsg}</p><button type="button" className="plain" onClick={() => setSuccessMsg(null)}>Dismiss</button></div></div>}

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
            {orderDate}
          </time>
        </div>
      </header>

      <div className="order-details-grid">
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
                  <h3>{item.productTitle}</h3>
                  {item.productSkuSnapshot && <span className="item-sku">SKU: {item.productSkuSnapshot}</span>}
                </div>
                <span className="item-unit-price">{formatMoney(item.unitPriceCents)}</span>
                <span className="item-qty">{item.quantity}</span>
                <span className="item-total">{formatMoney(item.subtotalCents)}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="order-summary-section" aria-labelledby="summary-heading">
          <div className="order-summary-card">
            <h2 id="summary-heading">Order Summary</h2>
            <div className="summary-breakdown">
              <div className="breakdown-line">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
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

            {payment && (
              <div className="payment-info">
                <h3>Payment</h3>
                <div className="payment-details">
                  <span>Method: {payment.provider === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  <span>Status: <span className={`status-badge ${getPaymentBadgeClass(payment.status)}`}>{getPaymentStatusLabel(payment.status)}</span></span>
                  {payment.providerOrderId && <span>Transaction ID: {payment.providerOrderId}</span>}
                  {payment.providerPaymentId && <span>Payment ID: {payment.providerPaymentId}</span>}
                  <span>Amount: {formatMoney(payment.amountCents)}</span>
                </div>
                {canRefund && (
                  <div className="payment-actions">
                    <button type="button" className="primary" onClick={() => setShowRefundConfirm(true)} disabled={isRefunding}>
                      {isRefunding ? 'Refunding…' : 'Request Refund'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {canCancel && (
              <div className="payment-actions">
                <button type="button" className="plain danger" onClick={() => setShowCancelConfirm(true)} disabled={isCancelling}>
                  Cancel Order
                </button>
              </div>
            )}
          </div>

          {shippingAddress && (
            <div className="order-address-card">
              <h3>Delivery Address</h3>
              <address>{formatAddress(shippingAddress)}</address>
            </div>
          )}

          <div className="order-timeline-card">
            <h3>Order Progress</h3>
            <div className="status-timeline">
              {timelineSteps.map((step, index) => (
                <div key={step.key} className={`timeline-step ${step.completed ? 'completed' : ''} ${step.key === order.status ? 'current' : ''} ${index === timelineSteps.length - 1 ? 'last' : ''}`}>
                  <div className="timeline-marker">
                    {step.completed ? '✓' : step.key === order.status ? '●' : ''}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">{step.label}</span>
                    {step.key === order.status && <span className="current-badge">Current</span>}
                  </div>
                  {index < timelineSteps.length - 1 && <div className="timeline-connector" />}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showCancelConfirm && (
        <div className="modal-backdrop" onMouseDown={() => setShowCancelConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cancel-confirm-title">
            <div className="modal-content">
              <h2 id="cancel-confirm-title">Cancel Order</h2>
              <p>Are you sure you want to cancel this order?</p>
              <div className="modal-actions">
                <button type="button" className="plain" onClick={() => setShowCancelConfirm(false)} disabled={isCancelling}>
                  Keep Order
                </button>
                <button type="button" className="primary danger" onClick={handleCancel} disabled={isCancelling}>
                  {isCancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefundConfirm && (
        <div className="modal-backdrop" onMouseDown={() => setShowRefundConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="refund-confirm-title">
            <div className="modal-content">
              <h2 id="refund-confirm-title">Request Refund</h2>
              <p>
                This will initiate a refund of {formatMoney(order.totalCents)} to your original payment method.
              </p>
              <div className="modal-actions">
                <button type="button" className="plain" onClick={() => setShowRefundConfirm(false)} disabled={isRefunding}>
                  Cancel
                </button>
                <button type="button" className="primary" onClick={handleRefund} disabled={isRefunding}>
                  {isRefunding ? 'Refunding…' : 'Request Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
