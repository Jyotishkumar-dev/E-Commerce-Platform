import { useState, useMemo } from 'react';
import { useAdminInventory } from '../hooks/useAdmin';
import { useAdminProductStock } from '../hooks/useAdmin';

interface InventoryPageProps {
  onBack?: () => void;
}

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

export function InventoryPage({ onBack }: InventoryPageProps) {
  const { inventory, isLoading, isError, error, refetch } = useAdminInventory();
  const { updateStock, isUpdating } = useAdminProductStock(null);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'in-stock': return inventory.filter((i) => !i.lowStock && !i.outOfStock);
      case 'low-stock': return inventory.filter((i) => i.lowStock);
      case 'out-of-stock': return inventory.filter((i) => i.outOfStock);
      default: return inventory;
    }
  }, [inventory, filter]);

  const handleEdit = (id: string, currentStock: number) => {
    setEditingId(id);
    setEditValue(String(currentStock));
  };

  const handleSave = async (id: string) => {
    const stock = Number(editValue);
    if (Number.isNaN(stock) || stock < 0) return;
    try {
      await updateStock(id, stock);
    } catch {
      // Error handled by mutation
    }
    setEditingId(null);
  };

  return (
    <main className="admin-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">INVENTORY</p>
          <h1>Inventory Management</h1>
        </div>
        <button type="button" className="plain" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Filters */}
      <section className="admin-filters" aria-label="Stock filter">
        <div className="filter-row">
          {([
            { key: 'all', label: 'All' },
            { key: 'in-stock', label: 'In Stock' },
            { key: 'low-stock', label: 'Low Stock' },
            { key: 'out-of-stock', label: 'Out of Stock' },
          ] as { key: StockFilter; label: string }[]).map((f) => (
            <button
              key={f.key}
              type="button"
              className={`plain ${filter === f.key ? 'primary' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <div className="dashboard-loading">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading inventory…</p>
        </div>
      )}

      {isError && (
        <div className="dashboard-error" role="alert">
          <p>Failed to load inventory: {error}</p>
          <button type="button" className="primary" onClick={refetch}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <section className="admin-table-container" aria-label="Inventory list">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>{item.sku ?? '—'}</td>
                    <td>{item.categoryRef?.name ?? item.category}</td>
                    <td>
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            style={{ width: '80px', padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                          />
                          <button type="button" className="primary" onClick={() => handleSave(item.id)} disabled={isUpdating} style={{ padding: '4px 12px' }}>
                            Save
                          </button>
                          <button type="button" className="plain" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={item.outOfStock ? 'out-of-stock' : item.lowStock ? 'low-stock' : ''}>
                          {item.stock}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.outOfStock ? (
                        <span className="status-badge status-cancelled">Out of Stock</span>
                      ) : item.lowStock ? (
                        <span className="status-badge status-pending">Low Stock</span>
                      ) : (
                        <span className="status-badge status-active">In Stock</span>
                      )}
                    </td>
                    <td>
                      {!editingId && (
                        <button
                          type="button"
                          className="plain icon-btn"
                          onClick={() => handleEdit(item.id, item.stock)}
                          aria-label={`Edit stock for ${item.title}`}
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="empty-state">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
