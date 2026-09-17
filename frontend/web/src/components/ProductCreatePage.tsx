import { useState } from 'react';
import { useAdminProductCreate } from '../hooks/useAdmin';
import { useAdminCategories } from '../hooks/useAdmin';
import { ProductMediaManager } from './ProductMediaManager';
import type { ProductImage } from '../lib/api';

interface ProductCreatePageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
}

export function ProductCreatePage({ onBack }: ProductCreatePageProps) {
  const { createProduct, isCreating } = useAdminProductCreate();
  const { categories } = useAdminCategories();
  const [form, setForm] = useState({
    title: '',
    priceCents: '',
    stock: '',
    description: '',
    category: '',
    sku: '',
    brand: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [mediaImages, setMediaImages] = useState<ProductImage[]>([]);

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!form.title.trim() || form.title.length < 2) e.title = 'Title is required (min 2 chars)';
    const price = Number(form.priceCents);
    if (!form.priceCents || price <= 0) e.priceCents = 'Valid price is required';
    const stock = Number(form.stock);
    if (form.stock === '' || Number.isNaN(stock) || stock < 0) e.stock = 'Valid stock is required';
    if (form.sku && !/^[A-Z0-9-]+$/.test(form.sku.toUpperCase())) e.sku = 'SKU: uppercase alphanumeric and hyphens only';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createProduct({
        title: form.title.trim(),
        priceCents: Number(form.priceCents),
        stock: Number(form.stock),
        description: form.description.trim() || undefined,
        category: form.category.trim() || 'General',
        sku: form.sku.trim() || undefined,
        brand: form.brand.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      onBack?.();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <main className="admin-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">PRODUCT MANAGEMENT</p>
          <h1>Create Product</h1>
        </div>
        <button type="button" className="plain" onClick={onBack}>
          ← Back to Products
        </button>
      </header>

      <form className="admin-form-section" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field">
            Title *
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Product name" required />
            {errors.title && <span className="error">{errors.title}</span>}
          </label>

          <label className="form-field">
            Price (cents) *
            <input type="number" min="1" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} placeholder="150000" required />
            {errors.priceCents && <span className="error">{errors.priceCents}</span>}
          </label>

          <label className="form-field">
            Stock *
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" required />
            {errors.stock && <span className="error">{errors.stock}</span>}
          </label>

          <label className="form-field">
            SKU
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="SKU-001" />
            {errors.sku && <span className="error">{errors.sku}</span>}
          </label>

          <label className="form-field">
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">General</option>
              {categories.map((cat: { id: string; name: string }) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Brand
            <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" />
          </label>

          <label className="form-field full-width">
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description" rows={4} />
          </label>

          <label className="form-field">
            Image URL
            <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </label>

          <div className="form-field full-width">
            Product Images
            <ProductMediaManager
              images={mediaImages}
              onImagesChange={setMediaImages}
              maxImages={5}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="plain" onClick={onBack} disabled={isCreating}>Cancel</button>
          <button type="submit" className="primary" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create Product →'}</button>
        </div>
      </form>
    </main>
  );
}
