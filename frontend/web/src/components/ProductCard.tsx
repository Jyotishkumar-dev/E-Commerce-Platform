import type { MouseEvent } from 'react';
import type { Product } from '../lib/api';

export const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export function ProductCard({
  product,
  onSelect,
  onAdd,
  onToggleWishlist,
  isWishlisted = false,
}: {
  product: Product;
  onSelect: (product: Product) => void;
  onAdd: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}) {
  const hasDiscount =
    Boolean(product.compareAtPriceCents) &&
    (product.compareAtPriceCents ?? 0) > product.priceCents;

  const discountPercent = hasDiscount
    ? Math.round(
        (((product.compareAtPriceCents ?? 0) - product.priceCents) /
          (product.compareAtPriceCents ?? 1)) *
          100,
      )
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock) {
      onAdd(product.id);
    }
  };

  const handleWishlist = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist?.(product.id);
  };

  return (
    <article
      className="product-card"
      onClick={() => onSelect(product)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      aria-label={`View details for ${product.title}`}
    >
      <div className="product-card-image-wrap">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="product-card-image"
            loading="lazy"
          />
        ) : (
          <div className="product-card-placeholder" aria-hidden="true">
            <span>📦</span>
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="product-card-badges">
          {isOutOfStock ? (
            <span className="stock-badge stock-badge-out">Sold Out</span>
          ) : isLowStock ? (
            <span className="stock-badge stock-badge-low">Only {product.stock} left</span>
          ) : null}

          {hasDiscount && (
            <span className="stock-badge stock-badge-discount">{discountPercent}% OFF</span>
          )}
        </div>

        {/* Wishlist Button */}
        {onToggleWishlist && (
          <button
            type="button"
            className={`product-card-wishlist ${isWishlisted ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          >
            {isWishlisted ? '♥' : '♡'}
          </button>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span className="product-card-brand">{product.brand || product.category}</span>
          {product.sku && <span className="product-card-sku">{product.sku}</span>}
        </div>

        <h3 className="product-card-title">{product.title}</h3>

        <div className="product-card-pricing">
          <span className="product-card-price">{formatMoney(product.priceCents)}</span>
          {hasDiscount && (
            <span className="product-card-compare-price">
              {formatMoney(product.compareAtPriceCents!)}
            </span>
          )}
        </div>

        <button
          type="button"
          className="product-card-add-btn"
          onClick={handleAdd}
          disabled={isOutOfStock}
          aria-label={`Add ${product.title} to bag`}
        >
          {isOutOfStock ? 'Sold Out' : 'Add to Bag'}
        </button>
      </div>
    </article>
  );
}
