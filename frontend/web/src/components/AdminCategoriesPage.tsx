import { useState } from 'react';
import { useAdminCategories } from '../hooks/useAdmin';
import { api, messageOf } from '../lib/api';

interface AdminCategoriesPageProps {
  onBack?: () => void;
}

export function AdminCategoriesPage({ onBack }: AdminCategoriesPageProps) {
  const { categories, isLoading, isError, error, refetch, updateCategory, deleteCategory, isUpdating, isDeleting } = useAdminCategories();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleStartEdit = (catId: string, name: string, slug: string, description: string) => {
    setEditingId(catId);
    setEditName(name);
    setEditSlug(slug);
    setEditDescription(description);
    setFormError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setFormError(null);
    try {
      await updateCategory(editingId, {
        name: editName || undefined,
        slug: editSlug || undefined,
        description: editDescription || undefined,
      });
      setEditingId(null);
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  const handleDelete = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(catId);
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  return (
    <main className="admin-categories">
      <header className="page-header">
        <div>
          <p className="eyebrow">CATEGORY MANAGEMENT</p>
          <h1>All Categories</h1>
        </div>
        <div>
          {onBack && (
            <button type="button" className="plain" onClick={onBack}>
              ← Back
            </button>
          )}
          <button type="button" className="primary" onClick={() => setShowCreate(!showCreate)}>
            + Add Category
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

      {/* Create Category Form */}
      {showCreate && (
        <section className="admin-form-section" aria-label="Create category">
          <h2>Add New Category</h2>
              <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              try {
                await api.post('/admin/categories', { name: createName, slug: createSlug, description: createDescription });
                setCreateName('');
                setCreateSlug('');
                setCreateDescription('');
                setShowCreate(false);
                refetch();
              } catch (err) {
                setFormError(messageOf(err));
              }
            }}
          >
            <div className="filter-row">
              <label>
                Name
                <input
                  required
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Category name"
                />
              </label>
              <label>
                Slug
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="URL-friendly slug"
                />
              </label>
              <label>
                Description
                <input
                  type="text"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </label>
            </div>
            <div className="filter-row">
              <button type="submit" className="primary" disabled={isUpdating}>
                Create Category
              </button>
              <button type="button" className="plain" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Categories List */}
      <section className="admin-table-container" aria-label="Categories list">
        <div className="table-wrapper">
          {isLoading && !categories.length ? (
            <div className="dashboard-loading">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading categories…</p>
            </div>
          ) : isError ? (
            <div className="dashboard-error" role="alert">
              <p>Failed to load categories: {error}</p>
              <button type="button" className="primary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Products</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { products: number };
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}) => (
                  <tr key={cat.id}>
                    <td>
                      {editingId === cat.id ? (
                        <input
                          className="inline-edit"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Edit category name"
                        />
                      ) : (
                        <strong>{cat.name}</strong>
                      )}
                    </td>
                    <td>
                      {editingId === cat.id ? (
                        <input
                          className="inline-edit"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          aria-label="Edit category slug"
                        />
                      ) : (
                        <span className="mono">{cat.slug}</span>
                      )}
                    </td>
                    <td>{cat._count?.products ?? 0}</td>
                    <td>
                      <div className="actions">
                        {editingId === cat.id ? (
                          <>
                            <button
                              type="button"
                              className="primary small"
                              onClick={handleSaveEdit}
                              disabled={isUpdating || isDeleting}
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
                              onClick={() => handleStartEdit(cat.id, cat.name, cat.slug, cat.description ?? '')}
                              aria-label={`Edit ${cat.name}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="plain danger"
                              onClick={() => handleDelete(cat.id)}
                              aria-label={`Delete ${cat.name}`}
                              disabled={isDeleting}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!categories.length && !isLoading && (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      No categories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
