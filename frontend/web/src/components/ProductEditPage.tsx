import { useState, useCallback, useEffect } from 'react';
import { api, messageOf, type Product } from '../lib/api';
import { useAdminProductUpdate } from '../hooks/useAdmin';
import { useAdminProductStock } from '../hooks/useAdmin';
import { ProductMediaManager } from './ProductMediaManager';
import { ImagePlaceholder } from './ImagePlaceholder';

interface ProductEditPageProps {
  productId: string;
  onBack: () => void;
}

export function ProductEditPage({ productId, onBack }: ProductEditPageProps) {
  const { updateProduct, isUpdating } = useAdminProductUpdate(productId);
  const { updateStock, isUpdating: isUpdatingStock } = useAdminProductStock();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    priceCents: '',
    stock: '',
    description: '',
    sku: '',
    brand: '',
    category: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [mediaImages, setMediaImages] = useState<Array<{
    id: string;
    url: string;
    altText: string;
    sortOrder: number;
    isPrimary: boolean;
  }>>([]);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    let cancelled = false;
    const fetchProduct = async () => {
      setIsLoadingProduct(true);
      setProductError(null);
      try {
        const res = await api.get(`/products/${productId}`);
        const data = res.data?.data?.product as Product;
        if (!cancelled) {
          setProduct(data);
          if (data) {
            setForm({
              title: data.title,
              priceCents: String(data.priceCents),
              stock: String(data.stock),
              description: data.description ?? '',
              sku: data.sku ?? '',
              brand: data.brand ?? '',
              category: data.category,
              isActive: data.isActive ?? true,
            });
            setMediaImages(
              (data.images ?? []).length > 0
                ? data.images.map((img, idx) => ({
                    id: img.id,
                    url: img.url,
                    altText: img.altText ?? `${data.title} image ${idx + 1}`,
                    sortOrder: img.sortOrder,
                    isPrimary: idx === 0,
                  }))
                : data.imageUrl
                  ? [{ id: 'main', url: data.imageUrl, altText: data.title, sortOrder: 0, isPrimary: true }]
                  : [],
            );
          }
        }
      } catch (err) {
        if (!cancelled) setProductError(messageOf(err));
      } finally {
        if (!cancelled) setIsLoadingProduct(false);
      }
    };
    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!form.title.trim() || form.title.length < 2) e.title = 'Title is required (min 2 chars)';
    const price = Number(form.priceCents);
    if (!form.priceCents || price <= 0) e.priceCents = 'Valid price is required';
    const stock = Number(form.stock);
    if (form.stock === '' || Number.isNaN(stock) || stock < 0) e.stock = 'Valid stock is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await updateProduct({
        title: form.title.trim(),
        priceCents: Number(form.priceCents),
        stock: Number(form.stock),
        description: form.description.trim() || undefined,
        category: form.category.trim() || 'General',
        sku: form.sku.trim() || undefined,
        brand: form.brand.trim() || undefined,
        isActive: form.isActive,
      });
      setNoticeType('success');
      setNotice('Product updated successfully.');
    } catch {
      setNoticeType('error');
      setNotice('Failed to update product. Please try again.');
    }
  };

  const handleStockUpdate = async (newStock: number) => {
    try {
      await updateStock({ productId, stock: newStock });
      setForm((prev) => ({ ...prev, stock: String(newStock) }));
      setNoticeType('success');
      setNotice('Stock updated.');
    } catch {
      setNoticeType('error');
      setNotice('Failed to update stock.');
    }
  };

  const handleMediaChange = useCallback(
    (images: Array<{ id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean }>) => {
      setMediaImages(images);
    },
    [],
  );

  const getPrimaryUrl = () => {
    const primary = mediaImages.find((i) => i.isPrimary);
    return primary?.url ?? product?.imageUrl ?? undefined;
  };

  if (isLoadingProduct) {
    return (
      <main className="admin-main">
        <div className="dashboard-loading">
          <div className="spinner" aria-hidden="true" />
          <p>Loading product…</p>
        </div>
      </main>
    );
  }

  if (productError) {
    return (
      <main className="admin-main">
        <div className="dashboard-error" role="alert">
          <p>Failed to load product: {productError}</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!product) return null;

  return (
    <main className="admin-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">PRODUCT MANAGEMENT</p>
          <h1>Edit Product</h1>
        </div>
        <button type="button" className="plain" onClick={onBack}>
          ← Back to Products
        </button>
      </header>

      {notice && (
        <div className={`notice ${noticeType}`} role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Close notification">
            ×
          </button>
        </div>
      )}

      <form className="admin-form-section" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field">
            Title *
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Product name"
              required
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </label>

          <label className="form-field">
            Price (cents) *
            <input
              type="number"
              min="1"
              value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
              placeholder="150000"
              required
            />
            {errors.priceCents && <span className="error">{errors.priceCents}</span>}
          </label>

          <label className="form-field">
            Stock *
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="0"
              required
            />
            {errors.stock && <span className="error">{errors.stock}</span>}
          </label>

          <label className="form-field">
            SKU
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              placeholder="SKU-001"
            />
          </label>

          <label className="form-field">
            Category
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Category"
            />
          </label>

          <label className="form-field">
            Brand
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Brand name"
            />
          </label>

          <label className="form-field full-width">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description"
              rows={4}
            />
          </label>

          <label className="form-field">
            Status
            <select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: '24px' }}>
          <div className="form-field">
            <strong>Quick Stock Update</strong>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="plain"
                onClick={() => handleStockUpdate(Math.max(0, Number(form.stock) - 10))}
                disabled={isUpdatingStock}
              >
                −10
              </button>
              <button
                type="button"
                className="plain"
                onClick={() => handleStockUpdate(0)}
                disabled={isUpdatingStock}
              >
                Set 0
              </button>
              <button
                type="button"
                className="plain"
                onClick={() => handleStockUpdate(Number(form.stock) + 10)}
                disabled={isUpdatingStock}
              >
                +10
              </button>
            </div>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: '24px' }}>
          <div className="form-field full-width">
            <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Product Images</h3>
            <ProductMediaManager
              images={mediaImages}
              onImagesChange={handleMediaChange}
              maxImages={5}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              Primary image: {mediaImages.find((i) => i.isPrimary) ? 'set' : 'not set'} · {mediaImages.length} image(s)
            </p>
          </div>
        </div>

        {getPrimaryUrl() && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Primary preview:</p>
            <img
              src={getPrimaryUrl()}
              alt={`Primary: ${product.title}`}
              style={{ maxWidth: '200px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="plain" onClick={onBack} disabled={isUpdating}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={isUpdating}>
            {isUpdating ? 'Saving…' : 'Save Changes →'}
          </button>
        </div>
      </form>
    </main>
  );
}
