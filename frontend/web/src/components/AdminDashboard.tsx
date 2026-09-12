import { useAdminDashboard, useAdminOrders } from '../hooks/useAdmin';
import { formatMoney } from '../hooks/useAdmin';
import { formatOrderStatus, getOrderStatusColor } from '../hooks/useAdmin';
import { api, type Order } from '../lib/api';

export function AdminDashboard() {
  const { metrics, isLoading, isError, error, refetch } = useAdminDashboard();

  if (isLoading) {
    return (
      <main className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading dashboard…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="admin-dashboard">
        <div className="dashboard-error" role="alert">
          <p>Failed to load dashboard: {error}</p>
          <button type="button" className="primary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <main className="admin-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">ADMIN DASHBOARD</p>
          <h1>Shopvibe.store Overview</h1>
        </div>
          <button type="button" className="plain" onClick={() => refetch()}>
            Refresh
          </button>
      </header>

      {/* Key Metrics Grid */}
      <section className="metrics-grid" aria-label="Key metrics">
        <article className="metric-card">
          <span className="metric-label">Total Customers</span>
          <strong className="metric-value">{metrics.users.toLocaleString()}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Active Products</span>
          <strong className="metric-value">{metrics.activeProducts.toLocaleString()}</strong>
        </article>
        <article className="metric-card warning">
          <span className="metric-label">Low Stock Items</span>
          <strong className="metric-value">{metrics.lowStockProducts.toLocaleString()}</strong>
        </article>
        <article className="metric-card danger">
          <span className="metric-label">Out of Stock</span>
          <strong className="metric-value">{metrics.outOfStockProducts.toLocaleString()}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Total Orders</span>
          <strong className="metric-value">{metrics.orders.toLocaleString()}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Revenue (Paid)</span>
          <strong className="metric-value">{formatMoney(metrics.revenuePaidCents)}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Avg Order Value</span>
          <strong className="metric-value">{formatMoney(metrics.averageOrderValueCents)}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Inactive Products</span>
          <strong className="metric-value">{metrics.inactiveProducts.toLocaleString()}</strong>
        </article>
      </section>

      {/* Order Status Breakdown */}
      <section className="dashboard-section" aria-label="Order status breakdown">
        <h2>Order Status</h2>
        <div className="status-breakdown">
          <article className="status-item">
            <span className="status-badge status-pending">Pending</span>
            <strong>{metrics.pendingOrders}</strong>
          </article>
          <article className="status-item">
            <span className="status-badge status-confirmed">Confirmed</span>
            <strong>{metrics.confirmedOrders}</strong>
          </article>
          <article className="status-item">
            <span className="status-badge status-processing">Processing</span>
            <strong>{metrics.processingOrders}</strong>
          </article>
          <article className="status-item">
            <span className="status-badge status-shipped">Shipped</span>
            <strong>{metrics.shippedOrders}</strong>
          </article>
          <article className="status-item">
            <span className="status-badge status-delivered">Delivered</span>
            <strong>{metrics.deliveredOrders}</strong>
          </article>
          <article className="status-item danger">
            <span className="status-badge status-cancelled">Cancelled</span>
            <strong>{metrics.cancelledOrders}</strong>
          </article>
        </div>
      </section>

      {/* Recent Orders */}
      <section className="dashboard-section" aria-label="Recent orders">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <a href="/admin/orders" className="plain link-btn">View All →</a>
        </div>
        <div className="recent-orders-table">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentOrders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td>
                    <a href={`/admin/orders/${order.id}`} className="order-link">
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
                  <td>{formatMoney(order.totalCents)}</td>
                </tr>
              ))}
              {!metrics.recentOrders.length && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Low Stock Products */}
      {metrics.lowStockItems.length > 0 && (
        <section className="dashboard-section warning" aria-label="Low stock products">
          <div className="section-header">
            <h2>Low Stock Alert</h2>
            <a href="/admin/products?lowStock=true" className="plain link-btn">View All →</a>
          </div>
          <div className="low-stock-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {metrics.lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`/admin/products/${item.id}`} className="product-link">
                        {item.title}
                      </a>
                    </td>
                    <td>{item.sku ?? '—'}</td>
                    <td>{item.category}</td>
                    <td className="low-stock-count">{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Admin Navigation Tabs */}
      <section className="dashboard-section" aria-label="Admin navigation">
        <h2>Quick Access</h2>
        <div className="admin-nav-tabs">
          <a href="/admin/products" className="nav-tab">📦 Products</a>
          <a href="/admin/orders" className="nav-tab">📋 Orders</a>
          <a href="/admin/customers" className="nav-tab">👥 Customers</a>
          <a href="/admin/categories" className="nav-tab">🏷️ Categories</a>
          <a href="/admin/coupons" className="nav-tab">🎟️ Coupons</a>
        </div>
      </section>
    </main>
  );
}
