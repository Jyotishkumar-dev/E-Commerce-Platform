import { useState } from 'react';
import { useAdminCoupons, formatMoney } from '../hooks/useAdmin';
import { Coupon } from '../lib/api';
import { messageOf } from '../lib/api';

interface AdminCouponsPageProps {
  onBack?: () => void;
}

export function AdminCouponsPage({ onBack }: AdminCouponsPageProps) {
  const { coupons, pagination, isLoading, isError, error, refetch, createCoupon, updateCoupon, toggleActive, isCreating, isUpdating, isToggling } = useAdminCoupons();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editValue, setEditValue] = useState(0);
  const [editType, setEditType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [createCode, setCreateCode] = useState('');
  const [createValue, setCreateValue] = useState(0);
  const [createType, setCreateType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [createDescription, setCreateDescription] = useState('');
  const [createMinOrder, setCreateMinOrder] = useState('');

  const handleStartEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setEditCode(coupon.code);
    setEditValue(coupon.value);
    setEditType(coupon.type);
    setEditIsActive(coupon.isActive);
    setFormError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setFormError(null);
    try {
      await updateCoupon(editingId, {
        code: editCode,
        type: editType,
        value: editValue,
        isActive: editIsActive,
      });
      setEditingId(null);
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createCoupon({
        code: createCode,
        type: createType,
        value: createValue,
        description: createDescription || undefined,
        minimumOrderValueCents: createMinOrder ? Number(createMinOrder) * 100 : 0,
      });
      setCreateCode('');
      setCreateValue(0);
      setCreateType('PERCENTAGE');
      setCreateDescription('');
      setCreateMinOrder('');
      setShowCreate(false);
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  return (
    <main className="admin-coupons">
      <header className="page-header">
        <div>
          <p className="eyebrow">COUPON MANAGEMENT</p>
          <h1>All Coupons</h1>
        </div>
        <div>
          {onBack && (
            <button type="button" className="plain" onClick={onBack}>
              ← Back
            </button>
          )}
          <button type="button" className="primary" onClick={() => setShowCreate(!showCreate)}>
            + Add Coupon
          </button>
        </div>
      </header>

      {formError && (
        <div className="dashboard-error" role="alert">
          <p>{formError}</p>
          <button type="button" className="plain" onClick={() => setFormError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create Coupon Form */}
      {showCreate && (
        <section className="admin-form-section" aria-label="Create coupon">
          <h2>Add New Coupon</h2>
          <form onSubmit={handleCreate}>
            <div className="filter-row">
              <label>
                Code
                <input
                  required
                  type="text"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  placeholder="e.g. SAVE20"
                />
              </label>
              <label>
                Type
                <select value={createType} onChange={(e) => setCreateType(e.target.value as 'PERCENTAGE' | 'FIXED')}>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed</option>
                </select>
              </label>
              <label>
                Value
                <input
                  required
                  type="number"
                  min={1}
                  max={createType === 'PERCENTAGE' ? 100 : undefined}
                  value={createValue || ''}
                  onChange={(e) => setCreateValue(Number(e.target.value))}
                  placeholder={createType === 'PERCENTAGE' ? '1–100' : 'Amount'}
                />
              </label>
              <label>
                Min Order Value (₹)
                <input
                  type="number"
                  min={0}
                  value={createMinOrder}
                  onChange={(e) => setCreateMinOrder(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                Description
                <input
                  type="text"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="filter-row">
              <button type="submit" className="primary" disabled={isCreating}>
                Create Coupon
              </button>
              <button type="button" className="plain" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Coupons Table */}
      <section className="admin-table-container" aria-label="Coupons list">
        <div className="table-wrapper">
          {isLoading && !coupons.length ? (
            <div className="dashboard-loading">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading coupons…</p>
            </div>
          ) : isError ? (
            <div className="dashboard-error" role="alert">
              <p>Failed to load coupons: {error}</p>
              <button type="button" className="primary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon: import('../lib/api').Coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong className="mono">{coupon.code}</strong>
                    </td>
                    <td>
                      <span className="badge">{coupon.type}</span>
                    </td>
                    <td>
                      {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatMoney(coupon.value)}
                    </td>
                    <td>—</td>
                    <td>{coupon.usedCount}</td>
                    <td>
                      <span className={`status-badge ${coupon.isActive ? 'status-active' : 'status-inactive'}`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {editingId === coupon.id ? (
                          <>
                            <button
                              type="button"
                              className="primary small"
                              onClick={handleSaveEdit}
                              disabled={isUpdating || isToggling}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="plain small"
                              onClick={() => { setEditingId(null); setFormError(null); }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="plain"
                              onClick={() => handleStartEdit(coupon)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`plain ${coupon.isActive ? 'danger' : 'success'}`}
                              onClick={() => toggleActive(coupon.id, !coupon.isActive)}
                              disabled={isToggling}
                            >
                              {coupon.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!coupons.length && !isLoading && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No coupons found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Coupon pages">
            <button
              type="button"
              className="plain"
              onClick={() => {}}
              disabled
            >
              ← Prev
            </button>
            <span className="page-info">
              {pagination.total} coupons
            </span>
          </nav>
        )}
      </section>
    </main>
  );
}
