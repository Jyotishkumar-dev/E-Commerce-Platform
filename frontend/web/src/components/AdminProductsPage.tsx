import { useState } from 'react';
import { useAdminProducts, useAdminCategories } from '../hooks/useAdmin';
import { formatMoney, getOrderStatusColor, formatOrderStatus } from '../hooks/useAdmin';

interface AdminProductsPageProps {
  onNavigate?: (path: string) => void;
}

export function AdminProductsPage({ onNavigate }: AdminProductsPageProps) {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    isActive: undefined as boolean | undefined,
    lowStock: false,
    page: 1,
  });

  const { products, pagination, isLoading, isError, error, refetch } = useAdminProducts(filters);
  const { categories } = useAdminCategories();

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

  if (isLoading && !products.length) {
    return (
      <main className="admin-products">
        <div className="dashboard-loading">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading products…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="admin-products">
        <div className="dashboard-error" role="alert">
          <p>Failed to load products: {error}</p>
          <button type="button" className="primary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-products">
      <header className="page-header">
        <div>
          <p className="eyebrow">PRODUCT MANAGEMENT</p>
          <h1>All Products</h1>
        </div>
        <button type="button" className="primary" onClick={() => onNavigate?.('/admin/products/new')}>
          + Add Product
        </button>
      </header>

      {/* Filters */}
      <section className="admin-filters" aria-label="Product filters">
        <form onSubmit={handleSearch}>
          <div className="filter-row">
            <label>
              Search
              <input
                type="search"
                placeholder="Search by title, SKU, brand…"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value || '')}
              >
                <option value="">All Categories</option>
                {categories.map((cat: { id: string; name: string }) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.isActive !== undefined ? String(filters.isActive) : ''}
                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
              />
              Low Stock Only
            </label>
          </div>
        </form>
      </section>

      {/* Products Table */}
      <section className="admin-table-container" aria-label="Products list">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: {
                id: string;
                title: string;
                sku?: string | null;
                category: string;
                priceCents: number;
                stock: number;
                isActive: boolean;
                imageUrl: string | null;
              }) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="product-thumb" />
                      ) : (
                        <div className="product-thumb placeholder" aria-hidden="true">📦</div>
                      )}
                      <div>
                        <strong>{product.title}</strong>
                        <small>{product.id.slice(-8).toUpperCase()}</small>
                      </div>
                    </div>
                  </td>
                  <td>{product.sku ?? '—'}</td>
                  <td>{product.category}</td>
                  <td>{formatMoney(product.priceCents)}</td>
                  <td>
                    <span className={product.stock <= 0 ? 'out-of-stock' : product.stock <= 10 ? 'low-stock' : ''}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="plain icon-btn"
                        onClick={() => onNavigate?.(`/admin/products/${product.id}`)}
                        aria-label={`Edit ${product.title}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className={`plain icon-btn ${product.isActive ? 'danger' : 'success'}`}
                        onClick={() => handleFilterChange('isActive', !product.isActive)}
                        disabled={isLoading}
                        aria-label={product.isActive ? `Deactivate ${product.title}` : `Activate ${product.title}`}
                      >
                        {product.isActive ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Product pages">
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
    </main>
  );
}