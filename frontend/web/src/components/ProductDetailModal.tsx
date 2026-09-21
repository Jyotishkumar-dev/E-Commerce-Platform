import { useEffect, useState, useCallback, type MouseEvent } from 'react';
import type { Product } from '../lib/api';
import { ProductImageGallery } from './ProductImageGallery';
import { FullScreenImageViewer } from './FullScreenImageViewer';
import { formatMoney } from './ProductCard';
import { ReviewSummary, ReviewList, ReviewForm } from './ReviewComponents';
import { useReviewSummary, useProductReviews, useUserReview } from '../hooks/useReviews';
import { useAuth } from '../context/AuthContext';

export function ProductDetailModal({
  product,
  onClose,
  onAdd,
  onToggleWishlist,
  isWishlisted = false,
}: {
  product: Product | null;
  onClose: () => void;
  onAdd: (productId: string, quantity: number) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { summary } = useReviewSummary(product?.id ?? null);
  const { reviews, pagination, refetch: refetchReviews } = useProductReviews(product?.id ?? null, { sort: 'newest', page: reviewsPage, limit: 5 });
  const { review: userReview } = useUserReview(product?.id ?? null);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    setReviewsPage(1);
    setShowReviewForm(false);
  }, [product?.id]);

  if (!product) return null;

  const galleryImages = product
    ? (product.images ?? []).length > 0
      ? product.images.map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText ?? product.title,
        }))
      : product.imageUrl
        ? [{ id: 'main', url: product.imageUrl, altText: product.title }]
        : []
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewerOpen) setViewerOpen(false);
        else onClose();
      }
      if (e.key === 'ArrowLeft') setViewerIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')
        setViewerIndex((i) => Math.min(galleryImages.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewerOpen, galleryImages.length]);

  const isOutOfStock = product.stock <= 0;
  const maxQty = Math.min(product.stock, 10);

  const hasDiscount =
    Boolean(product.compareAtPriceCents) &&
    (product.compareAtPriceCents ?? 0) > product.priceCents;

  const savingsAmount = hasDiscount
    ? (product.compareAtPriceCents ?? 0) - product.priceCents
    : 0;

  const discountPercent = hasDiscount
    ? Math.round((savingsAmount / (product.compareAtPriceCents ?? 1)) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      onAdd(product.id, quantity);
      onClose();
    }
  };

  const handleOpenViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const handleNavigateViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-product-title">
        <div className="product-detail-modal" onClick={(e: MouseEvent) => e.stopPropagation()}>
          <button type="button" className="product-detail-close" onClick={onClose} aria-label="Close product details">
            ×
          </button>

          <div className="product-detail-grid">
            {/* Gallery / Image Area */}
            <div className="product-detail-gallery">
              {galleryImages.length > 0 ? (
                <>
                  <div className="gallery-main" onClick={() => handleOpenViewer(viewerIndex)} style={{ cursor: 'zoom-in' }}>
                    {galleryImages[viewerIndex] && (
                      <img
                        src={galleryImages[viewerIndex].url}
                        alt={galleryImages[viewerIndex].altText}
                        className="gallery-main-image"
                      />
                    )}
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="gallery-nav">
                      <button
                        type="button"
                        className="gallery-nav-btn"
                        onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                        disabled={viewerIndex === 0}
                        aria-label="Previous image"
                      >
                        ← Prev
                      </button>
                      <span className="gallery-counter">
                        {viewerIndex + 1} / {galleryImages.length}
                      </span>
                      <button
                        type="button"
                        className="gallery-nav-btn"
                        onClick={() => setViewerIndex((i) => Math.min(galleryImages.length - 1, i + 1))}
                        disabled={viewerIndex === galleryImages.length - 1}
                        aria-label="Next image"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                  <div className="gallery-thumbnails" role="tablist" aria-label="Product image thumbnails">
                    {galleryImages.map((img, index) => (
                      <button
                        key={img.id}
                        type="button"
                        role="tab"
                        aria-selected={index === viewerIndex}
                        aria-label={`View image ${index + 1}: ${img.altText}`}
                        className={`gallery-thumbnail ${index === viewerIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerIndex(index);
                        }}
                      >
                        <img src={img.url} alt="" className="gallery-thumb-image" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="gallery-viewer-btn"
                    onClick={() => handleOpenViewer(viewerIndex)}
                    aria-label="Open full screen image viewer"
                  >
                    🔍
                  </button>
                </>
              ) : (
                <div className="product-detail-placeholder" aria-hidden="true">
                  <span>📦</span>
                </div>
              )}
            </div>

            {/* Product Info Area */}
            <div className="product-detail-info">
              <div className="product-detail-header">
                <span className="product-detail-category">{product.category}</span>
                {product.brand && <span className="product-detail-brand">by {product.brand}</span>}
              </div>

              <h2 id="modal-product-title" className="product-detail-title">
                {product.title}
              </h2>

              {product.sku && (
                <p className="product-detail-sku">
                  SKU: <code>{product.sku}</code>
                </p>
              )}

              {/* Price Display */}
              <div className="product-detail-pricing">
                <span className="product-detail-price">{formatMoney(product.priceCents)}</span>
                {hasDiscount && (
                  <>
                    <span className="product-detail-compare-price">
                      {formatMoney(product.compareAtPriceCents!)}
                    </span>
                    <span className="product-detail-discount-tag">
                      Save {formatMoney(savingsAmount)} ({discountPercent}% OFF)
                    </span>
                  </>
                )}
              </div>

              {/* Stock status */}
              <div className="product-detail-stock">
                {isOutOfStock ? (
                  <span className="stock-pill stock-pill-out">● Currently Sold Out</span>
                ) : product.stock <= 5 ? (
                  <span className="stock-pill stock-pill-low">
                    ● Limited Stock: Only {product.stock} units remaining
                  </span>
                ) : (
                  <span className="stock-pill stock-pill-in">● In Stock & Ready to Ship</span>
                )}
              </div>

              {/* Description */}
              <div className="product-detail-desc">
                <p>{product.description || 'Crafted with premium materials for discerning individuals who appreciate quiet luxury and enduring quality.'}</p>
              </div>

              {/* Quantity Selector & Add to Bag */}
              {!isOutOfStock && (
                <div className="product-detail-actions">
                  <div className="qty-selector" aria-label="Quantity selector">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span aria-live="polite">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="primary product-detail-add-btn"
                    onClick={handleAddToCart}
                  >
                    Add {quantity > 1 ? `${quantity} items` : 'to Bag'} · {formatMoney(product.priceCents * quantity)}
                  </button>
                </div>
              )}

              {onToggleWishlist && (
                <button
                  type="button"
                  className={`product-detail-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                  onClick={() => onToggleWishlist(product.id)}
                >
                  {isWishlisted ? '♥ Saved to Wishlist' : '♡ Save to Wishlist'}
                </button>
              )}

              {/* Trust Assurances */}
              <div className="product-detail-perks">
                <div className="perk-item">
                  <span>🚚</span>
                  <div>
                    <strong>Free Express Delivery</strong>
                    <small>Delivered in 2–4 business days across Indian metros</small>
                  </div>
                </div>
                <div className="perk-item">
                  <span>🛡️</span>
                  <div>
                    <strong>10-Day Easy Returns</strong>
                    <small>Hassle-free doorstep pickup & quick refund</small>
                  </div>
                </div>
                <div className="perk-item">
                  <span>✨</span>
                  <div>
                    <strong>100% Genuine Authenticated</strong>
                    <small>Directly sourced from authorized creators</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section (below modal) */}
      {product.id && (
        <div className="product-detail-reviews-section">
          <ReviewSummary summary={summary ?? null} productTitle={product.title} />

          <div className="reviews-header">
            <h3>Customer Reviews</h3>
            {user && (
              <button
                type="button"
                className="primary"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? 'Cancel' : userReview ? 'Edit Your Review' : 'Write a Review'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <ReviewForm
              productId={product.id}
              initialReview={userReview ? { id: userReview.id, rating: userReview.rating, title: userReview.title, body: userReview.body } : null}
              onSuccess={() => {
                setShowReviewForm(false);
                refetchReviews();
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          )}

          <ReviewList
            reviews={reviews}
            currentUserId={user?.id ?? null}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="reviews-pagination">
              <button
                type="button"
                className="plain"
                onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                disabled={reviewsPage === 1}
              >
                ← Previous
              </button>
              <span>Page {reviewsPage} of {pagination.totalPages}</span>
              <button
                type="button"
                className="plain"
                onClick={() => setReviewsPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={reviewsPage === pagination.totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {viewerOpen && (
        <FullScreenImageViewer
          images={galleryImages}
          currentIndex={viewerIndex}
          onClose={handleCloseViewer}
          onNavigate={handleNavigateViewer}
        />
      )}
    </>
  );
}
