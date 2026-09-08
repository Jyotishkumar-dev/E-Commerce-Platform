import type { CartItem } from '../lib/api';
import { formatMoney } from './ProductCard';

export function CartPage({
  items,
  itemCount,
  subtotalCents,
  hasUnavailableItems,
  onUpdateQuantity,
  onRemoveItem,
  onMoveToWishlist,
  onContinueShopping,
  onCheckout,
}: {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  hasUnavailableItems: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onMoveToWishlist: (productId: string) => void;
  onContinueShopping: () => void;
  onCheckout: () => void;
}) {
  if (items.length === 0) {
    return (
      <main className="cart-page-empty">
        <div className="cart-empty-container">
          <span className="cart-empty-icon" aria-hidden="true">🛍️</span>
          <p className="eyebrow">YOUR SHOPPING BAG</p>
          <h1>Your cart is empty.</h1>
          <p className="cart-empty-subtext">
            Discover something you'll love from our curated selection of essentials.
          </p>
          <div className="cart-empty-actions">
            <button
              type="button"
              className="primary cart-empty-btn"
              onClick={onContinueShopping}
            >
              Explore Collection →
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      {/* Breadcrumb & Heading */}
      <div className="cart-page-heading">
        <nav className="cart-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onContinueShopping} className="breadcrumb-link">
            Shop
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Shopping Bag</span>
        </nav>
        <div className="cart-title-row">
          <h1>Shopping Bag</h1>
          <span className="cart-badge-count">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {hasUnavailableItems && (
        <div className="cart-warning-banner" role="alert">
          <strong>Notice:</strong> Some items in your bag are out of stock or unavailable. Please remove them before proceeding to checkout.
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="cart-grid">
        {/* Items Column */}
        <section className="cart-items-section" aria-label="Cart items">
          <div className="cart-items-header">
            <span>Product</span>
            <span>Quantity</span>
            <span>Total</span>
          </div>

          <div className="cart-items-wrapper">
            {items.map((item) => {
              const isOutOfStock = item.product.stock <= 0 || item.isOutOfStock;
              const isUnavailable = !item.product.isActive || isOutOfStock;
              const maxStock = Math.min(item.product.stock, 20);

              return (
                <article className="cart-row-item" key={item.id || item.product.id}>
                  {/* Thumbnail */}
                  <div className="cart-row-image-wrap">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        className="cart-row-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="cart-row-placeholder" aria-hidden="true">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="cart-row-details">
                    <span className="cart-row-category">
                      {item.product.brand || item.product.category}
                    </span>
                    <h3 className="cart-row-title">{item.product.title}</h3>
                    {item.product.sku && (
                      <span className="cart-row-sku">SKU: {item.product.sku}</span>
                    )}

                    <div className="cart-row-unit-price">
                      {formatMoney(item.product.priceCents)} each
                    </div>

                    {/* Stock Alert */}
                    {isOutOfStock ? (
                      <span className="stock-pill stock-pill-out">● Sold Out</span>
                    ) : !item.product.isActive ? (
                      <span className="stock-pill stock-pill-out">● Unavailable</span>
                    ) : item.product.stock <= 5 ? (
                      <span className="stock-pill stock-pill-low">
                        ● Only {item.product.stock} units remaining
                      </span>
                    ) : null}

                    {/* Action buttons */}
                    <div className="cart-row-actions">
                      <button
                        type="button"
                        className="cart-link-btn"
                        onClick={() => onMoveToWishlist(item.product.id)}
                        aria-label={`Save ${item.product.title} to wishlist`}
                      >
                        ♡ Save for Later
                      </button>
                      <span className="action-divider">|</span>
                      <button
                        type="button"
                        className="cart-link-btn text-danger"
                        onClick={() => onRemoveItem(item.product.id)}
                        aria-label={`Remove ${item.product.title} from bag`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="cart-row-qty">
                    <div className="qty-control-box">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.product.title}`}
                      >
                        −
                      </button>
                      <span className="qty-number" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={isUnavailable || item.quantity >= maxStock}
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.product.title}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="cart-row-total">
                    <strong>
                      {formatMoney(
                        item.lineTotalCents ?? item.product.priceCents * item.quantity,
                      )}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="cart-bottom-actions">
            <button
              type="button"
              className="plain cart-back-btn"
              onClick={onContinueShopping}
            >
              ← Continue Shopping
            </button>
          </div>
        </section>

        {/* Order Summary Sidebar */}
        <aside className="cart-summary-sidebar" aria-label="Order summary">
          <div className="cart-summary-card">
            <h2>Order Summary</h2>

            <div className="summary-line">
              <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span>{formatMoney(subtotalCents)}</span>
            </div>

            <div className="summary-line">
              <span>Express Metro Shipping</span>
              <span className="text-success">FREE</span>
            </div>

            <div className="summary-line">
              <span>Estimated Taxes</span>
              <span>Included</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-total-row">
              <strong>Total (INR)</strong>
              <strong className="summary-total-price">{formatMoney(subtotalCents)}</strong>
            </div>

            <button
              type="button"
              className="primary full cart-proceed-btn"
              disabled={hasUnavailableItems || items.length === 0}
              onClick={onCheckout}
            >
              Proceed to Checkout →
            </button>

            {/* Assurances */}
            <div className="summary-perks">
              <div className="summary-perk-item">
                <span>🚚</span>
                <div>
                  <strong>Free Express Shipping</strong>
                  <small>Delivered within 2–4 business days</small>
                </div>
              </div>
              <div className="summary-perk-item">
                <span>🛡️</span>
                <div>
                  <strong>10-Day Doorstep Returns</strong>
                  <small>No questions asked return policy</small>
                </div>
              </div>
              <div className="summary-perk-item">
                <span>✨</span>
                <div>
                  <strong>100% Genuine Guaranteed</strong>
                  <small>Direct authentic brand warranty</small>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
