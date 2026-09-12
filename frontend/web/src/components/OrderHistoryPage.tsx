import { useState, useCallback } from 'react';
import { useOrders } from '../hooks/useOrders';
import { usePayments } from '../hooks/usePayments';
import { formatMoney, formatAddress, getOrderStatusColor, formatOrderStatus, formatPaymentStatus } from '../hooks/useOrders';
import { api, messageOf, type Order, type Address } from '../lib/api';
import { useNavigate } from 'react-router-dom';

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

export function OrderHistoryPage() {
  const { orders, isLoading, isError, error, refetch, cancelOrder, isCancelling } = useOrders();
  const { refundPayment, isRefunding } = usePayments();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCancel = useCallback(async () => {
    if (!selectedOrder) return;
    setFormError(null);
    setShowCancelConfirm(false);
    try {
      await cancelOrder(selectedOrder.id);
      setSuccessMsg('Order cancelled successfully.');
      void refetch();
    } catch (e) {
      setFormError(messageOf(e));
    } finally {
      setSelectedOrder(null);
    }
  }, [selectedOrder, cancelOrder, refetch]);

  const handleRefund = useCallback(async () => {
    if (!selectedOrder) return;
    setFormError(null);
    setShowRefundConfirm(false);
    try {
      await refundPayment(selectedOrder.id);
      setSuccessMsg('Refund processed successfully.');
      void refetch();
    } catch (e) {
      setFormError(messageOf(e));
    } finally {
      setSelectedOrder(null);
    }
  }, [selectedOrder, refundPayment, refetch]);

  const canCancelOrder = (order: Order) => {
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED' || order.status === 'SHIPPED') return false;
    if (order.payment?.provider === 'RAZORPAY' && order.payment.status === 'SUCCESS') return false;
    return true;
  };

  const canRefundOrder = (order: Order) => {
    if (order.status === 'CANCELLED') return false;
    if (order.payment?.status !== 'SUCCESS') return false;
    return true;
  };

  return (
    <main className="order-history">
      <header className="order-history-header">
        <div>
          <p className="eyebrow">ORDER HISTORY</p>
          <h1>My Orders</h1>
        </div>
        <button type="button" className="plain" onClick={() => void refetch()}>
          Refresh
        </button>
      </header>

      {formError && (
        <div className="dashboard-error" role="alert">
          <p>{formError}</p>
          <button type="button" className="plain" onClick={() => setFormError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="dashboard-section">
          <div className="checkout-success">
            <p>{successMsg}</p>
            <button type="button" className="plain" onClick={() => setSuccessMsg(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="admin-table-container" aria-label="Order history">
        <div className="table-wrapper">
          {isLoading && !orders.length ? (
            <div className="dashboard-loading">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading orders…</p>
            </div>
          ) : isError ? (
            <div className="dashboard-error" role="alert">
              <p>Failed to load orders: {error}</p>
              <button type="button" className="primary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <a href={`/account/orders/${order.id}`} className="order-link">
                        #{order.id.slice(-8).toUpperCase()}
                      </a>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                    <td>{order.items.length}</td>
                    <td>{formatMoney(order.totalCents)}</td>
                    <td>
                      {order.payment ? (
                        <span className={`status-badge ${getPaymentBadgeClass(order.payment.status)}`}>
                          {formatPaymentStatus(order.payment.status)}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${getOrderStatusColor(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <a href={`/account/orders/${order.id}`} className="plain">
                          Details
                        </a>
                        {canCancelOrder(order) && (
                          <button
                            type="button"
                            className="plain danger"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowCancelConfirm(true);
                              setFormError(null);
                            }}
                            disabled={isCancelling}
                          >
                            Cancel
                          </button>
                        )}
                        {canRefundOrder(order) && (
                          <button
                            type="button"
                            className="plain"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRefundConfirm(true);
                              setFormError(null);
                            }}
                            disabled={isRefunding}
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && !isLoading && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showCancelConfirm && selectedOrder && (
        <div className="modal-backdrop" onMouseDown={() => setShowCancelConfirm(false)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowCancelConfirm(false)} aria-label="Close">
              ×
            </button>
            <h2>Cancel Order #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
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
      )}

      {showRefundConfirm && selectedOrder && (
        <div className="modal-backdrop" onMouseDown={() => setShowRefundConfirm(false)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowRefundConfirm(false)} aria-label="Close">
              ×
            </button>
            <h2>Refund Order #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
            <p>
              This will initiate a refund of {formatMoney(selectedOrder.totalCents)}. The refund will be processed to your
              original payment method.
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
      )}
    </main>
  );
}
