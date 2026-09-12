import { useState } from 'react';
import { useAdminCustomers, formatMoney } from '../hooks/useAdmin';
import { api, messageOf } from '../lib/api';
import { Order } from '../lib/api';

interface AdminCustomersPageProps {
  onBack?: () => void;
}

export function AdminCustomersPage({ onBack }: AdminCustomersPageProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const { customers, pagination, isLoading, isError, error, refetch } = useAdminCustomers({ search, page });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  const handleViewOrders = async (customerId: string) => {
    setSelectedCustomerOrders(null);
    setOrdersError(null);
    try {
      const { data } = await api.get(`/customers?userId=${customerId}&limit=100`);
      setSelectedCustomerOrders(data?.data?.orders ?? []);
    } catch (e) {
      setOrdersError('Failed to load orders.');
    }
  };

  return (
    <main className="admin-customers">
      <header className="page-header">
        <div>
          <p className="eyebrow">CUSTOMER MANAGEMENT</p>
          <h1>All Customers</h1>
        </div>
        <div>
          {onBack && (
            <button type="button" className="plain" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* Search */}
      <section className="admin-filters" aria-label="Customer filters">
        <form onSubmit={handleSearch}>
          <div className="filter-row">
            <label>
              Search
              <input
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </label>
          </div>
        </form>
      </section>

      {/* Customers Table */}
      <section className="admin-table-container" aria-label="Customers list">
        <div className="table-wrapper">
          {isLoading && !customers.length ? (
            <div className="dashboard-loading">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading customers…</p>
            </div>
          ) : isError ? (
            <div className="dashboard-error" role="alert">
              <p>Failed to load customers: {error}</p>
              <button type="button" className="primary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: {
                  id: string;
                  email: string;
                  name: string | null;
                  phone?: string | null;
                  totalSpent: number;
                  orderCount: number;
                  createdAt: string;
                }) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          {(customer.name ?? customer.email).charAt(0).toUpperCase()}
                        </div>
                        <strong>{customer.name ?? '—'}</strong>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.phone ?? '—'}</td>
                    <td>{customer.orderCount}</td>
                    <td>{formatMoney(customer.totalSpent)}</td>
                    <td>{new Date(customer.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="plain"
                          onClick={() => handleViewOrders(customer.id)}
                        >
                          Orders
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!customers.length && !isLoading && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Customer pages">
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

      {/* Customer Orders Modal */}
      {selectedCustomerOrders !== null && (
        <div className="modal-backdrop" onClick={() => setSelectedCustomerOrders(null)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedCustomerOrders(null)} aria-label="Close">
              ×
            </button>
            <h2>Customer Orders</h2>
            {ordersError && <p className="error" role="alert">{ordersError}</p>}
            {selectedCustomerOrders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              <ul className="order-items-list">
                {selectedCustomerOrders.map((order) => (
                  <li key={order.id}>
                    <div>
                      <strong>#{order.id.slice(-8).toUpperCase()}</strong>
                      <span className={`status-badge`} style={{ marginLeft: 8 }}>
                        {order.status}
                      </span>
                    </div>
                    <div>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {formatMoney(order.totalCents)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
