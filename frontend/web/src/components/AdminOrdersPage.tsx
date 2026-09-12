import { useState } from 'react';
import { useAdminOrders, useAdminOrderDetails, formatMoney, getOrderStatusColor, formatOrderStatus, getPaymentStatusColor, formatPaymentStatus } from '../hooks/useAdmin';
import { api, type Order, messageOf } from '../lib/api';

interface AdminOrdersPageProps {
  onBack?: () => void;
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const;

export function AdminOrdersPage({ onBack }: AdminOrdersPageProps) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentStatus: '',
    paymentProvider: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  const { orders, pagination, isLoading, isError, error, refetch, updateOrderStatus, isUpdating } = useAdminOrders(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewOrder = async (orderId: string) => {
    setSelectedOrder(null);
    setOrderError(null);
    try {
      const { data } = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrder(data?.data?.order);
    } catch (e) {
      setOrderError(messageOf(e));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setStatusUpdateError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      setShowStatusDropdown(null);
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
    } catch (e) {
      setStatusUpdateError(messageOf(e));
    }
  };

  return (
    <main className="admin-orders">
      <header className="page-header">
        <div>
          <p className="eyebrow">ORDER MANAGEMENT</p>
          <h1>All Orders</h1>
        </div>
        <div>
          {onBack && (
            <button type="button" className="plain" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <section className="admin-filters" aria-label="Order filters">
        <form onSubmit={handleSearch}>
          <div className="filter-row">
            <label>
              Search
              <input
                type="search"
                placeholder="Order ID, customer name, email…"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </label>
            <label>
              Status
              <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value || '')}>
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatOrderStatus(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment
              <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value || '')}>
                <option value="">All Payments</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatPaymentStatus(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </label>
          </div>
          <div className="filter-row">
            <button type="submit" className="primary" disabled={isUpdating}>
              Apply Filters
            </button>
            <button
              type="button"
              className="plain"
              onClick={() => {
                setFilters({ search: '', status: '', paymentStatus: '', paymentProvider: '', dateFrom: '', dateTo: '', page: 1 });
                refetch();
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {/* Orders Table */}
      <section className="admin-table-container" aria-label="Orders list">
        <div className="table-wrapper">
          {isLoading && !orders.length ? (
            <div className="dashboard-loading">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading orders…</p>
            </div>
          ) : isError ? (
            <div className="dashboard-error" role="alert">
              <p>Failed to load orders: {error}</p>
              <button type="button" className="primary" onClick={refetch}>
                Retry
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <a href={`/admin/orders/${order.id}`} className="order-link" onClick={(e) => { e.preventDefault(); handleViewOrder(order.id); }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </a>
                    </td>
                    <td>
                      {order.user.name ?? '—'} ({order.user.email})
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                    <td>
                      <span className={`status-badge ${getOrderStatusColor(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td>
                      {order.payment ? (
                        <span className={`status-badge ${getPaymentStatusColor(order.payment.status)}`}>
                          {formatPaymentStatus(order.payment.status)}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td>{formatMoney(order.totalCents)}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="plain"
                          onClick={() => handleViewOrder(order.id)}
                          aria-label="View order details"
                        >
                          View
                        </button>
                        <div className="status-dropdown">
                          <button
                            type="button"
                            className="primary small"
                            onClick={() => setShowStatusDropdown(showStatusDropdown === order.id ? null : order.id)}
                            disabled={isUpdating}
                          >
                            Change Status
                          </button>
                          {showStatusDropdown === order.id && (
                            <div className="dropdown-menu" role="menu">
                              {ORDER_STATUSES.filter((s) => s !== order.status).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  role="menuitem"
                                  className="dropdown-item"
                                  onClick={() => handleStatusChange(order.id, status)}
                                >
                                  {formatOrderStatus(status)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && !isLoading && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Order pages">
            <button
              type="button"
              className="plain"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              ← Prev
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <button
              type="button"
              className="plain"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next →
            </button>
          </nav>
        )}
      </section>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedOrder(null)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close">
              ×
            </button>
            <h2>Order #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
            {statusUpdateError && <p className="error" role="alert">{statusUpdateError}</p>}
            <div className="order-detail-meta">
              <div>
                <strong>Status:</strong>{' '}
                <span className={`status-badge ${getOrderStatusColor(selectedOrder.status)}`}>
                  {formatOrderStatus(selectedOrder.status)}
                </span>
              </div>
              <div>
                <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </div>
              <div>
                <strong>Total:</strong> {formatMoney(selectedOrder.totalCents)}
              </div>
              <div>
                <strong>Customer:</strong> {selectedOrder.user.name ?? selectedOrder.user.email} ({selectedOrder.user.email})
              </div>
            </div>

            {selectedOrder.payment && (
              <div className="order-detail-meta">
                <h3>Payment</h3>
                <div><strong>Provider:</strong> {selectedOrder.payment.provider}</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge ${getPaymentStatusColor(selectedOrder.payment.status)}`}>
                    {formatPaymentStatus(selectedOrder.payment.status)}
                  </span>
                </div>
                <div><strong>Amount:</strong> {formatMoney(selectedOrder.payment.amountCents)}</div>
                <div><strong>Provider Order ID:</strong> {selectedOrder.payment.providerOrderId ?? '—'}</div>
              </div>
            )}

            <h3>Items</h3>
            <ul className="order-items-list">
              {selectedOrder.items.map((item) => (
                <li key={item.id}>
                  <span>{item.productTitle}</span>
                  <span>× {item.quantity}</span>
                  <span>{formatMoney(item.unitPriceCents * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
