import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewSummary, ReviewCard, ReviewList } from '../components/ReviewComponents';

vi.mock('../hooks/useReviews', () => ({
  useReviewSummary: () => ({ summary: null, isLoading: false }),
  useProductReviews: () => ({ reviews: [], pagination: {}, isLoading: false }),
  useUserReview: () => ({ review: null, isLoading: false }),
  useCreateReview: () => ({ createReview: vi.fn(), isCreating: false }),
  useUpdateReview: () => ({ updateReview: vi.fn(), isUpdating: false }),
  useDeleteReview: () => ({ deleteReview: vi.fn(), isDeleting: false }),
}));

vi.mock('../lib/api', () => ({
  useAuth: () => ({ user: { id: 'usr_1', name: 'Test' } }),
}));

const mockSummary = {
  averageRating: 4.5,
  totalReviews: 20,
  ratingDistribution: { 1: 0, 2: 1, 3: 3, 4: 5, 5: 11 },
};

const mockReviews = [
  {
    id: 'rev_1',
    rating: 5,
    title: 'Great product',
    body: 'This is amazing, highly recommend!',
    isVerifiedPurchase: true,
    createdAt: '2024-06-15T10:00:00.000Z',
    user: { id: 'usr_1', name: 'John' },
  },
  {
    id: 'rev_2',
    rating: 3,
    title: 'Average',
    body: 'It is okay, nothing special about it.',
    isVerifiedPurchase: false,
    createdAt: '2024-06-10T10:00:00.000Z',
    user: { id: 'usr_2', name: 'Jane' },
  },
];

describe('ReviewComponents', () => {
  describe('ReviewSummary', () => {
    it('renders empty state when no reviews', () => {
      const { container } = render(<ReviewSummary summary={null} />);
      expect(container.textContent).toContain('No reviews yet');
    });

    it('renders summary data', () => {
      const { container } = render(<ReviewSummary summary={mockSummary} />);
      expect(container.textContent).toContain('4.5');
      expect(container.textContent).toContain('20 Reviews');
    });
  });

  describe('ReviewCard', () => {
    it('renders review data', () => {
      const { container } = render(
        <ReviewCard review={mockReviews[0]} currentUserId="usr_1" />
      );
      expect(container.textContent).toContain('John');
      expect(container.textContent).toContain('Great product');
      expect(container.textContent).toContain('Verified purchase');
    });

    it('shows anonymous when no user name', () => {
      const { container } = render(
        <ReviewCard review={{ ...mockReviews[0], user: { id: 'usr_3', name: null } }} currentUserId="usr_1" />
      );
      expect(container.textContent).toContain('Anonymous');
    });

    it('shows edit/delete buttons for owner', () => {
      const { container } = render(
        <ReviewCard review={mockReviews[0]} currentUserId="usr_1" onEdit={vi.fn()} onDelete={vi.fn()} />
      );
      expect(container.textContent).toContain('Edit');
      expect(container.textContent).toContain('Delete');
    });

    it('does not show edit/delete for non-owner', () => {
      const { container } = render(
        <ReviewCard review={mockReviews[0]} currentUserId="usr_999" onEdit={vi.fn()} onDelete={vi.fn()} />
      );
      expect(container.textContent).not.toContain('Edit');
      expect(container.textContent).not.toContain('Delete');
    });
  });

  describe('ReviewList', () => {
    it('renders empty state', () => {
      const { container } = render(<ReviewList reviews={[]} />);
      expect(container.textContent).toContain('No reviews yet');
    });

    it('renders list of reviews', () => {
      const { container } = render(<ReviewList reviews={mockReviews} />);
      expect(container.textContent).toContain('Great product');
      expect(container.textContent).toContain('Average');
    });
  });
});
