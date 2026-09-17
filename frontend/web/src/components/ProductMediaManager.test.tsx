import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductMediaManager } from './ProductMediaManager';

vi.mock('../lib/mediaConfig', () => ({
  PRODUCT_MEDIA_CONFIG: {
    maxImages: 5,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
}));

const mockImages = [
  { id: 'img_1', url: 'https://example.com/1.jpg', altText: 'First', sortOrder: 0, isPrimary: true },
  { id: 'img_2', url: 'https://example.com/2.jpg', altText: 'Second', sortOrder: 1, isPrimary: false },
];

describe('ProductMediaManager', () => {
  it('renders preview of selected image', () => {
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={vi.fn()}
      />,
    );
    expect(screen.getByAltText('First')).toBeInTheDocument();
  });

  it('renders thumbnails', () => {
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: /Image/ }).length).toBeGreaterThan(1);
  });

  it('selects thumbnail on click', () => {
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={vi.fn()}
      />,
    );
    const thumbnails = screen.getAllByRole('button', { name: /Image/ });
    fireEvent.click(thumbnails[1]);
  });

  it('calls onImagesChange when deleting an image', () => {
    const onImagesChange = vi.fn();
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={onImagesChange}
      />,
    );
    const deleteButtons = screen.getAllByLabelText('Delete image');
    fireEvent.click(deleteButtons[1]);
    expect(onImagesChange).toHaveBeenCalledWith([mockImages[0]]);
  });

  it('calls onImagesChange when setting primary', () => {
    const onImagesChange = vi.fn();
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={onImagesChange}
      />,
    );
    // Click on img_2 thumbnail to select it, then set as primary
    const thumbnails = screen.getAllByRole('button', { name: /Image/ });
    fireEvent.click(thumbnails[1]);
    const primaryBtn = screen.getByRole('button', { name: '☆ Set as Primary' });
    fireEvent.click(primaryBtn);
    expect(onImagesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'img_2', isPrimary: true }),
      ]),
    );
  });

  it('shows Primary badge for primary image', () => {
    render(
      <ProductMediaManager
        images={mockImages}
        onImagesChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('shows placeholder when no images', () => {
    render(
      <ProductMediaManager
        images={[]}
        onImagesChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No images')).toBeInTheDocument();
  });
});
