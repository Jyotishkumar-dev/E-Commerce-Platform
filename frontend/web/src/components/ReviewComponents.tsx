import { formatMoney } from '../components/ProductCard';

interface RatingBarProps {
  rating: 1 | 2 | 3 | 4 | 5;
  percentage: number;
  count: number;
  maxCount: number;
}

function RatingBar({ rating, percentage, count, maxCount }: RatingBarProps) {
  return (
    <div className="rating-bar-row" role="group" aria-label={`${rating} star ratings`}>
      <span className="rating-label">{rating}★</span>
      <div className="rating-bar-container" aria-hidden="true">
        <div
          className="rating-bar-fill"
          style={{ width: maxCount > 0 ? `${percentage}%` : '0%' }}
        />
      </div>
      <span className="rating-count">{count}</span>
    </div>
  );
}

interface ReviewSummaryProps {
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  } | null;
  productTitle?: string;
}

export function ReviewSummary({ summary, productTitle }: ReviewSummaryProps) {
  if (!summary || summary.totalReviews === 0) {
    return (
      <div className="review-summary-empty">
        <p>No reviews yet. Be the first to review{f}!</p>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(summary.ratingDistribution), 1);
  const fullStars = Math.floor(summary.averageRating);
  const hasHalfStar = summary.averageRating % 1 >= 0.5;

  return (
    <div className="review-summary">
      <div className="review-summary-header">
        <div className="review-score">
          <span className="average-rating">{summary.averageRating.toFixed(1)}</span>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`star ${star <= fullStars ? 'filled' : star === fullStars + 1 && hasHalfStar ? 'half' : ''}`}>
                ★
              </span>
            ))}
          </div>
          <span className="review-count">{summary.totalReviews} {summary.totalReviews === 1 ? 'Review' : 'Reviews'}</span>
        </div>
        <div className="rating-bars" role="img" aria-label="Rating distribution">
          {[5, 4, 3, 2, 1].map((rating) => (
            <RatingBar
              key={rating}
              rating={rating}
              percentage={summary.ratingDistribution[rating] / Math.max(...Object.values(summary.ratingDistribution), 1) * 100}
              count={summary.ratingDistribution[rating]}
              maxCount={Math.max(...Object.values(summary.ratingDistribution), 1)}
            />
          ))}
        </div>
      </div>
    );
}

interface ReviewCardProps {
  review: {
    id: string;
    rating: 1 | 2 | 3 | 4 | 5;
    title: string | null;
    body: string;
    isVerifiedPurchase: boolean;
    createdAt: string;
    user: { id: string; name: string | null };
  };
  currentUserId?: string | null;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewCard({ review, currentUserId, onEdit, onDelete }: ReviewCardProps) {
  const isOwner = currentUserId && review.user.id === currentUserId;
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="review-card">
      <div className="review-header">
        <div className="reviewer-info">
          <span className="reviewer-name">{review.user.name || 'Anonymous'}</span>
          <time className="review-date" dateTime={review.createdAt}>{date}</time>
        </div>
        <div className="review-rating" aria-label={`Rated ${review.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`star ${star <= review.rating ? 'filled' : ''}`}>★</span>
          ))}
        </div>
      </div>

      {review.title && <h4 className="review-title">{review.title}</h4>}
      <p className="review-body">{review.body}</p>

      {review.isVerifiedPurchase && (
        <span className="verified-purchase-badge" aria-label="Verified Purchase">
          ✓ Verified Purchase
        </span>
      )}

      {isOwner && (
        <div className="review-actions">
          <button type="button" className="plain" onClick={() => onEdit?.(review)}>
            Edit
          </button>
          <button type="button" className="plain danger" onClick={() => onDelete?.(review.id)}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

interface ReviewListProps {
  reviews: Array<{
    id: string;
    rating: 1 | 2 | 3 | 4 | 5;
    title: string | null;
    body: string;
    isVerifiedPurchase: boolean;
    createdAt: string;
    user: { id: string; name: string | null };
  }>;
  currentUserId?: string | null;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewList({ reviews, currentUserId, onEdit, onDelete }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="review-empty-state">
        <p>No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="review-list" role="list" aria-label="Customer reviews">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} currentUserId={currentUserId} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialReview?: {
    id: string;
    rating: number;
    title: string | null;
    body: string;
  } | null;
}

export function ReviewForm({ productId, onSuccess, onCancel, initialReview }: ReviewFormProps) {
  const isEditing = Boolean(initialReview);
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [title, setTitle] = useState(initialReview?.title || '');
  const [body, setBody] = useState(initialReview?.body || '');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createReview, isCreating } = useCreateReview();
  const { updateReview, isUpdating } = useUpdateReview();
  const { deleteReview, isDeleting } = useDeleteReview();

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (rating === 0) e.rating = 'Please select a rating';
    if (body.trim().length < 10) e.body = 'Review must be at least 10 characters';
    if (body.trim().length > 2000) e.body = 'Review must be 2000 characters or less';
    if (title && title.length > 100) e.title = 'Title must be 100 characters or less';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (isEditing && initialReview) {
        await updateReview({ reviewId: initialReview.id, rating, title: title.trim() || undefined, body: body.trim() });
      } else {
        await createReview({ productId, rating, title: title.trim() || undefined, body: body.trim() });
      }
      onSuccess?.();
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialReview) return;
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteReview(initialReview.id);
      onCancel?.();
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>{isEditing ? 'Edit Your Review' : 'Write a Review'}</h3>

      <div className="form-group">
        <label>Your Rating <span className="required">*</span></label>
        <div className="star-rating-input" role="radiogroup" aria-label="Select rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-input ${rating >= star ? 'filled' : ''}`}
              onClick={() => setRating(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <span className="error">{errors.rating}</span>}
      </div>

      <div className="form-group">
        <label>Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Summarize your experience"
        />
        {errors.title && <span className="error">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label>Your Review <span className="required">*</span></label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Share your experience with this product..."
        />
        <div className="textarea-hint">
          {body.length}/2000 characters
        </div>
        {errors.body && <span className="error">{errors.body}</span>}
      </div>

      <div className="form-actions">
        {isEditing && (
          <button
            type="button"
            className="plain danger"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
          >
            Delete Review
          </button>
        )}
        <div className="actions-right">
          <button type="button" className="plain" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={isSubmitting || isCreating || isUpdating}>
            {isSubmitting ? 'Submitting…' : isEditing ? 'Save Changes' : 'Submit Review'}
          </button>
        </div>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { useCreateReview, useUpdateReview, useDeleteReview } from '../hooks/useReviews';