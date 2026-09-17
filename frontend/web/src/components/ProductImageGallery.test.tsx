import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImageGallery } from './ProductImageGallery';

const mockImages = [
  { id: 'img_1', url: 'https://example.com/1.jpg', altText: 'First', sortOrder: 0, isPrimary: true },
  { id: 'img_2', url: 'https://example.com/2.jpg', altText: 'Second', sortOrder: 1, isPrimary: false },
];

describe('ProductImageGallery', () => {
  it('renders with no images as placeholder', () => {
    render(<ProductImageGallery images={[]} />);
    expect(screen.getByText('No images')).toBeInTheDocument();
  });

  it('renders with fallback URL', () => {
    render(<ProductImageGallery images={[]} fallbackUrl="https://example.com/fallback.jpg" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders main image and thumbnails', () => {
    render(<ProductImageGallery images={mockImages} />);
    expect(screen.getByAltText('First')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').length).toBe(2);
  });

  it('calls onImageClick when main image clicked', () => {
    const onImageClick = vi.fn();
    render(<ProductImageGallery images={mockImages} onImageClick={onImageClick} />);
    fireEvent.click(screen.getByAltText('First'));
    expect(onImageClick).toHaveBeenCalledWith(mockImages[0]);
  });

  it('switches active thumbnail on click', () => {
    render(<ProductImageGallery images={mockImages} />);
    const thumbnails = screen.getAllByRole('tab');
    fireEvent.click(thumbnails[1]);
    expect(thumbnails[1]).toHaveAttribute('aria-selected', 'true');
    expect(thumbnails[0]).toHaveAttribute('aria-selected', 'false');
  });
});
