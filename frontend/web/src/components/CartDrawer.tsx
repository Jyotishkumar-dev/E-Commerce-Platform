import { useEffect, type MouseEvent } from 'react';
import type { CartItem } from '../lib/api';
import { formatMoney } from './ProductCard';

export function CartDrawer({
  isOpen,
  items,
  itemCount,
  subtotalCents,
  hasUnavailableItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onMoveToWishlist,
  onViewCart,
  onCheckout,
}: {
  isOpen: boolean;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  hasUnavailableItems: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onMoveToWishlist: (productId: string) => void;
  onViewCart: () => void;
  onCheckout: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <aside
        className="drawer-panel"
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <header className="drawer-header">
          <div>
            <h2 id="cart-drawer-title">Your Bag</h2>
            <span className="drawer-count-badge">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close shopping bag"
          >
            ×
          </button>
        </header>

        {/* Notice for unavailable items */}
        {hasUnavailableItems && (
          <div className="drawer-warning-bar" role="alert">
            <span>Some items are no longer in stock. Please remove them before checkout.</span>
          </div>
        )}

        {/* Drawer Body / Items List */}
        <div className="drawer-body">
          {items.length > 0 ? (
            <div className="drawer-items-list">
              {items.map((item) => {
                const isOutOfStock = item.product.stock <= 0 || item.isOutOfStock;
                const isUnavailable = !item.product.isActive || isOutOfStock;
                const maxStock = Math.min(item.product.stock, 20);

                return (
                  <article className="drawer-item" key={item.id || item.product.id}>
                    {/* Thumbnail */}
                    <div className="drawer-item-image-wrap">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          className="drawer-item-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="drawer-item-placeholder" aria-hidden="true">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="drawer-item-details">
                      <div className="drawer-item-top">
                        <span className="drawer-item-category">
                          {item.product.brand || item.product.category}
                        </span>
                        <h3 className="drawer-item-title">{item.product.title}</h3>
                      </div>

                      {/* Stock Warnings */}
                      {isOutOfStock ? (
                        <span className="stock-pill stock-pill-out">● Sold Out</span>
                      ) : !item.product.isActive ? (
                        <span className="stock-pill stock-pill-out">● Unavailable</span>
                      ) : item.product.stock <= 5 ? (
                        <span className="stock-pill stock-pill-low">
                          ● Only {item.product.stock} left
                        </span>
                      ) : null}

                      {/* Price & Quantity Row */}
                      <div className="drawer-item-actions">
                        <div className="drawer-item-qty-wrap">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.product.title}`}
                          >
                            −
                          </button>
                          <span className="qty-value" aria-live="polite">
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

                        <span className="drawer-item-price">
                          {formatMoney(
                            (item.lineTotalCents ?? item.product.priceCents * item.quantity),
                          )}
                        </span>
                      </div>

                      {/* Item Sub-actions */}
                      <div className="drawer-item-subactions">
                        <button
                          type="button"
                          className="text-action-btn"
                          onClick={() => onMoveToWishlist(item.product.id)}
                          aria-label={`Move ${item.product.title} to wishlist`}
                        >
                          Save for later
                        </button>
                        <span className="action-divider">·</span>
                        <button
                          type="button"
                          className="text-action-btn text-danger"
                          onClick={() => onRemoveItem(item.product.id)}
                          aria-label={`Remove ${item.product.title} from bag`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty Bag State (Step 29) */
            <div className="drawer-empty-state">
              <div className="empty-state-icon">🛍️</div>
              <h3>Your cart is empty.</h3>
              <p>Discover something you'll love from our curated collection.</p>
              <button
                type="button"
                className="primary drawer-continue-btn"
                onClick={onClose}
              >
                Continue Shopping →
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <footer className="drawer-footer">
            <div className="drawer-subtotal-row">
              <span>Subtotal</span>
              <strong className="drawer-subtotal-amount">
                {formatMoney(subtotalCents)}
              </strong>
            </div>

            <p className="drawer-delivery-note">
              Complimentary express delivery & taxes included.
            </p>

            <button
              type="button"
              className="primary full drawer-checkout-btn"
              disabled={hasUnavailableItems || items.length === 0}
              onClick={onCheckout}
            >
              Proceed to Checkout →
            </button>

            <div className="drawer-footer-links">
              <button
                type="button"
                className="secondary full drawer-view-cart-btn"
                onClick={() => {
                  onClose();
                  onViewCart();
                }}
              >
                View Full Bag
              </button>
              <button
                type="button"
                className="plain drawer-continue-link"
                onClick={onClose}
              >
                Continue Shopping
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
