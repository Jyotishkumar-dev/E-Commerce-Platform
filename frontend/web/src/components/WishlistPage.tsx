import type { WishlistItem } from '../lib/api';
import { formatMoney } from './ProductCard';

export function WishlistPage({
  items,
  onMoveToCart,
  onRemoveFromWishlist,
  onContinueShopping,
}: {
  items: WishlistItem[];
  onMoveToCart: (productId: string) => void;
  onRemoveFromWishlist: (productId: string) => void;
  onContinueShopping: () => void;
}) {
  if (items.length === 0) {
    return (
      <main className="wishlist-page-empty">
        <div className="wishlist-empty-container">
          <span className="wishlist-empty-icon" aria-hidden="true">♡</span>
          <p className="eyebrow">YOUR WISHLIST</p>
          <h1>Nothing saved yet.</h1>
          <p className="wishlist-empty-subtext">
            Save products you want to come back to while exploring our catalog.
          </p>
          <div className="wishlist-empty-actions">
            <button
              type="button"
              className="primary wishlist-empty-btn"
              onClick={onContinueShopping}
            >
              Explore Products →
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wishlist-page">
      <div className="wishlist-page-heading">
        <nav className="cart-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onContinueShopping} className="breadcrumb-link">
            Shop
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Wishlist</span>
        </nav>
        <div className="wishlist-title-row">
          <h1>Saved Items</h1>
          <span className="wishlist-badge-count">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      <div className="wishlist-grid">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;

          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;
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

          return (
            <article className="wishlist-card" key={item.id || item.productId}>
              {/* Product Image */}
              <div className="wishlist-card-image-wrap">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="wishlist-card-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="wishlist-card-placeholder" aria-hidden="true">
                    📦
                  </div>
                )}

                {/* Badges */}
                <div className="wishlist-card-badges">
                  {isOutOfStock ? (
                    <span className="stock-badge stock-badge-out">Sold Out</span>
                  ) : isLowStock ? (
                    <span className="stock-badge stock-badge-low">Only {product.stock} left</span>
                  ) : null}

                  {hasDiscount && (
                    <span className="stock-badge stock-badge-discount">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  className="wishlist-card-remove"
                  onClick={() => onRemoveFromWishlist(product.id || item.productId)}
                  aria-label={`Remove ${product.title} from wishlist`}
                >
                  ×
                </button>
              </div>

              {/* Product Info */}
              <div className="wishlist-card-body">
                <span className="wishlist-card-category">
                  {product.brand || product.category}
                </span>
                <h3 className="wishlist-card-title">{product.title}</h3>

                <div className="wishlist-card-pricing">
                  <span className="wishlist-card-price">{formatMoney(product.priceCents)}</span>
                  {hasDiscount && (
                    <span className="wishlist-card-compare-price">
                      {formatMoney(product.compareAtPriceCents!)}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="wishlist-card-actions">
                  <button
                    type="button"
                    className="primary full wishlist-card-add-btn"
                    disabled={isOutOfStock || !product.isActive}
                    onClick={() => onMoveToCart(product.id || item.productId)}
                    aria-label={`Move ${product.title} to shopping bag`}
                  >
                    {isOutOfStock ? 'Sold Out' : 'Move to Bag'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
